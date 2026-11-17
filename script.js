/* ═══════════════════════════════════════════════════
   「尾声 · 千载回响」结尾互动 —— 逻辑层
   ─────────────────────────────────────────
   SCENE JSON 是本页唯一数据源（对接剧本引擎的节点配置）
   type: "ruler-reveal" ｜ 改文案只改这里
   img 字段：接入正式切图后，直接填路径即可自动替换剪影
   ═══════════════════════════════════════════════════ */
const SCENE = {
  type: "ruler-reveal",
  bgm: "assets/audio/ambience.wav",   // 原创合成氛围音（tools/make-ambience.js 生成）
  bgmVolume: 0.32,
  sfx: "assets/audio/chime.wav",      // 选中音效：编钟一声（tools/make-chime.js 生成）
  os: "所以这一次，我到底是谁呢……",
  stageTitle: "这一次，你听到的声音，来自「五个人」",
  hint: "把光标放到他们身上，听听每个人做了什么",
  rulers: [
    {
      id: "feizi", name: "秦非子", tag: "始封之君", era: "约公元前 890 年",
      scale: 0.82, crown: "flat",
      prop: "whip",
      tone: 1.335,                        // 选中钟声变调 → D4（羽调式·商音位）
      deed: "我做的是……替周王室养马。马养得又多又壮，孝王便把我封在了「秦」地。那时的秦，还只是西陲一个不起眼的附庸——但「秦」这个名字，是从我这里开始的。",
      img: "assets/rulers/feizi.png"      // 切图经 tools/process-rulers.js 规格化
    },
    {
      id: "xianggong", name: "秦襄公", tag: "立国之君", era: "公元前 771 年",
      scale: 0.87, crown: "tall",
      prop: "banner",
      tone: 1.189,                        // → C4
      deed: "我做的是……犬戎攻破镐京、天子蒙难的时候，没有作壁上观。我率兵护送周平王东迁，天子封我为诸侯、赐岐西之地。从那一天起，秦才真正成为「秦国」。",
      img: "assets/rulers/xianggong.png"
    },
    {
      id: "mugong", name: "秦穆公", tag: "称霸之君", era: "公元前 659 年",
      scale: 1.0, crown: "grand", center: true,   // 视觉中心：默认最大 + 预亮光晕
      prop: "sword",
      tone: 1.0,                          // → A3（基音）
      deed: "我做的是……不拘一格用贤才，五张羊皮换来百里奚。向东制衡强晋，向西讨伐戎狄——益国十二，开地千里。秦，第一次有了霸主的样子。",
      img: "assets/rulers/mugong.png"
    },
    {
      id: "kanggong", name: "秦康公", tag: "守成之君", era: "公元前 621 年",
      scale: 0.92, crown: "grand",
      prop: "ge",
      tone: 0.891,                        // → G3
      deed: "我做的是……接下先君留下的霸业，与强晋连年争锋、寸土不让。守业这件事，从来不比创业轻松。",
      img: "assets/rulers/kanggong.png"
    },
    {
      id: "gonggong", name: "秦共公", tag: "继志之君", era: "公元前 608 年",
      scale: 0.88, crown: "grand",
      prop: "scroll",
      tone: 0.794,                        // → F3
      deed: "我做的是……在诸侯环伺的岁月里稳住阵脚，守住穆公以来打下的基业，把这一手牌，完好地交到后来人的手上。",
      img: "assets/rulers/gonggong.png"
    }
  ],
  ending: {
    big: "所以这一次，你不是一个人<br>你是<em>他们五个</em>",
    sub: "五个名字 · 一条血脉 · 五百年蓄力<br>你这一课所见的一切，是秦国五世之功"
  }
};

/* ═══════════ 剪影 SVG 生成（占位立绘，可整段替换为切图）═══════════
   每位君主一个背影剪影 + 专属道具，暗示身份；
   正式立绘到位后：卡片里 r.img 有值 → 自动用 <img> 替换。        */
