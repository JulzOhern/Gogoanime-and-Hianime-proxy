import { Transform, TransformCallback } from "stream";

export const allowedExtensions = [
  ".ts",
  ".png",
  ".jpg",
  ".webp",
  ".ico",
  ".html",
  ".js",
  ".css",
  ".txt",
];

export class LineTransform extends Transform {
  private buffer: string;
  private url: string;
  private queryHeaders: string;
  private proxyBase: string;

  constructor(url: string, queryHeaders: string, proxyBase = "") {
    super();
    this.buffer = "";
    this.url = url;
    this.queryHeaders = queryHeaders || "";
    // Absolute base like http://localhost:4040/ so HLS players resolve correctly
    this.proxyBase = proxyBase.replace(/\/$/, "");
  }

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback
  ) {
    const data = this.buffer + chunk.toString();
    const lines = data.split(/\r?\n/);
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      this.push(this.processLine(line) + "\n");
    }

    callback();
  }

  _flush(callback: TransformCallback) {
    if (this.buffer) {
      this.push(this.processLine(this.buffer));
    }
    callback();
  }

  private toProxyUrl(targetUrl: string): string {
    const params = new URLSearchParams({ url: targetUrl });
    if (this.queryHeaders) {
      params.set("headers", this.queryHeaders);
    }
    const path = `m3u8-proxy?${params.toString()}`;
    return this.proxyBase ? `${this.proxyBase}/${path}` : path;
  }

  private resolveUrl(path: string): string {
    return new URL(path, this.url).href;
  }

  private processLine(line: string): string {
    if (!line.trim()) {
      return line;
    }

    if (line.startsWith("//")) {
      return this.toProxyUrl(`https:${line}`);
    }

    if (!line.startsWith("#")) {
      return this.toProxyUrl(this.resolveUrl(line));
    }

    if (line.includes('URI="')) {
      return line.replace(/URI="([^"]+)"/g, (_match, value: string) => {
        return `URI="${this.toProxyUrl(this.resolveUrl(value))}"`;
      });
    }

    return line;
  }
}
