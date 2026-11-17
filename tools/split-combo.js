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

  /* ═══ 连通域标记分割 ═══
     人物可能衣摆相连、脚下阴影带横贯 —— 任何直线切割都会带入邻人残渣。
     改为像素级归属：alpha>150 的强像素做 4 连通域标记（阴影/软边天然排除），
     每个人物 = 一个大连通块；再按质心 x 排序对应五人；
     未标记像素（软边、阴影）归到同列最近的上/下方已标记像素。 */
  const N = W * H;
  const label = new Int32Array(N).fill(-1);
  const strong = (x, y) => data[(y * W + x) * 4 + 3] > 150;
  const comps = [];   // {size, sumX, sumY}
  const stack = new Int32Array(N);
  for (let s = 0; s < N; s++) {
    if (label[s] !== -1 || !strong(s % W, (s / W) | 0)) continue;
    const id = comps.length;
    let top = 0, size = 0, sumX = 0, sumY = 0;
    stack[top++] = s; label[s] = id;
    while (top > 0) {
      const p = stack[--top];
      const x = p % W, y = (p / W) | 0;
      size++; sumX += x; sumY += y;
      if (x > 0 && label[p - 1] === -1 && strong(x - 1, y)) { label[p - 1] = id; stack[top++] = p - 1; }
      if (x < W - 1 && label[p + 1] === -1 && strong(x + 1, y)) { label[p + 1] = id; stack[top++] = p + 1; }
      if (y > 0 && label[p - W] === -1 && strong(x, y - 1)) { label[p - W] = id; stack[top++] = p - W; }
      if (y < H - 1 && label[p + W] === -1 && strong(x, y + 1)) { label[p + W] = id; stack[top++] = p + W; }
    }
    comps.push({ size, cx: sumX / size, cy: sumY / size });
  }
  /* 大连通块 = 人物主体（>总强像素 3%），小碎块并入最近的主体 */
  const strongTotal = comps.reduce((a, c) => a + c.size, 0);
  const big = comps.map((c, i) => ({ i, ...c })).filter(c => c.size > strongTotal * 0.03)
    .sort((a, b) => a.cx - b.cx);
  console.log(`连通块 ${comps.length} 个，主体 ${big.length} 个: ` +
    big.map(c => `#${c.i}(${(c.size / 1000 | 0)}K, cx=${c.cx | 0})`).join("  "));
  if (big.length !== 5 && big.length !== 4) {
    console.log(`!! 主体数 ${big.length} 异常 —— 中止`);
    return;
  }

  /* 4 主体 = [非子, 襄公, 穆公, 康公+共公粘连]：
     共公由替换图单独提供，粘连块在最窄处切一刀，只取左侧给康公，
     右侧（共公）像素直接丢弃 —— 不存在另一侧污染 */
  const compToFig = new Int32Array(comps.length).fill(-1);
  let cutColumn = -1;
  if (big.length === 5) {
    big.forEach((c, fig) => { compToFig[c.i] = fig; });
  } else {
    const [f0, f1, f2, f3] = big;
    compToFig[f0.i] = 0; compToFig[f1.i] = 1; compToFig[f2.i] = 2; compToFig[f3.i] = 3;
    const yCut = Math.floor(H * 0.88);   // 排除脚下阴影带
    const cUp = new Array(W).fill(0);
    for (let x = 0; x < W; x++)
      for (let y = 0; y < yCut; y++)
        if (data[(y * W + x) * 4 + 3] > 120) cUp[x]++;
    const rx0 = Math.round(W * 0.74), rx1 = Math.round(W * 0.86);
    let minC = Infinity;
    for (let x = rx0; x <= rx1; x++) if (cUp[x] < minC) { minC = cUp[x]; cutColumn = x; }
    console.log(`康公/共公粘连块切割线 x=${cutColumn}（该列计数 ${minC}）`);
  }

  /* 像素归属：
     - 强像素（alpha>150）→ 所在连通块的人物
     - 软边像素（26<alpha≤150）→ 仅当 3px 邻域内存在该人物的强像素才归属
       （比"列内就近"严格：远处的他人衣缘残丝不再被误吸进来） */
  const figOf = new Int8Array(N).fill(-1);
  const strongFig = new Int8Array(N).fill(-1);
  for (let p = 0; p < N; p++) {
    if (label[p] === -1) continue;
    const fig = compToFig[label[p]];
    if (fig === -1) continue;
    if (fig === 3 && cutColumn !== -1 && (p % W) >= cutColumn) continue;   // 切线右侧（共公）不取
    strongFig[p] = fig;
    figOf[p] = fig;
  }
  for (let p = 0; p < N; p++) {
    if (figOf[p] !== -1) continue;
    const a = data[p * 4 + 3];
    if (a <= 26 || a > 150) continue;
    const x = p % W, y = (p / W) | 0;
    let bestFig = -1, bestD = 99;
    for (let dy = -3; dy <= 3; dy++) {
      const yy = y + dy; if (yy < 0 || yy >= H) continue;
      for (let dx = -3; dx <= 3; dx++) {
        const xx = x + dx; if (xx < 0 || xx >= W) continue;
        const f = strongFig[yy * W + xx];
        if (f !== -1) {
          const d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; bestFig = f; }
        }
      }
    }
    if (bestFig !== -1) figOf[p] = bestFig;
  }

  /* ═══ 组装 + 碎岛清理 ═══
     切割残渣（发丝线、邻人袖边）与本体的连通被切断，成为小碎岛；
     对每个人物的 mask 再做一次连通域标记，丢弃 < 主块 1% 的碎岛。 */
  function labelMask(mask, w, h) {
    const lab = new Int32Array(w * h).fill(-1);
    const list = [];
    const stk = new Int32Array(w * h);
    for (let s = 0; s < w * h; s++) {
      if (lab[s] !== -1 || !mask[s]) continue;
      const id = list.length;
      let top = 0, size = 0;
      stk[top++] = s; lab[s] = id;
      while (top > 0) {
        const p = stk[--top]; size++;
        const x = p % w, y = (p / w) | 0;
        if (x > 0 && lab[p - 1] === -1 && mask[p - 1]) { lab[p - 1] = id; stk[top++] = p - 1; }
        if (x < w - 1 && lab[p + 1] === -1 && mask[p + 1]) { lab[p + 1] = id; stk[top++] = p + 1; }
        if (y > 0 && lab[p - w] === -1 && mask[p - w]) { lab[p - w] = id; stk[top++] = p - w; }
        if (y < h - 1 && lab[p + w] === -1 && mask[p + w]) { lab[p + w] = id; stk[top++] = p + w; }
      }
      list.push(size);
    }
    return { lab, list };
  }

  /* ═══ 按人物组装 + 碎岛过滤 → 统一流水线 ═══ */
  for (let fig = 0; fig < 5; fig++) {
    const id = IDS[fig];
    let srcData = data, srcW = W, srcH = H, useFig = fig;
    if (id === "gonggong" && fs.existsSync(REPL)) {
      console.log(`共公使用替换图: ${path.basename(REPL)}`);
      const rd = await sharp(REPL).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      srcData = rd.data; srcW = rd.info.width; srcH = rd.info.height;
      useFig = -1;   // 整图即人物，无需 figOf 归属
    }
    /* mask：该人物的全部不透明像素（alpha>26）*/
    const n = srcW * srcH;
    const mask = new Uint8Array(n);
    let cnt = 0;
    for (let p = 0; p < n; p++) {
      if (useFig === -1 ? srcData[p * 4 + 3] > 26 : (figOf[p] === useFig && srcData[p * 4 + 3] > 26)) {
        mask[p] = 1; cnt++;
      }
    }
    if (!cnt) { console.log(`${id}: 无像素，跳过`); continue; }
    /* 连通域过滤：与本体断开的小碎岛（切割残渣/发丝线）丢弃 */
    const { lab, list } = labelMask(mask, srcW, srcH);
    const main = Math.max(...list);
    const keep = list.map(s => s >= main * 0.01);
    const seg = Buffer.alloc(n * 4);
    let kept = 0;
    for (let p = 0; p < n; p++) {
      if (mask[p] && keep[lab[p]]) {
        seg[p * 4] = srcData[p * 4]; seg[p * 4 + 1] = srcData[p * 4 + 1];
        seg[p * 4 + 2] = srcData[p * 4 + 2]; seg[p * 4 + 3] = srcData[p * 4 + 3];
        kept++;
      }
    }
    console.log(`${id}: 像素 ${(cnt / 1000) | 0}K → 保留 ${(kept / 1000) | 0}K（丢弃 ${list.length - keep.filter(Boolean).length} 块碎岛）`);
    await pipeline(seg, srcW, srcH, id);
  }
  const sizes = fs.readdirSync(OUT).filter(f => f.endsWith(".png"))
    .map(f => `${f} ${(fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0)}KB`);
  console.log("产物: " + sizes.join(" | "));
})();
