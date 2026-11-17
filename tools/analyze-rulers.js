/* ═══════════════════════════════════════════════════════════
   analyze-rulers.js —— 立绘体检：Alpha 通道 / 背景色 / 内容包围盒
   用法：node analyze-rulers.js
   ═══════════════════════════════════════════════════════════ */
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const DL = "C:\\Users\\Administrator\\Downloads";
const FILES = [
  ["feizi", "秦非子角色立绘全身像.png"],
  ["xianggong", "秦襄公角色立绘全身像.png"],
  ["mugong", "秦穆公角色立绘全身像.png"],
  ["kanggong", "秦康公角色立绘全身像.png"],
  ["gonggong", "秦共公角色立绘全身像.png"],
];

(async () => {
  for (const [id, name] of FILES) {
    const p = path.join(DL, name);
    const meta = await sharp(p).metadata();
    const { width, height, channels } = meta;
    const hasAlpha = channels === 2 || channels === 4;
    /* 抽样四角 + 上边中点像素 */
    const { data, info } = await sharp(p).raw().toBuffer({ resolveWithObject: true });
    const px = (x, y) => {
      const i = (y * width + x) * channels;
      return channels === 4
        ? `rgba(${data[i]},${data[i + 1]},${data[i + 2]},a=${data[i + 3]})`
        : channels === 3
          ? `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`
          : `g=${data[i]}`;
    };
    const corners = [px(0, 0), px(width - 1, 0), px(0, height - 1), px(width - 1, height - 1), px(width >> 1, 2)];
    /* 内容包围盒：非纯白像素（任意通道 < 245）的范围 */
    let minX = width, minY = height, maxX = 0, maxY = 0;
    const step = 2;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * channels;
        const a = channels === 4 ? data[i + 3] : 255;
        const bright = channels >= 3 ? Math.min(data[i], data[i + 1], data[i + 2]) : data[i];
        const isContent = a > 8 && !(bright > 244);
        if (isContent) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    console.log(
      `${id}  ${width}x${height}  ch=${channels}  hasAlpha=${hasAlpha}\n` +
      `  角像素: ${corners.join(" | ")}\n` +
      `  内容bbox: x[${minX},${maxX}] y[${minY},${maxY}]  (${maxX - minX + 1}x${maxY - minY + 1})`
    );
  }
})();
