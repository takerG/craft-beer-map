const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const outputDir = path.resolve(__dirname, '..', 'miniprogram', 'assets', 'tabbar');

writeIcon(path.join(outputDir, 'academy.png'), [141, 154, 173, 255]);
writeIcon(path.join(outputDir, 'academy-active.png'), [246, 173, 85, 255]);

function writeIcon(filePath, color) {
  const size = 81;
  const pixels = Buffer.alloc(size * size * 4);

  for (let i = 0; i < size * size; i += 1) {
    pixels[i * 4 + 3] = 0;
  }

  drawRoundedBook(pixels, size, color);
  fs.writeFileSync(filePath, encodePng(size, size, pixels));
}

function drawRoundedBook(pixels, size, color) {
  line(pixels, size, 21, 17, 21, 61, color, 4);
  line(pixels, size, 58, 17, 58, 61, color, 4);
  line(pixels, size, 21, 17, 39, 24, color, 4);
  line(pixels, size, 58, 17, 39, 24, color, 4);
  line(pixels, size, 21, 61, 39, 67, color, 4);
  line(pixels, size, 58, 61, 39, 67, color, 4);
  line(pixels, size, 39, 24, 39, 67, color, 3);
  line(pixels, size, 27, 30, 34, 33, color, 3);
  line(pixels, size, 27, 42, 34, 45, color, 3);
  line(pixels, size, 45, 33, 52, 30, color, 3);
  line(pixels, size, 45, 45, 52, 42, color, 3);
}

function line(pixels, size, x1, y1, x2, y2, color, width) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= steps; i += 1) {
    const x = Math.round(x1 + ((x2 - x1) * i) / steps);
    const y = Math.round(y1 + ((y2 - y1) * i) / steps);
    dot(pixels, size, x, y, color, width);
  }
}

function dot(pixels, size, x, y, color, width) {
  const radius = Math.floor(width / 2);
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || py < 0 || px >= size || py >= size) continue;
      const offset = (py * size + px) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = color[3];
    }
  }
}

function encodePng(width, height, rgba) {
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    scanlines[y * (width * 4 + 1)] = 0;
    rgba.copy(scanlines, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', Buffer.concat([
      uint32(width),
      uint32(height),
      Buffer.from([8, 6, 0, 0, 0]),
    ])),
    chunk('IDAT', zlib.deflateSync(scanlines)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  return Buffer.concat([
    uint32(data.length),
    typeBuffer,
    data,
    uint32(crc32(Buffer.concat([typeBuffer, data]))),
  ]);
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
