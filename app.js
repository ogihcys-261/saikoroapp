// ---- 仕込みロジック（UIには一切出さない） ----

// 通常時の「とんでも」確率（例：5%）
const WEIRD_RATE_BASE = 0.05;

// 5の倍数のときの「とんでも」確率（例：80%）
const WEIRD_RATE_MULTIPLE_OF_5 = 0.80;

// とんでも内でのレア率（大吉・巨大数など）
const WEIRD_RARE_RATE = 0.20;

// 爆発（全ロール中に対して）
const BOOM_RATE = 0.001; // 0.1%（1/1000）お好みで調整

// とんでもレア出目（文字も数字もOK）
const weirdRareFaces = [
  "大吉", "超大吉", "神吉",
  100, 999, 9999, 1000000, 99999999,
  "∞"
];

const wrap  = document.getElementById("wrap");
const panel = document.getElementById("panel");
const flash = document.getElementById("flash");
const faceEl = document.getElementById("face");
const facesInput = document.getElementById("faces");
const rollBtn = document.getElementById("roll");

let rollCount = 0;
let isBusy = false;

// とんでも用の虹フラッシュ要素を追加（UIは変えず内部演出だけ）
const weirdFlashEl = document.createElement("div");
weirdFlashEl.className = "weird-flash";
panel.appendChild(weirdFlashEl);

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- 出目 ---
function rollNormalDice(faces) {
  return randInt(1, faces);
}

function rollWeirdDice(faces) {
  if (Math.random() < WEIRD_RARE_RATE) {
    return { value: choice(weirdRareFaces), kind: "rare" };
  }
  return { value: randInt(1, faces), kind: "fake-normal" };
}

function currentWeirdRate() {
  if (rollCount > 0 && rollCount % 5 === 0) return WEIRD_RATE_MULTIPLE_OF_5;
  return WEIRD_RATE_BASE;
}

function rollDice(faces) {
  // 爆発（最優先）
  if (Math.random() < BOOM_RATE) {
    return { value: "💥", dice: "boom", kind: "boom" };
  }

  // とんでも抽選
  if (Math.random() < currentWeirdRate()) {
    const w = rollWeirdDice(faces);
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

// --- 音（大吉：控えめ / とんでも：派手） ---
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

function playWeirdSoundLoud() {
  // 「ド派手」だけど不快になりにくい短い上昇音
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();

    o1.type = "sawtooth";
    o2.type = "triangle";
    o1.frequency.value = 220;
    o2.frequency.value = 440;

    g.gain.value = 0.0001;
    o1.connect(g); o2.connect(g);
    g.connect(ctx.destination);

    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    o1.frequency.exponentialRampToValueAtTime(880, t + 0.18);
    o2.frequency.exponentialRampToValueAtTime(1320, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

    o1.start(t); o2.start(t);
    o1.stop(t + 0.23); o2.stop(t + 0.23);

    setTimeout(() => ctx.close(), 350);
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
    g.gain.exponentialRampToValueAtTime(0.30, t + 0.02);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.22);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.30);

    o.start(t); n.start(t);
    o.stop(t + 0.31); n.stop(t + 0.31);

    setTimeout(() => ctx.close(), 500);
  } catch (_) {}
}

// --- 粒（とんでもは量を増やす） ---
function spawnParticles(count = 18) {
  const rect = panel.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "particle";

    const x0 = cx + randInt(-12, 12);
    const y0 = cy + randInt(-12, 12);

    // とんでも用に遠くまで飛ばせるように幅広く
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
  wrap.classList.remove("lucky");
  wrap.classList.remove("weird-on");
  panel.classList.remove("shake");
  panel.classList.remove("shake-weird");
  wrap.classList.remove("boom");
  flash.classList.remove("on");
}

function setFace(value) {
  faceEl.textContent = value;
  fitText();
}

function resetSilentlyAfterBoom() {
  // 爆発後：内部も「何事もなかった」ように戻す
  rollCount = 0;
}

// とんでも演出（ド派手）
function triggerWeirdShow() {
  wrap.classList.add("weird-on");
  panel.classList.add("shake-weird");

  // 通常フラッシュも混ぜる（白→虹の二段）
  flash.classList.add("on");

  // 粒を大量
  spawnParticles(36);

  // 派手音
  playWeirdSoundLoud();

  // クラス解除（短時間で戻す）
  setTimeout(() => {
    panel.classList.remove("shake-weird");
    wrap.classList.remove("weird-on");
    flash.classList.remove("on");
  }, 480);
}

rollBtn.addEventListener("click", () => {
  if (isBusy) return;

  clearEffects();

  const faces = Math.max(1, Number(facesInput.value) || 1);

  rollCount += 1;
  const res = rollDice(faces);

  // まず「普通っぽい揺れ」は常に入れる（普通アプリの手触り）
  panel.classList.add("shake");
  setTimeout(() => panel.classList.remove("shake"), 240);

  setFace(res.value);

  // 大吉（見た目だけ金色＋控えめ音）
  const vStr = String(res.value);
  const isLucky = vStr.includes("大吉") || vStr.includes("神吉");
  if (isLucky) {
    wrap.classList.add("lucky");
    playLuckySoundSubtle();
  }

  // とんでもならド派手
  if (res.dice === "weird") {
    triggerWeirdShow();
  }

  // 爆発：一瞬だけ派手 → すぐ普通へ復帰（何事もなかった顔）
  if (res.dice === "boom") {
    isBusy = true;

    wrap.classList.add("boom");
    flash.classList.add("on");
    playBoomSound();
    spawnParticles(26);

    setTimeout(() => {
      clearEffects();
      setFace(rollNormalDice(faces));
      resetSilentlyAfterBoom();
      isBusy = false;
    }, 700);

    return;
  }

  // ちょい拡大
  faceEl.style.transform = "scale(1.03)";
  setTimeout(() => (faceEl.style.transform = "scale(1)"), 120);
});

// 初期フィット
fitText();
window.addEventListener("resize", fitText);
