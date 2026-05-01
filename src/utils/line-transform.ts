import { Transform, TransformCallback } from 'stream';

export const allowedExtensions = ['.ts', '.png', '.jpg', '.webp', '.ico', '.html', '.js', '.css', '.txt'];

export class LineTransform extends Transform {
  private buffer: string;
  private url: string;
  private queryHeaders: string

  constructor(url: string, queryHeaders: string) {
    super();
    this.buffer = '';
    this.url = url;
    this.queryHeaders = queryHeaders;
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback) {
    const data = this.buffer + chunk.toString();
    const lines = data.split(/\r?\n/);
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const modifiedLine = this.processLine(line);
      this.push(modifiedLine + '\n');
    }

    callback();
  }

  _flush(callback: TransformCallback) {
    if (this.buffer) {
      const modifiedLine = this.processLine(this.buffer);
      this.push(modifiedLine);
    }
    callback();
  }

  private processLine(line: string): string {
    const baseUrl = this.url.replace(/[^/]+$/, "");

    if (!line.startsWith("#")) {
      const resolvedUrl = !line.startsWith("https://") ? `${baseUrl}${line}` : line;
      return `m3u8-proxy?url=${encodeURIComponent(resolvedUrl)}&headers=${encodeURIComponent(this.queryHeaders)}`;
    }

    return line.replace(/URI="([^"]+)"/g, (_ /** match */, value) => {
      const resolvedUrl = !value.startsWith("https://") ? `${baseUrl}${value}` : value;
      return `URI="m3u8-proxy?url=${encodeURIComponent(resolvedUrl)}&headers=${encodeURIComponent(this.queryHeaders)}"`;
    });
  }
}
