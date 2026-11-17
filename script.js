/* ═══════════════════════════════════════════════════
   「尾声 · 千载回响」结尾互动 —— 逻辑层
   ─────────────────────────────────────────
   SCENE JSON 是本页唯一数据源（对接剧本引擎的节点配置）
   type: "ruler-reveal" ｜ 改文案只改这里
   img 字段：接入正式切图后，直接填路径即可自动替换剪影
   ═══════════════════════════════════════════════════ */
const SCENE = {
  type: "ruler-reveal",
  os: "所以这一次，我到底是谁呢……",
  stageTitle: "这一次，你听到的声音，来自「五个人」",
  hint: "把光标放到他们身上，听听每个人做了什么",
  rulers: [
    {
      id: "feizi", name: "秦非子", tag: "始封之君", era: "约公元前 890 年",
      scale: 0.66, crown: "flat",
      prop: "whip",
      deed: "我做的是……替周王室养马。马养得又多又壮，孝王便把我封在了「秦」地。那时的秦，还只是西陲一个不起眼的附庸——但「秦」这个名字，是从我这里开始的。",
      img: ""   // 待切图，例如 "assets/rulers/feizi.png"
    },
    {
      id: "xianggong", name: "秦襄公", tag: "立国之君", era: "公元前 771 年",
      scale: 0.76, crown: "tall",
      prop: "banner",
      deed: "我做的是……犬戎攻破镐京、天子蒙难的时候，没有作壁上观。我率兵护送周平王东迁，天子封我为诸侯、赐岐西之地。从那一天起，秦才真正成为「秦国」。",
      img: ""
    },
    {
      id: "mugong", name: "秦穆公", tag: "称霸之君", era: "公元前 659 年",
      scale: 0.9, crown: "grand",
      prop: "sword",
      deed: "我做的是……不拘一格用贤才，五张羊皮换来百里奚。向东制衡强晋，向西讨伐戎狄——益国十二，开地千里。秦，第一次有了霸主的样子。",
      img: ""
    },
    {
      id: "kanggong", name: "秦康公", tag: "守成之君", era: "公元前 621 年",
      scale: 0.84, crown: "grand",
      prop: "ge",
      deed: "我做的是……接下先君留下的霸业，与强晋连年争锋、寸土不让。守业这件事，从来不比创业轻松。",
      img: ""
    },
    {
      id: "gonggong", name: "秦共公", tag: "继志之君", era: "公元前 608 年",
      scale: 0.8, crown: "grand",
      prop: "scroll",
      deed: "我做的是……在诸侯环伺的岁月里稳住阵脚，守住穆公以来打下的基业，把这一手牌，完好地交到后来人的手上。",
      img: ""
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
let voiceOn = false;

function renderRulers() {
  rulersBox.innerHTML = "";
  dotsBox.innerHTML = "";
  SCENE.rulers.forEach((r, i) => {
    const card = document.createElement("div");
    card.className = "ruler-card";
    card.dataset.id = r.id;
    card.innerHTML = `
      <div class="portrait-wrap">
        <div class="halo"></div>
        ${r.img
          ? `<img class="portrait" src="${r.img}" alt="${r.name}" style="height:calc(clamp(180px,36vh,300px) * ${r.scale});" />`
          : silhouetteSVG(r)}
      </div>
      <div class="pedestal"></div>
      <div class="nameplate">
        <span class="r-tag">${r.tag}</span>
        <span class="r-name">${r.name}</span>
        <span class="r-era">${r.era}</span>
      </div>`;
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

/* 语音朗读（Web Speech API，零依赖） */
function speak(text) {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/……/g, "，"));
    u.lang = "zh-CN"; u.rate = 0.92; u.pitch = 0.9;
    speechSynthesis.speak(u);
  } catch (_) {}
}
$("#voiceBtn").addEventListener("click", () => {
  voiceOn = !voiceOn;
  $("#voiceBtn").classList.toggle("on", voiceOn);
  $("#voiceIcon").textContent = voiceOn ? "🔊" : "🔇";
  $("#voiceText").textContent = voiceOn ? "语音 开" : "语音 关";
  if (!voiceOn) speechSynthesis?.cancel();
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
  setTimeout(() => stage.classList.add("on"), 500);
}

/* 重看 */
$("#replayBtn").addEventListener("click", () => {
  speechSynthesis?.cancel();
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

renderRulers();
typeOS();
