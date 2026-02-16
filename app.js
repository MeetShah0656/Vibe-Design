/* =====================================================
   SECTION: DOM REFERENCES
===================================================== */

const paletteEl = document.getElementById("palette");
const btn = document.getElementById("generate");
const shareBtn = document.getElementById("share");
const downloadBtn = document.getElementById("download");
const dailyHeaderEl = document.getElementById("dailyHeader");

/* =====================================================
   SECTION: GLOBAL STATE
===================================================== */

let lastChallengeText = "";
let lastPalette = [];
let dailyRand = null;
let forceDailyFromURL = false;
let isDaily = false;


/* =====================================================
   SECTION: RANDOM HELPERS (DAILY MODE AWARE)
===================================================== */

// ===== SECTION: URL & DATE HELPERS =====

function shouldAutoGenerate() {
  const params = new URLSearchParams(window.location.search);
  return params.get("daily") === "1";
}

function isDailyFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("daily") === "1";
}

function formatTodayLabel() {
  const d = new Date();
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function seededRandom(seed) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    h += h << 5;
    return (h >>> 0) / 4294967296;
  };
}

function getTodaySeed() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function random(min, max) {
  const r = dailyRand ? dailyRand() : Math.random();
  return Math.floor(r * (max - min + 1)) + min;
}

