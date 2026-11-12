// Minimal ZIP reader (stored + deflate via DecompressionStream) and writer (stored) — enough for .docx in and out.
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(u8) { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

const concat = (chunks) => { const n = chunks.reduce((a, c) => a + c.length, 0); const out = new Uint8Array(n); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; } return out; };

/** files: [{ name, data: Uint8Array }] → Uint8Array (.zip, no compression) */
export function zipStore(files) {
  const enc = new TextEncoder();
  const chunks = [], central = [];
  let offset = 0;
  for (const f of files) {
    const nameB = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, size, true); lh.setUint32(22, size, true);
    lh.setUint16(26, nameB.length, true); lh.setUint16(28, 0, true);
    chunks.push(new Uint8Array(lh.buffer), nameB, f.data);
    central.push({ nameB, crc, size, offset });
    offset += 30 + nameB.length + size;
  }
  const cdStart = offset;
  for (const c of central) {
    const dv = new DataView(new ArrayBuffer(46));
    dv.setUint32(0, 0x02014b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 20, true); dv.setUint16(8, 0x0800, true); dv.setUint16(10, 0, true);
    dv.setUint16(12, 0, true); dv.setUint16(14, 0x21, true); dv.setUint32(16, c.crc, true); dv.setUint32(20, c.size, true); dv.setUint32(24, c.size, true);
    dv.setUint16(28, c.nameB.length, true); dv.setUint32(42, c.offset, true);
    chunks.push(new Uint8Array(dv.buffer), c.nameB);
    offset += 46 + c.nameB.length;
  }
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, central.length, true); e.setUint16(10, central.length, true); e.setUint32(12, offset - cdStart, true); e.setUint32(16, cdStart, true);
  chunks.push(new Uint8Array(e.buffer));
  return concat(chunks);
}

async function inflateRaw(u8) {
  if (typeof DecompressionStream === 'undefined') throw new Error('Deze browser kan dit bestand niet uitpakken (DecompressionStream ontbreekt). Sla het op als PDF of plak de tekst.');
  const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Returns { names, read(name) → Uint8Array | null } for a .zip/.docx ArrayBuffer. */
export function unzip(arrayBuffer) {
  const u8 = new Uint8Array(arrayBuffer), dv = new DataView(arrayBuffer);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Geen geldig zip/docx-bestand.');
  const count = dv.getUint16(eocd + 10, true), cdOff = dv.getUint32(eocd + 16, true);
  const entries = new Map();
  let p = cdOff;
  const dec = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    entries.set(dec.decode(u8.subarray(p + 46, p + 46 + nlen)), { method, csize, off });
    p += 46 + nlen + xlen + clen;
  }
  return {
    names: [...entries.keys()],
    async read(name) {
      const e = entries.get(name); if (!e) return null;
      const nlen = dv.getUint16(e.off + 26, true), xlen = dv.getUint16(e.off + 28, true);
      const data = u8.subarray(e.off + 30 + nlen + xlen, e.off + 30 + nlen + xlen + e.csize);
      if (e.method === 0) return data;
      if (e.method === 8) return inflateRaw(data);
      throw new Error('Onbekende zip-compressie ' + e.method);
    },
  };
}
