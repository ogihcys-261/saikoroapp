// ---- 表示は出目だけ。説明文は一切出さない ----

// 通常時の「とんでも」確率
const WEIRD_RATE_BASE = 0.05;

// 5の倍数のときの「とんでも」確率（前の仕様を維持）
const WEIRD_RATE_MULTIPLE_OF_5 = 0.80;

// とんでもの中身：
//  - 「とんでも枠」を増やす
//  - ただし「とんでも巨大数」は演出なしにしたいので種類分けする
//
// 構成：
//  とんでも当選 →
//    20% ふつうっぽい（1..N）
//    80% とんでも枠（運勢/巨大数）
const WEIRD_FAKE_NORMAL_RATE = 0.20;

// とんでも枠（80%の中）の内訳（合計1.0）
const W_FORTUNE = 0.55;  // 運勢系（大吉/大凶/凶など）
const W_HUGE    = 0.45;  // 超巨大数

// 「15回目くらいで必ず爆発」：14〜16回目のどれかで必ず💥
const BOOM_MIN = 14;
const BOOM_MAX = 16;

// 爆発後に何事もなかったように戻すまでの時間
const BOOM_RETURN_MS = 700;

// 大吉/大凶の画面演出の長さ
const LUX_MS = 1050;
const SAD_MS = 1250;

const wrap  = document.getElementById("wrap");
const panel = document.getElementById("panel");
const flash = document.getElementById("flash");
const faceEl = document.getElementById("face");
const facesInput = document.getElementById("faces");
const rollBtn = document.getElementById("roll");

let rollCount = 0;
let isBusy = false;
let boomAt = randInt(BOOM_MIN, BOOM_MAX);

// 画面全体エフェクト要素を追加（UIには説明表示しない）
const fxLux = document.createElement("div");
fxLux.className = "fx-lux";
document.body.appendChild(fxLux);

const fxSad = document.createElement("div");
fxSad.className = "fx-sad";
document.body.appendChild(fxSad);

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollNormalDice(faces) {
  return randInt(1, faces);
}

function currentWeirdRate() {
  if (rollCount > 0 && rollCount % 5 === 0) return WEIRD_RATE_MULTIPLE_OF_5;
  return WEIRD_RATE_BASE;
}

// 超巨大数（演出いらないやつ）
function rollHugeNumber() {
  // “とんでもない感”を出すため、桁をランダムにする
  // 例：10^4〜10^11付近 + ちょいノイズ
  const digits = randInt(4, 11);               // 4桁〜11桁
  const base = Math.pow(10, digits - 1);       // 最上位桁の基準
  const n = base + randInt(0, base * 9);       // その桁数の範囲
  // たまに極端な固定ネタ
  if (Math.random() < 0.06) return 99999999;
  if (Math.random() < 0.03) return 1000000000;
  return n;
}

// 運勢（大吉/大凶/凶などを増やす）
function rollFortune() {
  // 重み付き（合計100）
  const bag = [
    { v: "大吉", w: 14 },
    { v: "超大吉", w: 6 },
    { v: "神吉", w: 3 },

    { v: "大凶", w: 14 },
    { v: "凶", w: 12 },

    { v: "中吉", w: 12 },
    { v: "小吉", w: 10 },
    { v: "吉", w: 9 },
    { v: "末吉", w: 8 },

    { v: "半吉", w: 6 },
    { v: "微妙", w: 3 },
    { v: "よくない", w: 3 }
  ];

  const total = bag.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const it of bag) {
    r -= it.w;
    if (r <= 0) return it.v;
  }
  return "吉";
}

// とんでもの中身
function rollWeirdOutcome(faces) {
  // まず「普通っぽい」か「とんでも枠」か
  if (Math.random() < WEIRD_FAKE_NORMAL_RATE) {
    return { value: randInt(1, faces), kind: "fake-normal" };
  }

  // とんでも枠：運勢 or 超巨大数
  if (Math.random() < W_FORTUNE) {
    const f = rollFortune();
    return { value: f, kind: "fortune" };
  } else {
    return { value: rollHugeNumber(), kind: "huge" };
  }
}