function silhouetteSVG(r) {
  // 道具（金色细线，随身份变化）
  const props = {
    whip:   `<path d="M136 250 Q170 220 168 178" stroke="var(--gold)" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".8"/>
             <circle cx="168" cy="174" r="4" fill="var(--gold)" opacity=".85"/>`,
    banner: `<line x1="146" y1="258" x2="146" y2="88" stroke="var(--gold)" stroke-width="3.5" opacity=".85"/>
             <path d="M146 92 q26 8 34 2 l-4 22 q-16 6 -30 -2 z" fill="var(--red)" opacity=".85"/>`,
    sword:  `<line x1="150" y1="240" x2="158" y2="140" stroke="var(--gold)" stroke-width="4" opacity=".9"/>
             <line x1="150" y1="252" x2="168" y2="248" stroke="var(--gold)" stroke-width="4" opacity=".9"/>`,
    ge:     `<line x1="52" y1="252" x2="40" y2="128" stroke="var(--gold)" stroke-width="3.5" opacity=".85"/>
             <path d="M40 128 l16 -10 l2 18 z" fill="var(--gold)" opacity=".9"/>`,
    scroll: `<rect x="86" y="236" width="34" height="10" rx="2" transform="rotate(-8 103 241)" fill="var(--gold)" opacity=".85"/>
             <rect x="90" y="250" width="34" height="10" rx="2" transform="rotate(-2 107 255)" fill="var(--gold)" opacity=".6"/>`
  };
  // 冠（三种形制）
  const crowns = {
    flat:  `<path d="M82 34 h40 v-12 q-20 -8 -40 0 z" fill="#1c1917" stroke="rgba(212,162,78,.55)" stroke-width="2"/>`,
    tall:  `<path d="M84 36 h36 v-20 l-18 -9 l-18 9 z" fill="#1c1917" stroke="rgba(212,162,78,.55)" stroke-width="2"/>`,
    grand: `<path d="M80 36 h44 v-10 h-8 v-8 h-6 v8 h-8 v-8 h-6 v8 h-8 v-8 h-6 v8 h-8 v10 z" fill="#1c1917" stroke="rgba(212,162,78,.6)" stroke-width="2"/>`
  };
  const H = 320, W = 200;
  return `
  <svg class="portrait" viewBox="0 0 ${W} ${H}" style="height:calc(clamp(180px,36vh,300px) * ${r.scale});" aria-label="${r.name}立绘占位">
    <defs>
      <linearGradient id="robe-${r.id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3a332c"/><stop offset="1" stop-color="#141110"/>
      </linearGradient>
    </defs>
    ${props[r.prop] || ""}
    <g>
      ${crowns[r.crown] || crowns.grand}
      <circle cx="102" cy="62" r="21" fill="#100e0c"/>
      <path d="M104 84
               C 128 86 142 98 146 118
               L 158 262 Q 160 286 140 292
               L 128 296 L 128 306 L 76 306 L 76 296 L 64 292
               Q 44 286 46 262 L 58 118
               C 62 98 78 86 104 84 Z"
            fill="url(#robe-${r.id})" stroke="rgba(212,162,78,.45)" stroke-width="2"/>
      <line x1="70" y1="150" x2="134" y2="150" stroke="rgba(212,162,78,.5)" stroke-width="2.5"/>
      <circle cx="102" cy="150" r="4.5" fill="var(--gold)" opacity=".9"/>
      <path d="M58 118 Q 40 170 46 210 L 66 204 Z" fill="url(#robe-${r.id})" stroke="rgba(212,162,78,.35)" stroke-width="1.5"/>
      <path d="M146 118 Q 164 170 158 210 L 138 204 Z" fill="url(#robe-${r.id})" stroke="rgba(212,162,78,.35)" stroke-width="1.5"/>
    </g>
  </svg>`;
}

/* ═══════════ 渲染器（剧本引擎节点逻辑）═══════════ */
const $ = (s) => document.querySelector(s);
const stage = $("#mainStage"), osStage = $("#osStage");
const rulersBox = $("#rulers"), dotsBox = $("#dots");
const deedText = $("#deedText"), deedEyebrow = $("#deedEyebrow");
const heard = new Set();
let voiceOn = true, voiceError = false;

/* ═══════════ 独立 SVG 装饰层（不烘焙进切图）═══════════
   可选机制：君主 JSON 加 deco: "banner" 即挂载对应装饰，
   当前未启用（立绘已自带冠饰与旗以外的细节）。 */
const DECOS = {
  banner: `<svg class="deco deco-banner" viewBox="0 0 44 190" aria-hidden="true">
    <line x1="8" y1="186" x2="8" y2="6" stroke="var(--gold)" stroke-width="3" opacity=".85"/>
    <circle cx="8" cy="5" r="3" fill="var(--gold)" opacity=".9"/>
    <path d="M10 12 q30 11 30 3 l-4 40 q-16 9 -26 1 z" fill="var(--red)" opacity=".85"
          stroke="rgba(212,162,78,.4)" stroke-width="1.5"/>
  </svg>`,
};

