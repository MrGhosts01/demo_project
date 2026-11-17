const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const sharp = require("sharp");

const desktop = path.join(os.homedir(), "Desktop");
const compositePath = process.argv[2] || path.join(desktop, "五张合集切图.png");
const gonggongPath = process.argv[3] || path.join(desktop, "微信图片_20261117163739_8462_3.png");
const outputDir = process.env.RULER_OUTPUT_DIR || process.argv[4] || path.join(__dirname, "..", "assets", "rulers");
const canvas = { width: 640, height: 896, characterHeight: 864 };
const rulers = ["feizi", "xianggong", "mugong", "kanggong"];
const cutZones = [
  { left: 240, right: 330, fallback: 285 },
  { left: 590, right: 650, fallback: 620 },
  { left: 900, right: 970, fallback: 938 },
  { left: 1200, right: 1300, fallback: 1240 },
];

function findCutPath(data, width, height, zone) {
  const path = new Int16Array(height);
  const known = new Uint8Array(height);

  for (let y = 0; y < height; y++) {
    let runStart = -1;
    let bestStart = -1;
    let bestLength = 0;
    for (let x = zone.left; x <= zone.right; x++) {
      const transparent = x < zone.right && data[(y * width + x) * 4 + 3] < 26;
      if (transparent && runStart < 0) runStart = x;
      if ((!transparent || x === zone.right) && runStart >= 0) {
        const end = transparent ? x : x - 1;
        const length = end - runStart + 1;
        if (length > bestLength) {
          bestStart = runStart;
          bestLength = length;
        }
        runStart = -1;
      }
    }

    if (bestLength > 0) {
      path[y] = bestStart + Math.floor((bestLength - 1) / 2);
      known[y] = 1;
    }
  }

  for (let y = 0; y < height; y++) {
    if (known[y]) continue;
    let above = y - 1;
    let below = y + 1;
    while (above >= 0 && !known[above]) above--;
    while (below < height && !known[below]) below++;
    if (above >= 0 && below < height) {
      const ratio = (y - above) / (below - above);
      path[y] = Math.round(path[above] + (path[below] - path[above]) * ratio);
    } else if (above >= 0) {
      path[y] = path[above];
    } else if (below < height) {
      path[y] = path[below];
    } else {
      path[y] = zone.fallback;
    }
  }

  const smoothed = new Int16Array(height);
  const radius = 4;
  for (let y = 0; y < height; y++) {
    const values = [];
    for (let row = Math.max(0, y - radius); row <= Math.min(height - 1, y + radius); row++) {
      values.push(path[row]);
    }
    values.sort((a, b) => a - b);
    smoothed[y] = values[Math.floor(values.length / 2)];
  }
  return smoothed;
}

async function writeRuler(data, width, height, outputPath) {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alphaIndex = (y * width + x) * 4 + 3;
      const alpha = data[alphaIndex];
      if (alpha < 26) {
        data[alphaIndex] = 0;
      } else if (alpha < 60) {
        data[alphaIndex] = Math.round(((alpha - 26) / 34) * alpha);
      }
      if (data[alphaIndex] > 60) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < minX || maxY < minY) throw new Error(`No foreground found for ${outputPath}`);

  const widthCrop = maxX - minX + 1;
  const heightCrop = maxY - minY + 1;
  const crop = Buffer.alloc(widthCrop * heightCrop * 4);
  for (let y = 0; y < heightCrop; y++) {
    const start = ((minY + y) * width + minX) * 4;
    data.copy(crop, y * widthCrop * 4, start, start + widthCrop * 4);
  }

  const scale = Math.min(canvas.characterHeight / heightCrop, canvas.width / widthCrop);
  const resizedWidth = Math.max(1, Math.round(widthCrop * scale));
  const resizedHeight = Math.max(1, Math.round(heightCrop * scale));
  const character = await sharp(crop, { raw: { width: widthCrop, height: heightCrop, channels: 4 } })
    .resize(resizedWidth, resizedHeight, { kernel: "lanczos3" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: canvas.width,
      height: canvas.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{
      input: character,
      left: Math.round((canvas.width - resizedWidth) / 2),
      top: canvas.height - resizedHeight,
    }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  return { sourceBounds: `${widthCrop}x${heightCrop}`, outputBounds: `${canvas.width}x${canvas.height}` };
}

async function readImage(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Image not found: ${filePath}`);
  return sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

async function main() {
  const { data: source, info } = await readImage(compositePath);
  const cuts = cutZones.map(zone => findCutPath(source, info.width, info.height, zone));
  fs.mkdirSync(outputDir, { recursive: true });

  for (let rulerIndex = 0; rulerIndex < rulers.length; rulerIndex++) {
    const pixels = Buffer.from(source);
    const lowerCut = rulerIndex === 0 ? null : cuts[rulerIndex - 1];
    const upperCut = cuts[rulerIndex];
    for (let y = 0; y < info.height; y++) {
      const left = lowerCut ? lowerCut[y] + 1 : 0;
      const right = upperCut[y];
      for (let x = 0; x < info.width; x++) {
        if (x < left || x > right) pixels[(y * info.width + x) * 4 + 3] = 0;
      }
    }
    const outputPath = path.join(outputDir, `${rulers[rulerIndex]}.png`);
    const result = await writeRuler(pixels, info.width, info.height, outputPath);
    console.log(`${rulers[rulerIndex]}: ${result.sourceBounds} -> ${result.outputBounds}`);
  }

  const { data: gonggong, info: gongInfo } = await readImage(gonggongPath);
  const gongPath = path.join(outputDir, "gonggong.png");
  const gongResult = await writeRuler(gonggong, gongInfo.width, gongInfo.height, gongPath);
  console.log(`gonggong: ${gongResult.sourceBounds} -> ${gongResult.outputBounds}`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