// 最上位のロール
function rollDice(faces) {
  // 14〜16回目のどこかで必ず爆発
  if (rollCount === boomAt) {
    return { value: "💥", dice: "boom", kind: "boom" };
  }

  // とんでも抽選
  if (Math.random() < currentWeirdRate()) {
    const w = rollWeirdOutcome(faces);
    return { ...w, dice: "weird" };
  }

  return { value: rollNormalDice(faces), dice: "normal", kind: "normal" };
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

// --- 音 ---
// 大吉は“気のせい感”の控えめ
function playLuckySoundSubtle() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = "sine";
    o.frequency.value = 880;

    g.gain.value = 0.00001;
    o.connect(g);
    g.connect(ctx.destination);

    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.00001, t);
    g.gain.exponentialRampToValueAtTime(0.02, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.00001, t + 0.11);

    o.start(t);
    o.stop(t + 0.12);
    setTimeout(() => ctx.close(), 220);
  } catch (_) {}
}

// 大凶：暗い音（短く）
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
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.22);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

    o.start(t);
    o.stop(t + 0.29);
    setTimeout(() => ctx.close(), 450);
  } catch (_) {}
}

// 爆発音
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
    g.gain.exponentialRampToValueAtTime(0.30, t + 0.02);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.22);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.30);

    o.start(t); n.start(t);
    o.stop(t + 0.31); n.stop(t + 0.31);

    setTimeout(() => ctx.close(), 500);
  } catch (_) {}
}

// --- 粒 ---
function spawnParticles(count = 18) {
  const rect = panel.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "particle";

    const x0 = cx + randInt(-12, 12);
    const y0 = cy + randInt(-12, 12);

    const x1 = cx + randInt(-260, 260);
    const y1 = cy + randInt(-170, 170);

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
  fxSad.classList.remove("on");
}

function setFace(value) {
  faceEl.textContent = value;
  fitText();
}

function resetCycleAfterBoom() {
  // 何事もなかった顔に戻すため、回数と爆発タイミングをリセット
  rollCount = 0;
  boomAt = randInt(BOOM_MIN, BOOM_MAX);
}

function triggerLux() {
  fxLux.classList.add("on");
  // ゴージャスは粒も多め
  spawnParticles(46);
  setTimeout(() => fxLux.classList.remove("on"), LUX_MS);
}

function triggerSad() {
  wrap.classList.add("sad-ui");
  fxSad.classList.add("on");
  setTimeout(() => {
    fxSad.classList.remove("on");
    wrap.classList.remove("sad-ui");
  }, SAD_MS);
}

rollBtn.addEventListener("click", () => {
  if (isBusy) return;

  clearEffects();

  const faces = Math.max(1, Number(facesInput.value) || 1);

  // 回数カウント
  rollCount += 1;

  const res = rollDice(faces);

  // 普通サイコロっぽい揺れは毎回入れる
  panel.classList.add("shake");
  setTimeout(() => panel.classList.remove("shake"), 240);

  // 表示
  setFace(res.value);

  // 爆発：一瞬派手 → すぐ普通に戻す（何事もなかった顔）
  if (res.dice === "boom") {
    isBusy = true;

    wrap.classList.add("boom");
    flash.classList.add("on");
    playBoomSound();
    spawnParticles(26);

    setTimeout(() => {
      clearEffects();
      setFace(rollNormalDice(faces));
      resetCycleAfterBoom();
      isBusy = false;
    }, BOOM_RETURN_MS);

    return;
  }

  // とんでも：ただし「超巨大数」は演出いらない → 何もしない
  if (res.dice === "weird") {
    if (res.kind === "fake-normal") {
      // ふつうっぽい：あえて何もしない（気づきにくく）
    } else if (res.kind === "huge") {
      // 超巨大数：演出なし（指定どおり）
    } else if (res.kind === "fortune") {
      const vStr = String(res.value);

      if (vStr.includes("大吉") || vStr.includes("神吉")) {
        // 大吉：画面全体ゴージャス
        playLuckySoundSubtle();
        flash.classList.add("on");
        panel.classList.add("shake-weird"); // ちょい派手
        triggerLux();
        setTimeout(() => {
          panel.classList.remove("shake-weird");
          flash.classList.remove("on");
        }, 450);
      } else if (vStr.includes("大凶")) {
        // 大凶：悲しい演出
        playSadSound();
        triggerSad();
      } else if (vStr.includes("凶")) {
        // 凶：軽めに暗く（大凶ほどではない）
        playSadSound();
        wrap.classList.add("sad-ui");
        setTimeout(() => wrap.classList.remove("sad-ui"), 650);
      } else {
        // その他運勢：演出なし
      }
    }
  }

  // ちょい拡大
  faceEl.style.transform = "scale(1.03)";
  setTimeout(() => (faceEl.style.transform = "scale(1)"), 120);
});

// 初期フィット
fitText();
window.addEventListener("resize", fitText);
