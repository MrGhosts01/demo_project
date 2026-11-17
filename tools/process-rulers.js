/* ═══════════════════════════════════════════════════════════
   process-rulers.js —— 君主立绘规格化处理
   ─────────────────────────────────────────
   输入：Downloads 下 AI 生成的五张 1024×1536 RGBA 全身像
   处理：
     1. 清除半透明雾残留（alpha < 26 的低置信度像素 → 全透明）
     2. 按alpha包围盒裁剪人物
     3. 统一缩放到同一人物高度（画布 1000×1400，人物高 1360，
        脚底贴底边作为统一基线，水平居中）
   输出：assets/rulers/{id}.png
   用法：node process-rulers.js
   ═══════════════════════════════════════════════════════════ */
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const DL = "C:\\Users\\Administrator\\Downloads";
const OUT = path.join(__dirname, "..", "assets", "rulers");
const CANVAS_W = 640, CANVAS_H = 896, CHAR_H = 864;   // 展示高约350px，2倍retina余量
const ALPHA_FLOOR = 26;          // 低于此 alpha 视为背景雾残留
const FILES = [
  ["feizi", "秦非子角色立绘全身像.png"],
  ["xianggong", "秦襄公角色立绘全身像.png"],
  ["mugong", "秦穆公角色立绘全身像.png"],
  ["kanggong", "秦康公角色立绘全身像.png"],
  ["gonggong", "秦共公角色立绘全身像.png"],
];

async function processOne(id, name) {
  const src = sharp(path.join(DL, name));
  const { width: W, height: H } = await src.metadata();
  const { data } = await src.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  /* 1. 清雾：alpha 低于阈值置 0（软过渡：26~60 之间按比例压低，避免硬边） */
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a < ALPHA_FLOOR) data[i] = 0;
    else if (a < 60) data[i] = Math.round(((a - ALPHA_FLOOR) / (60 - ALPHA_FLOOR)) * a);
  }

  /* 2. alpha>60 的包围盒（只认人物本体，忽略边缘淡雾） */
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

  /* 3. 裁剪 + 缩放（高度统一）+ 贴到底部居中 */
  const scale = CHAR_H / bh;
  const newW = Math.max(1, Math.round(bw * scale));
  const charBuf = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: minX, top: minY, width: bw, height: bh })
    .resize(newW, CHAR_H, { kernel: "lanczos3" })
    .png()
    .toBuffer();

  const out = path.join(OUT, `${id}.png`);
  await sharp({
    create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: charBuf, left: Math.round((CANVAS_W - newW) / 2), top: CANVAS_H - CHAR_H }])
    .png({ compressionLevel: 9 })
    .toFile(out);

  console.log(`${id}: 裁剪(${bw}x${bh}) → 缩放 x${scale.toFixed(3)} → ${CANVAS_W}x${CANVAS_H} 画布, 人物 ${newW}x${CHAR_H}  →  ${path.basename(out)}`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [id, name] of FILES) await processOne(id, name);
  /* 输出统计 */
  const sizes = fs.readdirSync(OUT).filter(f => f.endsWith(".png")).map(f => {
    const kb = (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0);
    return `${f} ${kb}KB`;
  });
  console.log("\n产物: " + sizes.join(" | "));
})();
