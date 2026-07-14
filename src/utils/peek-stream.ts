import { PassThrough, Readable } from "stream";

/**
 * Read up to `maxBytes` from an upstream stream, then return the peeked
 * buffer plus a readable of everything that follows (leftover + rest of upstream).
 * Keeps memory low: only the peek window is buffered.
 */
export async function peekStream(
  upstream: Readable,
  maxBytes: number
): Promise<{ head: Buffer; rest: Readable }> {
  const chunks: Buffer[] = [];
  let total = 0;

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      upstream.pause();
      upstream.off("data", onData);
      upstream.off("end", onEnd);
      upstream.off("error", onError);
      resolve();
    };

    const onData = (chunk: Buffer) => {
      chunks.push(chunk);
      total += chunk.length;
      if (total >= maxBytes) finish();
    };

    const onEnd = () => finish();
    const onError = (err: Error) => {
      if (settled) return;
      settled = true;
      upstream.off("data", onData);
      upstream.off("end", onEnd);
      upstream.off("error", onError);
      reject(err);
    };

    upstream.on("data", onData);
    upstream.once("end", onEnd);
    upstream.once("error", onError);

    // In case data was already buffered while paused
    upstream.resume();
  });

  const combined = Buffer.concat(chunks);
  const head =
    combined.length > maxBytes ? combined.subarray(0, maxBytes) : combined;
  const leftover =
    combined.length > maxBytes ? combined.subarray(maxBytes) : null;

  const rest = new PassThrough();

  if (leftover && leftover.length) {
    rest.write(leftover);
  }

  if (upstream.readableEnded) {
    rest.end();
  } else {
    upstream.pipe(rest);
    upstream.resume();
  }

  return { head, rest };
}
