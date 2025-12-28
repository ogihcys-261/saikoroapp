// ---- 表示は出目だけ。説明文は一切出さない ----

// 通常時の「とんでも」確率
const WEIRD_RATE_BASE = 0.05;

// 5の倍数のときの「とんでも」確率
const WEIRD_RATE_MULTIPLE_OF_5 = 0.80;

// とんでも当選 → 20% ふつうっぽい / 80% とんでも枠
const WEIRD_FAKE_NORMAL_RATE = 0.20;

// とんでも枠の内訳
const W_FORTUNE = 0.55;  // 運勢（大吉/大凶/凶など）
const W_HUGE    = 0.45;  // 超巨大数（演出なし）

// 「15回目くらいで必ず爆発」：14〜16回目
const BOOM_MIN = 14;
const BOOM_MAX = 16;

// 爆発後に戻るまで
const BOOM_RETURN_MS = 1000;

// 大吉/大凶の画面演出長
const LUX_MS = 1550;
const LUXWHITE_MS = 550;
const SAD_MS = 1350;

const wrap  = document.getElementById("wrap");
const panel = document.getElementById("panel");
const flash = document.getElementById("flash");
const faceEl = document.getElementById("face");
const facesInput = document.getElementById("faces");
const rollBtn = document.getElementById("roll");

let rollCount = 0;
let isBusy = false;
let boomAt = randInt(BOOM_MIN, BOOM_MAX);

// 全画面エフェクト要素
const fxLux = document.createElement("div");
fxLux.className = "fx-lux";
document.body.appendChild(fxLux);

const fxLuxWhite = document.createElement("div");
fxLuxWhite.className = "fx-luxwhite";
document.body.appendChild(fxLuxWhite);

const fxSad = document.createElement("div");
fxSad.className = "fx-sad";
document.body.appendChild(fxSad);

const fxBoom = document.createElement("div");
fxBoom.className = "fx-boom";
document.body.appendChild(fxBoom);

const shock = document.createElement("div");
shock.className = "shockwave";
document.body.appendChild(shock);

// 大吉用の光輪（panel内）
const halo = document.createElement("div");
halo.className = "halo";
panel.appendChild(halo);

function setBusy(v) {
  isBusy = v;
  rollBtn.disabled = v;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollNormalDice(faces) {
  return randInt(1, faces);
}

function currentWeirdRate() {
  if (rollCount > 0 && rollCount % 5 === 0) return WEIRD_RATE_MULTIPLE_OF_5;
  return WEIRD_RATE_BASE;
}

// 超巨大数（演出なし）
function rollHugeNumber() {
  const digits = randInt(4, 11);
  const base = Math.pow(10, digits - 1);
  const n = base + randInt(0, base * 9);

  if (Math.random() < 0.06) return 99999999;
  if (Math.random() < 0.03) return 1000000000;
  return n;
}

// 運勢（増量）
function rollFortune() {
  const bag = [
    { v: "大吉", w: 16 },
    { v: "超大吉", w: 8 },
    { v: "神吉", w: 4 },

    { v: "大凶", w: 16 },
    { v: "凶", w: 12 },

    { v: "中吉", w: 10 },
    { v: "小吉", w: 8 },
    { v: "吉", w: 7 },
    { v: "末吉", w: 6 },

    { v: "半吉", w: 5 },
    { v: "微妙", w: 4 },
    { v: "よくない", w: 3 },
    { v: "無", w: 2 }
  ];

  const total = bag.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const it of bag) {
    r -= it.w;
    if (r <= 0) return it.v;
  }
  return "吉";
}

function rollWeirdOutcome(faces) {
  if (Math.random() < WEIRD_FAKE_NORMAL_RATE) {
    return { value: randInt(1, faces), kind: "fake-normal" };
  }

  if (Math.random() < W_FORTUNE) {
    return { value: rollFortune(), kind: "fortune" };
  }
  return { value: rollHugeNumber(), kind: "huge" };
}

function rollDice(faces) {
  if (rollCount === boomAt) {
    return { value: "💥", dice: "boom", kind: "boom" };
  }

  if (Math.random() < currentWeirdRate()) {
    const w = rollWeirdOutcome(faces);
    return { ...w, dice: "weird" };
  }

  return { value: rollNormalDice(faces), dice: "normal", kind: "normal" };
}

// --- フォント自動縮小 ---
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

// --- 音 ---
// 大吉系統：さらに“うれしくなる”和音（豪華）
function playLuckySoundMoreHappy() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.connect(ctx.destination);

    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const o3 = ctx.createOscillator();
    const o4 = ctx.createOscillator();

    o1.type = "sine";
    o2.type = "triangle";
    o3.type = "sine";
    o4.type = "sine";

    // C - E - G + 高いC（厚み）
    o1.frequency.value = 523.25; // C5
    o2.frequency.value = 659.25; // E5
    o3.frequency.value = 783.99; // G5
    o4.frequency.value = 1046.50; // C6

    o1.connect(g); o2.connect(g); o3.connect(g); o4.connect(g);

    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.70);

    o1.start(t); o2.start(t); o3.start(t); o4.start(t);
    o1.stop(t + 0.78); o2.stop(t + 0.78); o3.stop(t + 0.78); o4.stop(t + 0.78);

    setTimeout(() => ctx.close(), 1200);
  } catch (_) {}
}

// 大凶：悲しい音
function playSadSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = "triangle";
    o.frequency.value = 220;

    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);

    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.02);
    o.frequency.exponentialRampToValueAtTime(130, t + 0.32);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.40);

    o.start(t);
    o.stop(t + 0.42);
    setTimeout(() => ctx.close(), 650);
  } catch (_) {}
}

