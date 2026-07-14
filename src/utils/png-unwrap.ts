/**
 * Some CDNs (nekostream, tiktokcdn-style) wrap MPEG-TS in a tiny PNG.
 * Detect that pattern and return the TS payload offset, or -1 if not wrapped.
 */
export function findPngWrappedMpegTsOffset(buffer: Buffer): number {
  // PNG signature
  if (
    buffer.length < 70 ||
    buffer[0] !== 0x89 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x4e ||
    buffer[3] !== 0x47
  ) {
    return -1;
  }

  // Walk PNG chunks until IEND
  let offset = 8;
  let iendEnd = -1;
  while (offset + 8 <= buffer.length) {
    const len = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const chunkTotal = 12 + len; // length + type + data + crc
    if (offset + chunkTotal > buffer.length) break;
    if (type === "IEND") {
      iendEnd = offset + chunkTotal;
      break;
    }
    offset += chunkTotal;
    // Real PNGs with large image data are not wrappers
    if (len > 1024) return -1;
  }

  if (iendEnd < 0) return -1;

  // Find MPEG-TS sync: 0x47 repeated every 188 bytes
  const searchEnd = Math.min(buffer.length, iendEnd + 64 * 1024);
  for (let i = iendEnd; i < searchEnd; i++) {
    if (buffer[i] !== 0x47) continue;
    let ok = true;
    for (let k = 1; k < 5; k++) {
      const pos = i + k * 188;
      if (pos >= buffer.length || buffer[pos] !== 0x47) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }

  return -1;
}

export function unwrapPngIfNeeded(buffer: Buffer): {
  data: Buffer;
  contentType?: string;
} {
  const tsOffset = findPngWrappedMpegTsOffset(buffer);
  if (tsOffset >= 0) {
    return {
      data: buffer.subarray(tsOffset),
      contentType: "video/mp2t",
    };
  }
  return { data: buffer };
}
