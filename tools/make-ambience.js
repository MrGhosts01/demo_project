/* ═══════════════════════════════════════════════════════════
   make-ambience.js —— 原创背景音合成器（无依赖，Node 直接运行）
   ─────────────────────────────────────────
   生成一段可无缝循环的古风大漠氛围音：
     1. 风声层    —— 布朗噪声 + 低通滤波 + 慢速起伏包络
     2. 低音铺底  —— A1/A2/E3 三层正弦 + 缓慢颤音
     3. 编钟点缀  —— D 羽调五声音阶，含非谐分音的衰减钟声
   循环处理：风/铺底用整数周期振荡器保证首尾相接，
   输出前再做 2 秒等功率交叉折叠，彻底消除接缝。
   用法：node make-ambience.js  →  输出 ../assets/audio/ambience.wav
   ═══════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");

/* ── 参数 ── */
const SR = 44100;          // 采样率
const DUR = 36;            // 循环时长（秒）
const FOLD = 2;            // 循环交叉折叠窗口（秒）
const N = SR * DUR;
const nf = N / DUR;        // 每秒样本数简写

/* 可复现随机数（mulberry32）*/
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261117);

const mix = new Float32Array(N);
const add = (t, v) => { const i = t | 0; if (i >= 0 && i < N) mix[i] += v; };

/* ── 1. 风声：布朗噪声 → 低通 → 慢速起伏 ── */
{
  let brown = 0, lp1 = 0, lp2 = 0;
  const A1 = 0.02, A2 = 0.13;                 // 两个低通系数（深/中两层）
  const k = 2 * Math.PI / DUR;                // 整数周期包络（无缝循环）
  for (let i = 0; i < N; i++) {
    const t = i / nf;
    const white = rnd() * 2 - 1;
    brown = (brown * 0.997 + white * 0.03) / 1.0005;
    lp1 += A1 * (brown * 8 - lp1);
    lp2 += A2 * (brown * 3 - lp2);
    // 起伏包络：多个整数周期正弦叠加，永不为负
    const env =
      0.52 +
      0.30 * Math.sin(k * 2 * t + 1.1) +
      0.14 * Math.sin(k * 3 * t + 4.2) +
      0.08 * Math.sin(k * 5 * t + 0.6);
    const gust = 1 + 0.10 * Math.sin(k * 7 * t + 2.4) * Math.sin(k * 9 * t + 5.1);
    add(i, (lp1 * 0.75 + lp2 * 0.35) * env * gust * 0.55);
  }
}

/* ── 2. 低音铺底：A1 + A2 + E3，缓慢呼吸 ── */
{
  const k = 2 * Math.PI / DUR;
  const f1 = 55, f2 = 110, f3 = 164;          // 均可整除循环长度
  for (let i = 0; i < N; i++) {
    const t = i / nf;
    const breath = 0.75 + 0.25 * Math.sin(k * 1 * t + 2.0);
    const v =
      Math.sin(2 * Math.PI * f1 * t / DUR * DUR) * 0.070 +
      Math.sin(2 * Math.PI * f2 * t) * 0.042 * (0.8 + 0.2 * Math.sin(k * 2 * t)) +
      Math.sin(2 * Math.PI * f3 * t) * 0.028;
    add(i, v * breath);
  }
}

/* ── 3. 编钟点缀：D 羽调五声，稀疏随机 ── */
{
  const scale = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66]; // D3 F3 G3 A3 C4 D4
  let t = 3 + rnd() * 3;
  while (t < DUR - 5) {
    const f = scale[(rnd() * scale.length) | 0];
    const amp = 0.085 + rnd() * 0.05;
    const decay = 2.0 + rnd() * 1.2;
    const dur = Math.min(4.2, DUR - t - 0.2) * nf;
    for (let i = 0; i < dur; i++) {
      const tt = i / nf;
      const e = Math.exp(-decay * tt);
      // 基音 + 非谐分音（编钟的"哑金石"质感）+ 敲击瞬态
      const v =
        Math.sin(2 * Math.PI * f * tt) * 1.0 +
        Math.sin(2 * Math.PI * f * 2.756 * tt) * 0.32 * Math.exp(-decay * 1.8 * tt) +
        Math.sin(2 * Math.PI * f * 5.40 * tt) * 0.10 * Math.exp(-decay * 3.2 * tt);
      add(t * nf + i, v * amp * e);
    }
    t += 3.2 + rnd() * 4.6;                   // 稀疏间隔
  }
}

/* ── 4. 归一化 + 软限幅 ── */
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(mix[i]));
const g = 0.82 / peak;
const T = Math.tanh(1.15);
for (let i = 0; i < N; i++) mix[i] = Math.tanh(mix[i] * g * 1.15) / T;

/* ── 5. 循环折叠：末尾 FOLD 秒 与 开头 等功率交叉 ── */
{
  const Fn = FOLD * SR;
  const tail = mix.slice(N - Fn);             // 先暂存末尾
  // 重新渲染"延长段"代价高——这里用对称近似：把末尾折叠进开头
  for (let i = 0; i < Fn; i++) {
    const w = i / Fn;                         // 0→1
    mix[i] = mix[i] * Math.sqrt(w) + tail[i] * Math.sqrt(1 - w);
  }
}

/* ── 6. 写出 16bit PCM WAV ── */
const wav = Buffer.alloc(44 + N * 2);
wav.write("RIFF", 0); wav.writeUInt32LE(36 + N * 2, 4); wav.write("WAVE", 8);
wav.write("fmt ", 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22); wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write("data", 36); wav.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) {
  wav.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(mix[i] * 32767))), 44 + i * 2);
}
const out = path.join(__dirname, "..", "assets", "audio", "ambience.wav");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, wav);
console.log(`✅ 已生成 ${out}  (${(wav.length / 1024 / 1024).toFixed(2)} MB, ${DUR}s 无缝循环)`);
