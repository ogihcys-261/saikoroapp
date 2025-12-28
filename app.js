// --- 確率（好みで調整OK） ---
const NORMAL_RATE = 0.95;      // 95% 普通さいころ
const WEIRD_RATE  = 0.05;      //  5% とんでも（参考：1 - NORMAL_RATE）
const WEIRD_RARE_RATE = 0.20;  // とんでも内で 20% はレア枠
const BOOM_RATE = 0.001;       // 超低確率：0.1%（1/1000） ※全ロール中

// とんでもレア出目
const weirdRareFaces = [
  "大吉", "超大吉", "神吉",
  100, 999, 9999, 1000000, 99999999,
  "∞"
];

const wrap  = document.getElementById("wrap");
const panel = document.getElementById("panel");
const flash = document.getElementById("flash");
const faceEl = document.getElementById("face");
const infoEl = document.getElementById("info");
const facesInput = document.getElementById("faces");
const rollBtn = document.getElementById("roll");

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollNormalDice(faces) {
  return randInt(1, faces);
}

function rollWeirdDice(faces) {
  // とんでも内でもさらに分岐
  if (Math.random() < WEIRD_RARE_RATE) {
    return { value: choice(weirdRareFaces), kind: "rare" };
  }
  return { value: randInt(1, faces), kind: "fake-normal" };
}

function rollDice(faces) {
  // 超低確率の爆発（全ロールに対して）
  if (Math.random() < BOOM_RATE) {
    return { value: "💥", dice: "boom", kind: "boom" };
  }

  // 95% / 5%
  if (Math.random() < NORMAL_RATE) {
    return { value: rollNormalDice(faces), dice: "normal", kind: "normal" };
  } else {
    const w = rollWeirdDice(faces);
    return { ...w, dice: "weird" };
  }
}

// --- フォント自動縮小（巨大数・長い文字対応） ---
function fitText() {
  const MAX = 96;
  const MIN = 28;

  faceEl.style.fontSize = MAX + "px";

  const maxWidth = panel.clientWidth - 32;
  let size = MAX;

  while (
    size > MIN &&
    (faceEl.scrollWidth > maxWidth || faceEl.scrollHeight > panel.clientHeight - 20)
  ) {
    size -= 2;
    faceEl.style.fontSize = size + "px";
  }
}

function playLuckySound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();

    o1.type = "sine";
    o2.type = "triangle";
    o1.frequency.value = 880;
    o2.frequency.value = 1320;

    g.gain.value = 0.0001;
    o1.connect(g); o2.connect(g);
    g.connect(ctx.destination);

    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

    o1.start(t); o2.start(t);
    o1.stop(t + 0.26); o2.stop(t + 0.26);
    setTimeout(() => ctx.close(), 400);
  } catch (_) {}
}

function playBoomSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const n = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = "sawtooth";
    n.type = "square";
    o.frequency.value = 220;
    n.frequency.value = 55;

    g.gain.value = 0.0001;
    o.connect(g); n.connect(g);
    g.connect(ctx.destination);

    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.22);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.30);

    o.start(t); n.start(t);
    o.stop(t + 0.31); n.stop(t + 0.31);
    setTimeout(() => ctx.close(), 500);
  } catch (_) {}
}

function spawnParticles(count = 18) {
  const rect = panel.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "particle";

    const x0 = cx + randInt(-12, 12);
    const y0 = cy + randInt(-12, 12);
    const x1 = cx + randInt(-220, 220);
    const y1 = cy + randInt(-140, 140);

    p.style.setProperty("--x0", `${x0}px`);
    p.style.setProperty("--y0", `${y0}px`);
    p.style.setProperty("--x1", `${x1}px`);
    p.style.setProperty("--y1", `${y1}px`);

    const alpha = 0.6 + Math.random() * 0.4;
    p.style.background = `rgba(255,255,255,${alpha})`;

    panel.appendChild(p);
    p.addEventListener("animationend", () => p.remove());
  }
}

function clearEffects() {
  wrap.classList.remove("lucky");
  panel.classList.remove("shake");
  wrap.classList.remove("boom");
}

function setFace(value) {
  faceEl.textContent = value;
  fitText();
}

rollBtn.addEventListener("click", () => {
  clearEffects();

  const faces = Math.max(1, Number(facesInput.value) || 1);
  const res = rollDice(faces);

  // 揺らす
  panel.classList.add("shake");
  setTimeout(() => panel.classList.remove("shake"), 240);

  // 表示
  setFace(res.value);

  // メッセージ
  if (res.dice === "normal") {
    infoEl.textContent = `普通さいころ（1〜${faces}）`;
  } else if (res.dice === "weird" && res.kind === "fake-normal") {
    infoEl.textContent = `とんでもさいころ（普通っぽい出目）`;
  } else if (res.dice === "weird" && res.kind === "rare") {
    infoEl.textContent = `とんでもさいころ（レア！）`;
  } else if (res.dice === "boom") {
    infoEl.textContent = `爆発（超低確率）`;
  }

  // 大吉演出
  const vStr = String(res.value);
  const isLucky = vStr.includes("大吉") || vStr.includes("神吉");
  if (isLucky) {
    wrap.classList.add("lucky");
    playLuckySound();
    spawnParticles(10);
  }

  // 爆発演出
  if (res.dice === "boom") {
    wrap.classList.add("boom");
    flash.classList.add("on");
    playBoomSound();
    spawnParticles(28);
    setTimeout(() => flash.classList.remove("on"), 380);
  }

  // ちょい拡大
  faceEl.style.transform = "scale(1.03)";
  setTimeout(() => (faceEl.style.transform = "scale(1)"), 120);
});

// 初期フィット
fitText();
window.addEventListener("resize", fitText);
