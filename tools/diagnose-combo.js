/* diagnose-combo.js —— 合集图体检：背景 alpha、alpha 直方图、列投影分布 */
const sharp = require("sharp");
const path = require("path");
const COMBO = "C:\\Users\\Administrator\\Desktop\\五张合集切图.png";

(async () => {
  const { width: W, height: H } = await sharp(COMBO).metadata();
  const { data } = await sharp(COMBO).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * W + x) * 4;
    return `rgba(${data[i]},${data[i + 1]},${data[i + 2]},a=${data[i + 3]})`;
  };
  console.log(`尺寸 ${W}x${H}`);
  console.log(`四角+上中: ${[px(0,0), px(W-1,0), px(0,H-1), px(W-1,H-1), px(W>>1, 2)].join(" | ")}`);

  /* alpha 直方图（16 桶） */
  const buckets = new Array(16).fill(0);
  for (let i = 3; i < data.length; i += 4) buckets[data[i] >> 4]++;
  console.log("alpha 直方图(0-15,16-31,...,240-255):");
  buckets.forEach((b, i) => { if (b > 0) console.log(`  ${i * 16}-${i * 16 + 15}: ${b} (${(b / (W * H) * 100).toFixed(1)}%)`); });

  /* 列投影：统计每列 alpha>200 / 120 / 60 的像素数，打印几个采样列 */
  const th = [200, 120, 60];
  const cols = th.map(() => new Array(W).fill(0));
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++) {
      const a = data[(y * W + x) * 4 + 3];
      th.forEach((t, k) => { if (a > t) cols[k][x]++; });
    }
  /* 压缩打印投影：每 24 列取均值，画简易柱状 */
  console.log("\n列投影轮廓（每24列一格，字符高度代表 alpha>60 计数）:");
  let line = "";
  for (let x = 0; x < W; x += 24) {
    let sum = 0;
    for (let dx = 0; dx < 24 && x + dx < W; dx++) sum += cols[2][x + dx];
    const avg = sum / 24;
    line += avg > H * 0.5 ? "█" : avg > H * 0.2 ? "▓" : avg > 20 ? "▂" : avg > 0 ? "." : "_";
  }
  console.log("  " + line);
  /* 各阈值下的连续段 */
  th.forEach((t, k) => {
    const segs = [];
    let inSeg = false, s = 0;
    for (let x = 0; x < W; x++) {
      const has = cols[k][x] > 3;
      if (has && !inSeg) { inSeg = true; s = x; }
      else if (!has && inSeg) { inSeg = false; if (x - s > 30) segs.push(`${s}-${x - 1}`); }
    }
    if (inSeg) segs.push(`${s}-${W - 1}`);
    console.log(`alpha>${t} 段: ${segs.join("  ") || "无"}`);
  });

  /* 按列计数阈值分段（区分人物与阴影/间隙）：人物列的 alpha>120 计数远高于间隙列 */
  const c = cols[1];   // alpha>120
  [30, 60, 100, 150].forEach(min => {
    const segs = [];
    let inSeg = false, s = 0;
    for (let x = 0; x < W; x++) {
      const has = c[x] > min;
      if (has && !inSeg) { inSeg = true; s = x; }
      else if (!has && inSeg) { inSeg = false; if (x - s > 20) segs.push(`${s}-${x - 1} w${x - s}`); }
    }
    if (inSeg) segs.push(`${s}-${W - 1}`);
    console.log(`列计数>${min} 段: ${segs.join("  ") || "无"}`);
  });

  /* 排除脚下阴影带后的投影：阴影集中在底部，只统计上方 88% 的行 */
  const yCut = Math.floor(H * 0.88);
  const cUp = new Array(W).fill(0);
  for (let x = 0; x < W; x++)
    for (let y = 0; y < yCut; y++)
      if (data[(y * W + x) * 4 + 3] > 120) cUp[x]++;
  console.log(`\n仅统计 y<${yCut}（排除阴影带）:`);
  [3, 30, 100].forEach(min => {
    const segs = [];
    let inSeg = false, s = 0;
    for (let x = 0; x < W; x++) {
      const has = cUp[x] > min;
      if (has && !inSeg) { inSeg = true; s = x; }
      else if (!has && inSeg) { inSeg = false; if (x - s > 15) segs.push(`${s}-${x - 1} w${x - s}`); }
    }
    if (inSeg) segs.push(`${s}-${W - 1}`);
    console.log(`列计数>${min} 段: ${segs.join("  ") || "无"}`);
  });
})();
