const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'academy-sites');
const outputPath = path.join(root, 'miniprogram', 'data', 'academy-sites.js');
const coverOutputRoot = path.join(root, 'miniprogram', 'assets', 'academy-covers');

const REQUIRED_META_FIELDS = ['slug', 'title', 'description', 'type', 'difficulty', 'readingTime', 'tags', 'relatedStyles'];
const REQUIRED_PUBLISH_FIELDS = ['publishedAt'];
const VALID_TYPES = new Set(['visual-story', 'comparison', 'simulator', 'map', 'quiz', 'tool']);

function main() {
  const order = readJson(path.join(sourceRoot, 'order.json'));
  fs.mkdirSync(coverOutputRoot, { recursive: true });
  const sites = fs.readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readSite(entry.name))
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)) || a.slug.localeCompare(b.slug));

  validateOrder(order, sites);
  writeData({ order, sites });
}

function readSite(slug) {
  const siteDir = path.join(sourceRoot, slug);
  const meta = readJson(path.join(siteDir, 'meta.json'));
  const publish = readJson(path.join(siteDir, 'publish.json'));
  const content = readJson(path.join(siteDir, 'content.json'));

  REQUIRED_META_FIELDS.forEach((field) => {
    if (!Object.hasOwn(meta, field)) {
      throw new Error(`${slug}/meta.json missing ${field}`);
    }
  });
  REQUIRED_PUBLISH_FIELDS.forEach((field) => {
    if (!Object.hasOwn(publish, field)) {
      throw new Error(`${slug}/publish.json missing ${field}`);
    }
  });
  if (meta.slug !== slug) throw new Error(`${slug}/meta.json slug must match directory name`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publish.publishedAt)) {
    throw new Error(`${slug}/publish.json publishedAt must use YYYY-MM-DD`);
  }
  if (!VALID_TYPES.has(meta.type)) throw new Error(`${slug}/meta.json has unsupported type ${meta.type}`);
  if (!Array.isArray(meta.tags)) throw new Error(`${slug}/meta.json tags must be an array`);
  if (!Array.isArray(meta.relatedStyles)) throw new Error(`${slug}/meta.json relatedStyles must be an array`);
  if (!content.hero || !Array.isArray(content.modules)) {
    throw new Error(`${slug}/content.json must include hero and modules`);
  }
  if (!Array.isArray(content.sections) || content.sections.length < 4) {
    throw new Error(`${slug}/content.json must include at least four article sections`);
  }
  if (!content.experienceAfterSectionId) {
    throw new Error(`${slug}/content.json must include experienceAfterSectionId`);
  }
  const sectionIds = new Set(content.sections.map((section) => section.id));
  if (!sectionIds.has(content.experienceAfterSectionId)) {
    throw new Error(`${slug}/content.json experienceAfterSectionId must match a section id`);
  }
  content.sections.forEach((section, index) => {
    if (!section.id || !section.title || !Array.isArray(section.paragraphs) || section.paragraphs.length < 1) {
      throw new Error(`${slug}/content.json sections[${index}] must include id, title, and paragraphs`);
    }
  });

  return {
    ...meta,
    publishedAt: publish.publishedAt,
    updatedAt: publish.updatedAt || publish.publishedAt,
    coverImage: writeCoverImage(slug, meta),
    hero: content.hero,
    sections: content.sections,
    experienceAfterSectionId: content.experienceAfterSectionId,
    modules: content.modules,
  };
}

function validateOrder(order, sites) {
  const siteSlugs = new Set(sites.map((site) => site.slug));
  const refs = [
    ...(order.featured || []),
    ...(order.tracks || []).flatMap((track) => track.items || []),
  ];

  refs.forEach((slug) => {
    if (!siteSlugs.has(slug)) throw new Error(`academy-sites/order.json references unknown site ${slug}`);
  });
}

