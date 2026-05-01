import axios from "axios";
import { Request, Response } from "express";
import { allowedExtensions, LineTransform } from "../utils/line-transform";

export const m3u8Proxy = async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;
    const queryHeaders = req.query.headers as string;
    const customHeaders = queryHeaders ? JSON.parse(queryHeaders) : {};

    if (!url) return res.status(400).json("url is required");

    const isStaticFiles = allowedExtensions.some(ext => url.endsWith(ext));

    const responseText = await axios.get(url, {
      responseType: 'text',
      headers: customHeaders
    })

    const responseStream = await axios.get(url, {
      responseType: 'stream',
      headers: customHeaders
    });

    const headers = { ...responseStream.headers };
    if (!isStaticFiles) delete headers['content-length'];

    res.cacheControl = { maxAge: headers['cache-control'] };
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Headers"] = "*";
    headers["Access-Control-Allow-Methods"] = "*"
    res.set(headers);

    if (!responseText.data.startsWith("#EXTM3U")) {
      return responseStream.data.pipe(res);
    }

    const transform = new LineTransform(url, queryHeaders);
    responseStream.data.pipe(transform).pipe(res);
  } catch (error: any) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
}