function renderRulers() {
  rulersBox.innerHTML = "";
  dotsBox.innerHTML = "";
  SCENE.rulers.forEach((r, i) => {
    const card = document.createElement("div");
    card.className = "ruler-card" + (r.center ? " center" : "");
    card.dataset.id = r.id;
    card.innerHTML = `
      <div class="portrait-wrap">
        <div class="halo"></div>
        ${r.img
          ? `<img class="portrait" src="${r.img}" alt="${r.name}" style="height:calc(clamp(180px,36vh,300px) * ${r.scale});" />`
          : silhouetteSVG(r)}
        ${DECOS[r.deco] || ""}
      </div>
      <div class="pedestal"></div>
      <div class="nameplate">
        <span class="r-tag">${r.tag}</span>
        <span class="r-name">${r.name}</span>
        <span class="r-era">${r.era}</span>
      </div>`;
    if (r.img) {   // 切图加载失败（离线等）→ 自动回退到剪影占位
      const im = card.querySelector("img.portrait");
      im.addEventListener("error", () => { im.outerHTML = silhouetteSVG(r); }, { once: true });
    }
    card.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") activate(card, r); });
    card.addEventListener("click", () => activate(card, r));   // 触屏点按
    rulersBox.appendChild(card);

    const dot = document.createElement("span");
    dot.className = "dot"; dot.dataset.id = r.id;
    dotsBox.appendChild(dot);
  });
}

/* 鼠标离开立绘区 → 恢复初始引导状态（已听进度保留） */
rulersBox.addEventListener("pointerleave", (e) => {
  if (e.pointerType === "touch") return;
  rulersBox.classList.remove("has-active");
  rulersBox.querySelectorAll(".ruler-card").forEach(c => c.classList.remove("active"));
  deedEyebrow.classList.remove("show");
  deedEyebrow.textContent = "我 做 的 是 ——";
  deedText.innerHTML = `<span class="deed-default">${SCENE.hint}</span>`;
});

function activate(card, r) {
  playTone(r);                              // 选中即鸣钟（音高随君主）
  rulersBox.classList.add("has-active");
  rulersBox.querySelectorAll(".ruler-card").forEach(c => c.classList.toggle("active", c === card));
  deedEyebrow.classList.add("show");
  deedEyebrow.textContent = `${r.tag} · ${r.name} 说 ————`;
  deedText.classList.add("swap");
  setTimeout(() => {
    deedText.classList.remove("swap");
    deedText.innerHTML = `<span class="quote">「</span>${r.deed.replace("我做的是……", "<b style='color:var(--gold-2)'>我做的是……</b>")}<span class="quote">」</span>`;
  }, 180);

  if (!heard.has(r.id)) {
    heard.add(r.id);
    dotsBox.querySelector(`[data-id="${r.id}"]`)?.classList.add("lit");
    if (heard.size === SCENE.rulers.length) setTimeout(showEnding, 1100);
  }
  if (voiceOn) speak(r.deed);
}

/* 语音朗读（Web Speech API，零依赖），朗读时自动压低背景音 */
function speak(text) {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    voiceError = true;
    updateVoiceBtn();
    console.error("Speech synthesis is not available in this browser.");
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/……/g, "，"));
  u.lang = "zh-CN"; u.rate = 0.92; u.pitch = 0.9;
  const chineseVoice = window.speechSynthesis.getVoices()
    .find(v => /^zh([_-]|$)/i.test(v.lang));
  if (chineseVoice) u.voice = chineseVoice;
  if (bgmStarted && bgmOn) rampTo(0.08);
  u.onstart = () => {
    voiceError = false;
    updateVoiceBtn();
  };
  u.onend = () => { if (bgmOn) rampTo(bgmTarget); };
  u.onerror = (event) => {
    if (bgmOn) rampTo(bgmTarget);
    if (event.error === "canceled" || event.error === "interrupted") return;
    voiceError = true;
    updateVoiceBtn();
    console.error("Speech synthesis failed:", event.error);
  };
  window.speechSynthesis.speak(u);
}

/* ── 背景音：原创合成氛围音（tools/make-ambience.js 生成）────────
   移动端适配要点：
   1. 浏览器规定音频必须在真实用户手势内启动 —— 监听 touchend /
      pointerdown / click 三种手势，首次触发即解锁并淡入；
   2. iOS Safari 的 audio.volume 属性无效（恒为 1）—— 因此统一改用
      AudioContext + GainNode 控制音量，淡入淡出/压低全平台有效；
   3. AudioContext 被来电/锁屏挂起后，在后续手势里自动 resume。 */
const bgm = new Audio(SCENE.bgm);
bgm.loop = true; bgm.preload = "auto";
let bgmOn = true, bgmStarted = false;
const bgmTarget = SCENE.bgmVolume;
let audioCtx = null, bgmGain = null, webAudioMode = false;
let bgmRamp = null, bgmPlayPending = false, bgmError = null;