function writeData(payload) {
  const source = `// Generated from academy-sites/. Run npm run build:academy after content changes.\nexport const academyOrder = ${JSON.stringify(payload.order, null, 2)};\n\nexport const academySites = ${JSON.stringify(payload.sites, null, 2)};\n`;
  fs.writeFileSync(outputPath, source, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeCoverImage(slug, meta) {
  const width = 640;
  const height = 320;
  const image = createRgbaCanvas(width, height);
  const accent = hexToRgb(meta.accent || '#f6ad55');
  const secondary = rotateAccent(accent);
  const seed = hashString(`${slug}:${meta.type}:${meta.title}`);

  paintBackground(image, accent, secondary, seed);
  paintPattern(image, meta.type, accent, secondary, seed);
  paintTexture(image, accent, seed);

  const outputPathForSlug = path.join(coverOutputRoot, `${slug}.png`);
  fs.writeFileSync(outputPathForSlug, encodePng(width, height, image.pixels));
  return `/assets/academy-covers/${slug}.png`;
}

function createRgbaCanvas(width, height) {
  return {
    width,
    height,
    pixels: Buffer.alloc(width * height * 4),
  };
}

function paintBackground(image, accent, secondary, seed) {
  const base = { r: 16, g: 21, b: 29 };
  const warm = mix(base, accent, 0.2);
  const cool = mix(base, secondary, 0.12);

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const horizontal = x / Math.max(1, image.width - 1);
      const vertical = y / Math.max(1, image.height - 1);
      const shimmer = ((hashString(`${seed}:${x >> 4}:${y >> 4}`) % 18) - 9) / 255;
      const color = mix(mix(base, warm, horizontal * 0.65), cool, vertical * 0.75);
      setPixel(image, x, y, {
        r: clampChannel(color.r + shimmer * 255),
        g: clampChannel(color.g + shimmer * 180),
        b: clampChannel(color.b + shimmer * 130),
      }, 1);
    }
  }

  fillRect(image, 0, 0, image.width, 9, accent, 0.9);
  fillRect(image, 0, image.height - 7, image.width, 7, secondary, 0.45);
  circle(image, image.width - 86, 82, 118, accent, 0.08);
  circle(image, 86, image.height - 42, 98, secondary, 0.08);
}

function paintPattern(image, type, accent, secondary, seed) {
  if (type === 'map') {
    paintMapPattern(image, accent, secondary, seed);
    return;
  }

  if (type === 'comparison') {
    paintComparisonPattern(image, accent, secondary);
    return;
  }

  if (type === 'simulator' || type === 'tool' || type === 'quiz') {
    paintRadarPattern(image, accent, secondary, seed);
    return;
  }

  paintStoryPattern(image, accent, secondary, seed);
}

function paintMapPattern(image, accent, secondary, seed) {
  const nodes = [
    [116, 104],
    [244, 72],
    [360, 148],
    [512, 96],
    [184, 234],
    [468, 238],
  ].map(([x, y], index) => [
    x + ((seed >> (index % 8)) % 17) - 8,
    y + ((seed >> ((index + 3) % 8)) % 17) - 8,
  ]);

  [[0, 1], [1, 2], [2, 3], [0, 4], [4, 2], [2, 5], [5, 3]].forEach(([from, to], index) => {
    line(image, nodes[from][0], nodes[from][1], nodes[to][0], nodes[to][1], index % 2 ? secondary : accent, 0.5, 5);
  });

  nodes.forEach(([x, y], index) => {
    circle(image, x, y, index % 2 ? 22 : 27, index % 2 ? secondary : accent, 0.28);
    circle(image, x, y, 8, { r: 248, g: 250, b: 252 }, 0.72);
  });
}

function paintComparisonPattern(image, accent, secondary) {
  fillRect(image, 54, 54, 244, 210, accent, 0.16);
  fillRect(image, 342, 54, 244, 210, secondary, 0.16);
  fillRect(image, 316, 44, 4, 232, { r: 248, g: 250, b: 252 }, 0.16);

  [88, 128, 168, 208].forEach((y, index) => {
    fillRect(image, 86, y, 170 - index * 24, 16, accent, 0.46);
    fillRect(image, 374, y, 104 + index * 28, 16, secondary, 0.46);
  });

  circle(image, 176, 226, 24, accent, 0.36);
  circle(image, 462, 226, 24, secondary, 0.36);
}

