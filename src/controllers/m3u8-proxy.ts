import axios from "axios";
import { Request, Response } from "express";
import { LineTransform } from "../utils/line-transform";
import { findPngWrappedMpegTsOffset } from "../utils/png-unwrap";
import { peekStream } from "../utils/peek-stream";
import { Readable } from "stream";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "*/*",
};

/** Enough to detect tiny PNG wrappers + confirm MPEG-TS sync (5 x 188). */
const SEGMENT_PEEK_BYTES = 8 * 1024;

function getProxyBase(req: Request): string {
  const host = req.get("x-forwarded-host") || req.get("host");
  const proto = (
    req.get("x-forwarded-proto") ||
    req.protocol ||
    "http"
  ).split(",")[0];
  return host ? `${proto}://${host}` : "";
}

function corsHeaders(base: Record<string, any>) {
  const headers = { ...base };
  delete headers["content-encoding"];
  delete headers["content-length"];
  delete headers["transfer-encoding"];
  headers["Access-Control-Allow-Origin"] = "*";
  headers["Access-Control-Allow-Headers"] = "*";
  headers["Access-Control-Allow-Methods"] = "*";
  return headers;
}

export const m3u8Proxy = async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;
    const queryHeaders = req.query.headers as string;

    if (!url) {
      res.status(400).json("url is required");
      return;
    }

    let customHeaders: Record<string, string> = {};
    if (queryHeaders) {
      try {
        customHeaders = JSON.parse(queryHeaders);
      } catch {
        res.status(400).json("headers must be valid JSON");
        return;
      }
    }

    const requestHeaders = { ...DEFAULT_HEADERS, ...customHeaders };
    const mightBePlaylist = /\.m3u8($|\?)/i.test(url);

    if (mightBePlaylist) {
      const response = await axios.get(url, {
        responseType: "text",
        headers: requestHeaders,
        validateStatus: () => true,
        maxRedirects: 5,
      });

      if (response.status >= 400) {
        res.status(response.status).send(`Upstream error: ${response.status}`);
        return;
      }

      const headers = corsHeaders(response.headers);
      const body = String(response.data ?? "");
      res.cacheControl = { maxAge: headers["cache-control"] };
      res.set(headers);

      if (!body.trimStart().startsWith("#EXTM3U")) {
        res.send(body);
        return;
      }

      const transform = new LineTransform(
        url,
        queryHeaders,
        getProxyBase(req)
      );
      Readable.from([body]).pipe(transform).pipe(res);
      return;
    }

    // Segments: stream + small peek (lightweight, still unwraps PNG-wrapped TS)
    const response = await axios.get(url, {
      responseType: "stream",
      headers: requestHeaders,
      validateStatus: () => true,
      maxRedirects: 5,
    });

    if (response.status >= 400) {
      // Drain error body so the socket can be reused
      response.data.resume();
      res.status(response.status).send(`Upstream error: ${response.status}`);
      return;
    }

    const headers = corsHeaders(response.headers);
    const { head, rest } = await peekStream(
      response.data as Readable,
      SEGMENT_PEEK_BYTES
    );

    const tsOffset = findPngWrappedMpegTsOffset(head);
    if (tsOffset >= 0) {
      headers["content-type"] = "video/mp2t";
      res.cacheControl = { maxAge: headers["cache-control"] };
      res.set(headers);
      res.write(head.subarray(tsOffset));
      rest.pipe(res);
      return;
    }

    res.cacheControl = { maxAge: headers["cache-control"] };
    res.set(headers);
    res.write(head);
    rest.pipe(res);
  } catch (error: any) {
    console.log(error.message);
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error");
    }
  }
};