function initAudioGraph() {
  if (audioCtx) {
    return audioCtx.state === "suspended" ? audioCtx.resume() : Promise.resolve();
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return Promise.resolve();
  try {
    audioCtx = new AC();
    bgmGain = audioCtx.createGain();
    bgmGain.gain.value = 0;
    audioCtx.createMediaElementSource(bgm).connect(bgmGain);
    bgmGain.connect(audioCtx.destination);
    webAudioMode = true;
    return audioCtx.state === "suspended" ? audioCtx.resume() : Promise.resolve();
  } catch (error) {
    webAudioMode = false;
    console.warn("Web Audio setup failed; falling back to media-element volume.", error);
    return Promise.resolve();
  }
}

function rampTo(target) {
  clearInterval(bgmRamp);
  if (webAudioMode && bgmGain && audioCtx) {
    bgmGain.gain.cancelScheduledValues(audioCtx.currentTime);
    bgmGain.gain.setTargetAtTime(target, audioCtx.currentTime, 0.25);
    return;
  }
  bgmRamp = setInterval(() => {           // 降级路径：volume 渐变
    const d = target - bgm.volume;
    if (Math.abs(d) <= 0.02) { bgm.volume = target; clearInterval(bgmRamp); return; }
    bgm.volume = Math.max(0, Math.min(1, bgm.volume + Math.sign(d) * 0.02));
  }, 60);
}

let ttsUnlocked = false;
/* iOS 的 Web Speech 有个坑：若从未在真实用户手势里 speak() 过，
   之后所有朗读请求都会被静默忽略 —— 用零音量空串在首次手势里解锁 */
function unlockTTS() {
  if (ttsUnlocked || !("speechSynthesis" in window)) return;
  ttsUnlocked = true;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0; u.lang = "zh-CN";
    speechSynthesis.speak(u);
  } catch (_) {}
}

function markStarted() {
  if (bgmStarted) return;
  bgmStarted = true;
  bgmError = null;
  rampTo(bgmOn ? bgmTarget : 0);
  updateBgmBtn();
}

function startBGM() {
  const resumePromise = initAudioGraph();
  unlockTTS();                    // iOS TTS 手势解锁
  if (!bgmOn || bgmStarted || bgmPlayPending) return;
  bgmError = null;
  bgmPlayPending = true;
  let playPromise;
  try {
    playPromise = bgm.play();
  } catch (error) {
    bgmPlayPending = false;
    bgmError = error;
    updateBgmBtn();
    console.error("Background music could not be played:", error);
    return;
  }
  Promise.all([Promise.resolve(playPromise), Promise.resolve(resumePromise)])
    .then(markStarted)
    .catch((error) => {
      bgmStarted = false;
      bgmError = error;
      updateBgmBtn();
      console.error("Background music could not be started:", error);
    })
    .finally(() => { bgmPlayPending = false; });
}
/* 四种手势都挂上：iOS 用 touchend 最可靠，微信 X5 内核偏好 touchstart，
   桌面端 pointerdown/click 兜底 */
["touchstart", "touchend", "pointerdown", "click"].forEach(evt =>
  window.addEventListener(evt, startBGM, { passive: true }));

function updateBgmBtn() {
  $("#bgmIcon").textContent = bgmError && bgmOn ? "⚠️" : (bgmOn ? "🎵" : "🔇");
  $("#bgmText").textContent = bgmError && bgmOn ? "音乐 重试" : (bgmOn ? "音乐 开" : "音乐 关");
  $("#bgmBtn").classList.toggle("on", bgmOn);
  $("#bgmBtn").title = bgmError && bgmOn ? "背景音乐播放失败，点击重试" : "开启/关闭背景音乐";
}
$("#bgmBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  bgmOn = !bgmOn;
  if (bgmOn) { startBGM(); if (bgmStarted) rampTo(bgmTarget); }
  else { rampTo(0); window.speechSynthesis?.cancel(); if (voiceOn) $("#voiceBtn").click(); }
  updateBgmBtn();
});