function paintRadarPattern(image, accent, secondary, seed) {
  const cx = 320;
  const cy = 164;
  const spokes = 6;

  for (let ring = 1; ring <= 4; ring += 1) {
    const radius = ring * 34;
    for (let side = 0; side < spokes; side += 1) {
      const a = Math.PI * 2 * side / spokes - Math.PI / 2;
      const b = Math.PI * 2 * (side + 1) / spokes - Math.PI / 2;
      line(image, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, cx + Math.cos(b) * radius, cy + Math.sin(b) * radius, { r: 248, g: 250, b: 252 }, 0.15, 3);
    }
  }

  for (let side = 0; side < spokes; side += 1) {
    const angle = Math.PI * 2 * side / spokes - Math.PI / 2;
    line(image, cx, cy, cx + Math.cos(angle) * 140, cy + Math.sin(angle) * 140, { r: 248, g: 250, b: 252 }, 0.12, 3);
    const radius = 58 + (hashString(`${seed}:${side}`) % 66);
    circle(image, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, 13, side % 2 ? secondary : accent, 0.62);
  }

  circle(image, cx, cy, 42, accent, 0.22);
  circle(image, cx, cy, 14, secondary, 0.72);
}

function paintStoryPattern(image, accent, secondary, seed) {
  for (let index = 0; index < 5; index += 1) {
    const y = 62 + index * 42;
    const offset = hashString(`${seed}:band:${index}`) % 42;
    line(image, 72 + offset, y, 552 - offset, y + 22, index % 2 ? secondary : accent, 0.28, 18);
  }

  [118, 256, 394].forEach((x, index) => {
    fillRect(image, x, 188 - index * 18, 88, 64, index % 2 ? secondary : accent, 0.22);
    fillRect(image, x + 18, 210 - index * 18, 52, 10, { r: 248, g: 250, b: 252 }, 0.3);
  });
}

function paintTexture(image, accent, seed) {
  for (let index = 0; index < 26; index += 1) {
    const x = 42 + (hashString(`${seed}:dot-x:${index}`) % (image.width - 84));
    const y = 38 + (hashString(`${seed}:dot-y:${index}`) % (image.height - 76));
    circle(image, x, y, 2 + (index % 3), accent, 0.14);
  }
}

function fillRect(image, left, top, width, height, color, alpha = 1) {
  const x0 = Math.max(0, Math.floor(left));
  const y0 = Math.max(0, Math.floor(top));
  const x1 = Math.min(image.width, Math.ceil(left + width));
  const y1 = Math.min(image.height, Math.ceil(top + height));

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      setPixel(image, x, y, color, alpha);
    }
  }
}

function circle(image, centerX, centerY, radius, color, alpha = 1) {
  const x0 = Math.max(0, Math.floor(centerX - radius));
  const y0 = Math.max(0, Math.floor(centerY - radius));
  const x1 = Math.min(image.width - 1, Math.ceil(centerX + radius));
  const y1 = Math.min(image.height - 1, Math.ceil(centerY + radius));
  const radiusSq = radius * radius;

  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      if (dx * dx + dy * dy <= radiusSq) setPixel(image, x, y, color, alpha);
    }
  }
}

function line(image, x0, y0, x1, y1, color, alpha = 1, width = 1) {
  const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)));
  for (let step = 0; step <= steps; step += 1) {
    const t = steps === 0 ? 0 : step / steps;
    circle(image, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, width / 2, color, alpha);
  }
}

function setPixel(image, x, y, color, alpha = 1) {
  if (x < 0 || x >= image.width || y < 0 || y >= image.height) return;

  const offset = (Math.floor(y) * image.width + Math.floor(x)) * 4;
  const existing = {
    r: image.pixels[offset],
    g: image.pixels[offset + 1],
    b: image.pixels[offset + 2],
  };
  const blended = mix(existing, color, alpha);
  image.pixels[offset] = clampChannel(blended.r);
  image.pixels[offset + 1] = clampChannel(blended.g);
  image.pixels[offset + 2] = clampChannel(blended.b);
  image.pixels[offset + 3] = 255;
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    pngChunk('IHDR', Buffer.concat([
      uint32(width),
      uint32(height),
      Buffer.from([8, 6, 0, 0, 0]),
    ])),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const checksum = crc32(Buffer.concat([typeBuffer, data]));
  return Buffer.concat([uint32(data.length), typeBuffer, data, uint32(checksum)]);
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function hexToRgb(hex) {
  const normalized = String(hex).replace('#', '').padEnd(6, '0').slice(0, 6);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rotateAccent(color) {
  return {
    r: clampChannel(color.b + 52),
    g: clampChannel(color.r + 36),
    b: clampChannel(color.g + 42),
  };
}

function mix(from, to, ratio) {
  const t = Math.max(0, Math.min(1, ratio));
  return {
    r: from.r + (to.r - from.r) * t,
    g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t,
  };
}

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < String(value).length; index += 1) {
    hash ^= String(value).charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

main();