/* =====================================================
   SECTION: COLOR PALETTE ENGINE
===================================================== */

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return (
    "#" +
    [f(0), f(8), f(4)]
      .map((x) =>
        Math.round(255 * x)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

function generatePalette() {
  const baseHue = random(0, 360);
  const sat = random(55, 75);
  const light = random(45, 60);

  const rules = ["analogous", "complementary", "triadic", "split"];
  const rule = rules[random(0, rules.length - 1)];

  let hues = [];
  if (rule === "analogous")
    hues = [baseHue, baseHue + 20, baseHue - 20, baseHue + 40];
  if (rule === "complementary")
    hues = [baseHue, baseHue + 180, baseHue, baseHue + 180];
  if (rule === "triadic")
    hues = [baseHue, baseHue + 120, baseHue + 240, baseHue];
  if (rule === "split") hues = [baseHue, baseHue + 150, baseHue + 210, baseHue];

  return hues
    .map((h, i) =>
      hslToHex((h + 360) % 360, sat, i === 0 ? light : random(30, 75)),
    )
    .slice(0, 4);
}

function renderPalette(colors) {
  paletteEl.innerHTML = "";
  colors.forEach((c) => {
    const d = document.createElement("div");
    d.className = "color";
    d.style.background = c;
    d.textContent = c;
    d.onclick = () => navigator.clipboard.writeText(c);
    paletteEl.appendChild(d);
  });
}

/* =====================================================
   SECTION: FONT ENGINE
===================================================== */

const fontPool = [
  { name: "Inter", url: "https://fonts.google.com/specimen/Inter" },
  { name: "Poppins", url: "https://fonts.google.com/specimen/Poppins" },
  {
    name: "DM Serif Display",
    url: "https://fonts.google.com/specimen/DM+Serif+Display",
  },
  {
    name: "Playfair Display",
    url: "https://fonts.google.com/specimen/Playfair+Display",
  },
  {
    name: "Space Grotesk",
    url: "https://fonts.google.com/specimen/Space+Grotesk",
  },
  { name: "Bebas Neue", url: "https://fonts.google.com/specimen/Bebas+Neue" },
  { name: "Manrope", url: "https://fonts.google.com/specimen/Manrope" },
  { name: "Archivo", url: "https://fonts.google.com/specimen/Archivo" },
];

function pickFonts() {
  let a = fontPool[random(0, fontPool.length - 1)];
  let b = fontPool[random(0, fontPool.length - 1)];
  while (a.name === b.name) b = fontPool[random(0, fontPool.length - 1)];
  return { headline: a, body: b };
}

/* =====================================================
   SECTION: IDEA ENGINE (WIKIPEDIA)
===================================================== */
// ===== SECTION: HISTORY HELPERS =====
function saveToHistory(dateKey, payload) {
  const all = JSON.parse(localStorage.getItem("history")) || {};
  all[dateKey] = payload;
  localStorage.setItem("history", JSON.stringify(all));
}

function getHistory() {
  return JSON.parse(localStorage.getItem("history")) || {};
}

function renderHistory() {
  const el = document.getElementById("history");
  const all = getHistory();
  const dates = Object.keys(all).sort().reverse().slice(0, 7);

  if (!dates.length) {
    el.textContent = "No history yet.";
    return;
  }

  el.innerHTML = dates
    .map(
      (d) =>
        `<div style="cursor:pointer;opacity:.9" data-date="${d}">
      ${d}
     </div>`,
    )
    .join("");

  dates.forEach((d) => {
    el.querySelector(`[data-date="${d}"]`).onclick = () => {
      loadFromHistory(d);
    };
  });
}

function loadFromHistory(dateKey) {
  const item = getHistory()[dateKey];
  if (!item) return;

  lastChallengeText = item.challenge;
  lastPalette = item.palette;

  // rehydrate UI
  document.getElementById("trend").innerText = item.trend;
  document.getElementById("fonts").innerHTML = item.fontsHTML;
  document.getElementById("challenge").innerText = item.challenge;

  if (item.palette.length) {
    renderPalette(item.palette);
  } else {
    document.getElementById("palette").innerHTML =
      "No colors. Typography only.";
  }
}

async function fetchWikiIdea() {
  const res = await fetch(
    "https://en.wikipedia.org/api/rest_v1/page/random/summary",
  );
  const data = await res.json();
  return data.extract;
}

function transformWikiToDesignIdea(text) {
  const lenses = [
    "Design a visual metaphor for",
    "Create an abstract poster inspired by",
    "Translate this concept into a brand visual:",
    "Express this idea using only shapes and color:",
    "Turn this concept into a modern design system:",
  ];
  const lens = lenses[random(0, lenses.length - 1)];
  return `${lens} "${text.split(".")[0]}"`;
}

// ===== DAILY IDEA CACHE =====
async function getDailyIdea() {
  const today = getTodaySeed(); // YYYY-MM-DD
  const key = `dailyIdea-${today}`;

  // 1. If already generated today → reuse
  const cached = localStorage.getItem(key);
  if (cached) {
    return cached;
  }

  // 2. Otherwise fetch once
  const raw = await fetchWikiIdea();
  const idea = transformWikiToDesignIdea(raw);

  // 3. Store for the day
  localStorage.setItem(key, idea);

  return idea;
}

// ===== SECTION: HISTORY HELPERS =====
function saveToHistory(dateKey, payload) {
  const all = JSON.parse(localStorage.getItem("history")) || {};
  all[dateKey] = payload;
  localStorage.setItem("history", JSON.stringify(all));
}

function getHistory() {
  return JSON.parse(localStorage.getItem("history")) || {};
}

function renderHistory() {
  const el = document.getElementById("history");
  const all = getHistory();
  const dates = Object.keys(all).sort().reverse().slice(0, 7);

  if (!dates.length) {
    el.textContent = "No history yet.";
    return;
  }

  el.innerHTML = dates
    .map(
      (d) =>
        `<div style="cursor:pointer;opacity:.9" data-date="${d}">
      ${d}
     </div>`,
    )
    .join("");

  dates.forEach((d) => {
    el.querySelector(`[data-date="${d}"]`).onclick = () => {
      loadFromHistory(d);
    };
  });
}

function loadFromHistory(dateKey) {
  const item = getHistory()[dateKey];
  if (!item) return;

  lastChallengeText = item.challenge;
  lastPalette = item.palette;

  // rehydrate UI
  document.getElementById("trend").innerText = item.trend;
  document.getElementById("fonts").innerHTML = item.fontsHTML;
  document.getElementById("challenge").innerText = item.challenge;

  if (item.palette.length) {
    renderPalette(item.palette);
  } else {
    document.getElementById("palette").innerHTML =
      "No colors. Typography only.";
  }
}

/* =====================================================
   SECTION: MAIN GENERATE HANDLER
===================================================== */

btn.addEventListener("click", async () => {
  // ----- DAILY MODE (URL + CHECKBOX SYNC) -----
  forceDailyFromURL = isDailyFromURL();

  const dailyCheckbox = document.getElementById("dailyMode");
  if (forceDailyFromURL) {
    dailyCheckbox.checked = true;
  }

  // ----- DAILY MODE SETUP -----
  isDaily = dailyCheckbox.checked;
  dailyRand = isDaily ? seededRandom(getTodaySeed()) : null;

  const mode = document.getElementById("mode").value;
  const context = document.getElementById("context").value;

  // ----- DAILY HEADER -----
  if (isDaily) {
    dailyHeaderEl.textContent = `Today’s Challenge · ${formatTodayLabel()}`;
  } else {
    dailyHeaderEl.textContent = "";
  }

  // ----- PALETTE -----
  let palette = generatePalette();
  if (mode === "strict") palette = palette.slice(0, 2);
  if (mode === "type") palette = [];
  lastPalette = palette;

  palette.length
    ? renderPalette(palette)
    : (paletteEl.innerHTML = "No colors. Typography only.");

  // ----- IDEA -----
  let trend = "";

  if (isDaily) {
    trend = await getDailyIdea();
  } else {
    const rawIdea = await fetchWikiIdea();
    trend = transformWikiToDesignIdea(rawIdea);
  }

  document.getElementById("trend").innerText = trend;

  // ----- FONTS -----
  const fonts = pickFonts();
  document.getElementById("fonts").innerHTML =
    mode === "strict"
      ? `<strong>Font:</strong> <a href="${fonts.headline.url}" target="_blank">${fonts.headline.name}</a>`
      : `<strong>Headline:</strong> <a href="${fonts.headline.url}" target="_blank">${fonts.headline.name}</a><br>
         <strong>Body:</strong> <a href="${fonts.body.url}" target="_blank">${fonts.body.name}</a>`;

  // ----- CONTEXT LINE -----
  let contextLine = "Design a visual artwork";
  if (context === "brand") contextLine = "Design a brand identity visual";
  if (context === "social") contextLine = "Design a social media creative";
  if (context === "motion")
    contextLine = "Design a motion / reel cover concept";

  // ----- CHALLENGE TEXT -----
  lastChallengeText = `${contextLine} in a ${["playful", "bold", "minimal", "emotional", "futuristic", "editorial"][random(0, 5)]} style inspired by:

"${trend}"

Do NOT use the sentence literally.
Translate the emotion into layout, color and typography.`;

  document.getElementById("challenge").innerText = lastChallengeText;
});

// ----- SAVE DAILY HISTORY -----
if (isDaily) {
  console.log("Saving daily history");

  const dateKey = getTodaySeed();
  saveToHistory(dateKey, {
    trend,
    palette: lastPalette,
    fontsHTML: document.getElementById("fonts").innerHTML,
    challenge: lastChallengeText
  });
  renderHistory();
} else {
  console.log("NOT daily mode, history skipped");
}




// ===== SECTION: HISTORY HELPERS =====
function saveToHistory(dateKey, payload) {
  const all = JSON.parse(localStorage.getItem("history")) || {};
  all[dateKey] = payload;
  localStorage.setItem("history", JSON.stringify(all));
}

function getHistory() {
  return JSON.parse(localStorage.getItem("history")) || {};
}

function renderHistory() {
  const el = document.getElementById("history");
  const all = getHistory();
  const dates = Object.keys(all).sort().reverse().slice(0, 7);

  if (!dates.length) {
    el.textContent = "No history yet.";
    return;
  }

  el.innerHTML = dates
    .map(
      (d) =>
        `<div style="cursor:pointer;opacity:.9" data-date="${d}">
      ${d}
     </div>`,
    )
    .join("");

  dates.forEach((d) => {
    el.querySelector(`[data-date="${d}"]`).onclick = () => {
      loadFromHistory(d);
    };
  });
}

function loadFromHistory(dateKey) {
  const item = getHistory()[dateKey];
  if (!item) return;

  lastChallengeText = item.challenge;
  lastPalette = item.palette;

  // rehydrate UI
  document.getElementById("trend").innerText = item.trend;
  document.getElementById("fonts").innerHTML = item.fontsHTML;
  document.getElementById("challenge").innerText = item.challenge;

  if (item.palette.length) {
    renderPalette(item.palette);
  } else {
    document.getElementById("palette").innerHTML =
      "No colors. Typography only.";
  }
}

/* =====================================================
   SECTION: SHARE CHALLENGE
===================================================== */

shareBtn.addEventListener("click", async () => {
  if (!lastChallengeText) {
    alert("Generate a challenge first.");
    return;
  }

  const isDaily = document.getElementById("dailyMode").checked;

  const shareURL = isDaily
    ? "https://meetshah0656.github.io/Vibe-Design/?daily=1"
    : "https://meetshah0656.github.io/Vibe-Design/";

  const shareText = `🎨 Vibe Design Challenge

${lastChallengeText}

Try it here:
${shareURL}`;

  if (navigator.share) {
    await navigator.share({ text: shareText });
  } else {
    await navigator.clipboard.writeText(shareText);
    alert("Challenge copied to clipboard.");
  }
});

/* =====================================================
   SECTION: DOWNLOAD IMAGE
===================================================== */

downloadBtn.addEventListener("click", () => {
  if (!lastChallengeText) return alert("Generate first.");

  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  c.width = 1080;
  c.height = 1350;

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 48px sans-serif";
  ctx.fillText("Vibe Design Challenge", 60, 80);

  let x = 60;
  lastPalette.forEach((col) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, 110, 60, 60);
    x += 76;
  });

  ctx.font = "28px sans-serif";
  let y = 220;
  lastChallengeText.split("\n").forEach((l) => {
    y = wrapText(ctx, l, 60, y, 960, 36) + 20;
  });

  const a = document.createElement("a");
  a.download = "vibe-challenge.png";
  a.href = c.toDataURL();
  a.click();
});

function wrapText(ctx, text, x, y, max, line) {
  let words = text.split(" "),
    l = "";
  for (let w of words) {
    let t = l + w + " ";
    if (ctx.measureText(t).width > max) {
      ctx.fillText(l, x, y);
      l = w + " ";
      y += line;
    } else l = t;
  }
  ctx.fillText(l, x, y);
  return y;
}

/* =====================================================
   SECTION: AUTO-GENERATE ON LOAD
===================================================== */

window.addEventListener("load", () => {
  if (shouldAutoGenerate()) {
    // ensure daily mode is ON
    const dailyCheckbox = document.getElementById("dailyMode");
    if (dailyCheckbox) dailyCheckbox.checked = true;

    renderHistory();


    // trigger generation
    btn.click();
  }
});