// 爆発：さらに派手
function playBoomSoundBigger() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.connect(ctx.destination);

    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = "sawtooth";
    o2.type = "square";

    o1.frequency.value = 140;
    o2.frequency.value = 50;

    o1.connect(g);
    o2.connect(g);

    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.38, t + 0.02);
    o1.frequency.exponentialRampToValueAtTime(40, t + 0.24);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.52);

    o1.start(t);
    o2.start(t);
    o1.stop(t + 0.53);
    o2.stop(t + 0.53);

    setTimeout(() => ctx.close(), 1000);
  } catch (_) {}
}

// --- 粒 ---
function spawnParticles(count = 18, spread = 260, height = 170) {
  const rect = panel.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "particle";

    const x0 = cx + randInt(-12, 12);
    const y0 = cy + randInt(-12, 12);
    const x1 = cx + randInt(-spread, spread);
    const y1 = cy + randInt(-height, height);

    p.style.setProperty("--x0", `${x0}px`);
    p.style.setProperty("--y0", `${y0}px`);
    p.style.setProperty("--x1", `${x1}px`);
    p.style.setProperty("--y1", `${y1}px`);

    panel.appendChild(p);
    p.addEventListener("animationend", () => p.remove());
  }
}

// --- 表示/演出 ---
function clearEffects() {
  panel.classList.remove("shake");
  panel.classList.remove("shake-weird");
  wrap.classList.remove("boom");
  flash.classList.remove("on");

  wrap.classList.remove("sad-ui");

  fxLux.classList.remove("on");
  fxLuxWhite.classList.remove("on");
  fxSad.classList.remove("on");
  fxBoom.classList.remove("on");
  shock.classList.remove("on");

  wrap.classList.remove("lucky");
  halo.classList.remove("on");
  halo.style.left = "50%";
  halo.style.top = "50%";
}

function setFace(value) {
  faceEl.textContent = value;
  fitText();
}

function resetCycleAfterBoom() {
  rollCount = 0;
  boomAt = randInt(BOOM_MIN, BOOM_MAX);
}

// 大吉：まぶしい + キラキラ物量（両方）
function triggerLuxUltraCombo() {
  setBusy(true);

  wrap.classList.add("lucky");

  // まぶしい（ホワイトアウト）→ すぐ豪華背景
  fxLuxWhite.classList.add("on");
  fxLux.classList.add("on");

  // 光輪（panel中心）
  halo.style.left = "50%";
  halo.style.top = "50%";
  halo.classList.add("on");

  // 物量（紙吹雪2段 + さらに追加）
  spawnParticles(160, 420, 260);
  spawnParticles(130, 400, 240);
  spawnParticles(90, 360, 220);

  // フラッシュ + 強め揺れ
  flash.classList.add("on");
  panel.classList.add("shake-weird");

  // 解除
  setTimeout(() => fxLuxWhite.classList.remove("on"), LUXWHITE_MS);
  setTimeout(() => {
    fxLux.classList.remove("on");
    halo.classList.remove("on");
  }, LUX_MS);

  setTimeout(() => {
    panel.classList.remove("shake-weird");
    flash.classList.remove("on");
    setBusy(false);
  }, Math.max(LUX_MS, 600));
}

function triggerSad() {
  setBusy(true);
  wrap.classList.add("sad-ui");
  fxSad.classList.add("on");

  setTimeout(() => {
    fxSad.classList.remove("on");
    wrap.classList.remove("sad-ui");
    setBusy(false);
  }, SAD_MS);
}

function triggerBoomUltra(faces) {
  setBusy(true);

  wrap.classList.add("boom");
  fxBoom.classList.add("on");
  shock.classList.add("on");

  // 爆発粒：超大量＆遠くへ
  spawnParticles(160, 460, 300);
  spawnParticles(140, 460, 300);

  playBoomSoundBigger();

  // 追いフラッシュ
  setTimeout(() => flash.classList.add("on"), 70);
  setTimeout(() => flash.classList.remove("on"), 520);

  // 「何事もなかった」復帰
  setTimeout(() => {
    clearEffects();
    setFace(rollNormalDice(faces));
    resetCycleAfterBoom();
    setBusy(false);
  }, BOOM_RETURN_MS);
}

rollBtn.addEventListener("click", () => {
  if (isBusy) return;

  clearEffects();

  const faces = Math.max(1, Number(facesInput.value) || 1);

  rollCount += 1;
  const res = rollDice(faces);

  // 普通の手触りは毎回
  panel.classList.add("shake");
  setTimeout(() => panel.classList.remove("shake"), 240);

  setFace(res.value);

  // 爆発：最強（ここでもボタン無効）
  if (res.dice === "boom") {
    triggerBoomUltra(faces);
    return;
  }

  // とんでも：超巨大数は演出なし（ボタンも止めない）
  if (res.dice === "weird" && res.kind === "fortune") {
    const vStr = String(res.value);

    // 大吉系統は“豪華に”
    if (vStr.includes("大吉") || vStr.includes("神吉")) {
      playLuckySoundMoreHappy();
      triggerLuxUltraCombo();
      return;
    }

    // 大凶は悲しい（演出中は押せない）
    if (vStr.includes("大凶")) {
      playSadSound();
      triggerSad();
      return;
    }

    // 凶は軽めに暗い（ここは押せない時間短めにする）
    if (vStr.includes("凶")) {
      playSadSound();
      setBusy(true);
      wrap.classList.add("sad-ui");
      setTimeout(() => {
        wrap.classList.remove("sad-ui");
        setBusy(false);
      }, 700);
      return;
    }
  }

  // ちょい拡大
  faceEl.style.transform = "scale(1.03)";
  setTimeout(() => (faceEl.style.transform = "scale(1)"), 120);
});

// 初期フィット
fitText();
window.addEventListener("resize", fitText);