/* ── 选中音效：编钟一声，音高随君主变调（D 羽调五声音阶）── */
const sfx = new Audio(SCENE.sfx);
sfx.preload = "auto";
let sfxGain = null;
function playTone(r) {
  try {
    sfx.currentTime = 0;
    sfx.playbackRate = r.tone || 1;         // 一个音频文件变调出五个音
    if (webAudioMode && audioCtx && !sfxGain) {
      sfxGain = audioCtx.createGain();
      sfxGain.gain.value = 0.15;             // 选中音效音量（0~1，iOS 上 volume 无效，必须走 GainNode）
      audioCtx.createMediaElementSource(sfx).connect(sfxGain);
      sfxGain.connect(audioCtx.destination);
    }
    const p = sfx.play();
    if (p && p.catch) p.catch(error => console.warn("Selection sound could not be played:", error));
  } catch (error) {
    console.error("Selection sound could not be played:", error);
  }
}
updateBgmBtn();
function updateVoiceBtn() {
  $("#voiceIcon").textContent = voiceError && voiceOn ? "⚠️" : (voiceOn ? "🔊" : "🔇");
  $("#voiceText").textContent = voiceError && voiceOn ? "语音不可用" : (voiceOn ? "语音 开" : "语音 关");
  $("#voiceBtn").classList.toggle("on", voiceOn);
  $("#voiceBtn").title = voiceError && voiceOn ? "当前浏览器无法播放语音" : "开启/关闭语音朗读";
}
updateVoiceBtn();
$("#voiceBtn").addEventListener("click", () => {
  unlockTTS();                      // 语音开关本身就是手势，顺手完成 iOS TTS 解锁
  voiceOn = !voiceOn;
  voiceError = false;
  updateVoiceBtn();
  if (!voiceOn) window.speechSynthesis?.cancel();
});

/* 终幕字幕 */
function showEnding() {
  $("#ending .big-line").innerHTML = SCENE.ending.big;
  $("#ending .sub-line").innerHTML = SCENE.ending.sub;
  $("#ending").classList.add("show");
}
$("#closeEnding").addEventListener("click", () => $("#ending").classList.remove("show"));

/* 内心 OS 打字机 → 五君登场 */
function typeOS() {
  const text = SCENE.os, el = $("#osText");
  el.textContent = "";
  let i = 0;
  const timer = setInterval(() => {
    el.textContent = text.slice(0, ++i);
    if (i >= text.length) {
      clearInterval(timer);
      setTimeout(reveal, 1500);   // OS 收尾后停顿，再揭示
    }
  }, 110);
}
function reveal() {
  osStage.classList.add("gone");
  setTimeout(() => {
    stage.classList.add("on");
    /* 入场动画期间禁用卡片过渡（末张延迟 1.35s + 0.9s 动画 = 2.25s），
       防止 transition 与 rise 抢 transform；结束后恢复，悬浮放大才生效 */
    rulersBox.classList.add("entering");
    setTimeout(() => rulersBox.classList.remove("entering"), 2500);
  }, 500);
}

/* 重看 */
$("#replayBtn").addEventListener("click", () => {
  window.speechSynthesis?.cancel();
  stage.classList.remove("on");
  osStage.classList.remove("gone");
  $("#ending").classList.remove("show");
  rulersBox.classList.remove("has-active");
  rulersBox.querySelectorAll(".ruler-card").forEach(c => c.classList.remove("active"));
  heard.clear();
  dotsBox.querySelectorAll(".dot").forEach(d => d.classList.remove("lit"));
  deedEyebrow.classList.remove("show");
  deedText.innerHTML = `<span class="deed-default">${SCENE.hint}</span>`;
  setTimeout(typeOS, 600);
});

/* ── 功绩面板高度自适应 ──
   以「最长独白」为基准预留面板高度：否则选中文字最长的君主时
   面板被撑高 → 立绘区(flex:1)被压缩 → 人物与独白整体上移，
   移开又回落。用离屏探针量出五段文案的最大高度，锁定 min-height，
   之后任何选择都不会再改变布局。 */
function fitDeedBox() {
  const box = $(".deed-box"), eyebrow = $(".deed-eyebrow");
  if (!box) return;
  const measure = () => {
    const probe = document.createElement("div");
    probe.className = "deed-text";
    probe.style.cssText = "position:absolute;left:-99999px;top:0;visibility:hidden;";
    document.body.appendChild(probe);
    probe.style.width = box.clientWidth + "px";       // 与真实面板同宽
    let maxH = 0;
    SCENE.rulers.forEach(r => {
      probe.innerHTML = `<span class="quote">「</span>${r.deed}<span class="quote">」</span>`;
      maxH = Math.max(maxH, probe.offsetHeight);
    });
    probe.remove();
    const extra = (eyebrow ? eyebrow.offsetHeight : 0) + 18;   // gap + 余量
    box.style.minHeight = Math.ceil(Math.max(118, maxH + extra)) + "px";
  };
  measure();
  window.addEventListener("resize", measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);  // 字体分包加载完再校准
}

renderRulers();
fitDeedBox();
typeOS();
