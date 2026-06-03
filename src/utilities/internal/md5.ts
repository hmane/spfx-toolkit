const SHIFT_AMOUNTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const TABLE = Array.from({ length: 64 }, (_, i) =>
  Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0
);

const add32 = (a: number, b: number): number => (a + b) >>> 0;
const rotateLeft = (value: number, shift: number): number =>
  ((value << shift) | (value >>> (32 - shift))) >>> 0;

const toUtf8Bytes = (value: string): number[] => {
  const bytes: number[] = [];

  for (let i = 0; i < value.length; i++) {
    let codePoint = value.charCodeAt(i);

    if (codePoint >= 0xd800 && codePoint <= 0xdbff && i + 1 < value.length) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (next - 0xdc00);
        i++;
      }
    }

    if (codePoint < 0x80) {
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      bytes.push(0xc0 | (codePoint >>> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint < 0x10000) {
      bytes.push(
        0xe0 | (codePoint >>> 12),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >>> 18),
        0x80 | ((codePoint >>> 12) & 0x3f),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    }
  }

  return bytes;
};

const wordToHex = (value: number): string => {
  let hex = '';
  for (let i = 0; i < 4; i++) {
    hex += ((value >>> (i * 8)) & 0xff).toString(16).padStart(2, '0');
  }
  return hex;
};

/**
 * Small internal MD5 implementation used only for SharePoint default-photo detection.
 * Avoids loading SharePoint's framework MD5 component, which can pull extra
 * framework externals into form customizer bundles.
 */
export function md5(value: string): string {
  const bytes = toUtf8Bytes(value);
  const bitLength = bytes.length * 8;

  bytes.push(0x80);
  while (bytes.length % 64 !== 56) {
    bytes.push(0);
  }

  for (let i = 0; i < 8; i++) {
    bytes.push(Math.floor(bitLength / Math.pow(2, i * 8)) & 0xff);
  }

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < bytes.length; offset += 64) {
    const words = new Array<number>(16);
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      words[i] =
        (bytes[j] |
          (bytes[j + 1] << 8) |
          (bytes[j + 2] << 16) |
          (bytes[j + 3] << 24)) >>> 0;
    }

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;

      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }

      const nextD = c;
      c = b;
      b = add32(b, rotateLeft(add32(add32(add32(a, f), TABLE[i]), words[g]), SHIFT_AMOUNTS[i]));
      a = d;
      d = nextD;
    }

    a0 = add32(a0, a);
    b0 = add32(b0, b);
    c0 = add32(c0, c);
    d0 = add32(d0, d);
  }

  return wordToHex(a0) + wordToHex(b0) + wordToHex(c0) + wordToHex(d0);
}
