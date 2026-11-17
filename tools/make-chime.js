/* ═══════════════════════════════════════════════════════════
   make-chime.js —— 君主选中音效合成器（无依赖，Node 直接运行）
   ─────────────────────────────────────────
   合成一声清亮的编钟（基音 A3 = 220Hz），页面播放时通过
   playbackRate 变速不变调时长地映射到 D 羽调五声音阶：
     秦非子 ×1.335 → D4（始封 · 明亮如晨）
     秦襄公 ×1.189 → C4（立国 · 庄重）
     秦穆公 ×1.000 → A3（称霸 · 基准主音）
     秦康公 ×0.891 → G3（守成 · 沉稳）
     秦共公 ×0.794 → F3（继志 · 深厚）
   用法：node make-chime.js  →  输出 ../assets/audio/chime.wav
   ═══════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");

const SR = 44100;
const F0 = 220;              // 基音 A3
const DUR = 2.4;             // 秒
const N = SR * DUR;
const buf = new Float32Array(N);

/* 编钟分音表：[倍频, 振幅, 衰减率]（非谐分音给"金石"质感） */
const partials = [
  [1.0,   1.0,  2.0 ],
  [2.756, 0.40, 3.2 ],
  [5.404, 0.16, 4.6 ],
  [8.933, 0.06, 6.0 ],
];

for (let i = 0; i < N; i++) {
  const t = i / SR;
  let v = 0;
  for (const [ratio, amp, decay] of partials) {
    v += amp * Math.sin(2 * Math.PI * F0 * ratio * t) * Math.exp(-decay * t);
  }
  /* 敲击瞬态：极短的低频冲击，模拟钟槌触感 */
  if (t < 0.02) v += (1 - t / 0.02) * 0.5 * Math.sin(2 * Math.PI * 90 * t);
  buf[i] = v;
}

/* 归一化 + 软限幅 */
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(buf[i]));
const g = 0.72 / peak;
const T = Math.tanh(1.2);
for (let i = 0; i < N; i++) buf[i] = Math.tanh(buf[i] * g * 1.2) / T;

/* 写 16bit PCM WAV */
const wav = Buffer.alloc(44 + N * 2);
wav.write("RIFF", 0); wav.writeUInt32LE(36 + N * 2, 4); wav.write("WAVE", 8);
wav.write("fmt ", 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22); wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write("data", 36); wav.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) {
  wav.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(buf[i] * 32767))), 44 + i * 2);
}
const out = path.join(__dirname, "..", "assets", "audio", "chime.wav");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, wav);
console.log(`✅ 已生成 ${out}  (${(wav.length / 1024).toFixed(0)} KB, 基音 ${F0}Hz)`);
