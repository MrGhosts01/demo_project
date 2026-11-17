/* ═══════════════════════════════════════════════════════════
   split-combo.js —— 合集切图分析 + 五等分切割
   ─────────────────────────────────────────
   1. 读取合集 PNG，输出 alpha 通道的垂直投影（每列最大 alpha）
   2. 依据投影找人物列之间的空隙，切出五段
   3. 每段走统一流水线：清雾 → alpha包围盒裁剪 → 统一画布
      （与 tools/process-rulers.js 同参数：640×896，人物高 864）
   第 5 段（共公）若 REPL 单独图存在则用单独图替代
   用法：node split-combo.js
   ═══════════════════════════════════════════════════════════ */
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const DESKTOP = "C:\\Users\\Administrator\\Desktop";
const COMBO = path.join(DESKTOP, "五张合集切图.png");
const REPL = path.join(DESKTOP, "微信图片_20261117163739_8462_3.png");
const OUT = path.join(__dirname, "..", "assets", "rulers");

const CANVAS_W = 640, CANVAS_H = 896, CHAR_H = 864;
const ALPHA_FLOOR = 26;
const IDS = ["feizi", "xianggong", "mugong", "kanggong", "gonggong"];

/* 统一处理：输入 RGBA raw（已有 alpha），输出规格化 PNG */
async function pipeline(raw, W, H, id) {
  const data = Buffer.from(raw);
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a < ALPHA_FLOOR) data[i] = 0;
    else if (a < 60) data[i] = Math.round(((a - ALPHA_FLOOR) / (60 - ALPHA_FLOOR)) * a);
  }
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 60) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const scale = CHAR_H / bh;
  const newW = Math.max(1, Math.round(bw * scale));
  const charBuf = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: minX, top: minY, width: bw, height: bh })
    .resize(newW, CHAR_H, { kernel: "lanczos3" })
    .png().toBuffer();
  const out = path.join(OUT, `${id}.png`);
  await sharp({ create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: charBuf, left: Math.round((CANVAS_W - newW) / 2), top: CANVAS_H - CHAR_H }])
    .png({ compressionLevel: 9 }).toFile(out);
  console.log(`${id}: 段宽${W} 裁剪(${bw}x${bh}) x${scale.toFixed(3)} → 人物${newW}x${CHAR_H}`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const meta = await sharp(COMBO).metadata();
  const W = meta.width, H = meta.height;
  console.log(`合集: ${W}x${H} channels=${meta.channels}`);
  const { data } = await sharp(COMBO).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  /* 垂直投影：每列 alpha>120 的像素数（人物主体列计数高，
     人物交界处衣摆相连但最窄 —— 找局部最小列作为切割线） */
  const c120 = new Array(W).fill(0);
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++)
      if (data[(y * W + x) * 4 + 3] > 120) c120[x]++;

  /* 五人约均匀分布：在四个预期边界区域内找最窄列 */
  const regions = [
    [0.14, 0.26], [0.36, 0.44], [0.56, 0.64], [0.72, 0.86],
  ];
  const bounds = regions.map(([a, b]) => {
    const x0 = Math.round(W * a), x1 = Math.round(W * b);
    let best = x0, bestC = Infinity;
    for (let x = x0; x <= x1; x++) {
      if (c120[x] < bestC) { bestC = c120[x]; best = x; }
    }
    return best;
  });
  console.log(`切割边界: ${bounds.join(", ")}（各边界处最窄列计数 ${bounds.map(x => c120[x]).join(", ")}）`);

  const merged = [
    [0, bounds[0] - 1],
    [bounds[0], bounds[1] - 1],
    [bounds[1], bounds[2] - 1],
    [bounds[2], bounds[3] - 1],
    [bounds[3], W - 1],
  ];
  console.log(`5 段: ` + merged.map(s => `[${s[0]}-${s[1]}] w=${s[1] - s[0] + 1}`).join("  "));

  for (let i = 0; i < 5; i++) {
    const id = IDS[i];
    const [sx, ex] = merged[i];
    if (id === "gonggong" && fs.existsSync(REPL)) {
      console.log(`共公使用替换图: ${path.basename(REPL)}`);
      const rm = await sharp(REPL).metadata();
      const rd = await sharp(REPL).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      await pipeline(rd.data, rd.info.width, rd.info.height, id);
      continue;
    }
    const segW = ex - sx + 1;
    const seg = Buffer.alloc(segW * H * 4);
    for (let y = 0; y < H; y++) {
      data.copy(seg, y * segW * 4, (y * W + sx) * 4, (y * W + ex + 1) * 4);
    }
    await pipeline(seg, segW, H, id);
  }
  const sizes = fs.readdirSync(OUT).filter(f => f.endsWith(".png"))
    .map(f => `${f} ${(fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0)}KB`);
  console.log("产物: " + sizes.join(" | "));
})();
