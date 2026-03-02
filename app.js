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

async function fetchWikiIdea() {
  const res = await fetch(
    "https://en.wikipedia.org/api/rest_v1/page/random/summary",
  );
  const data = await res.json();
  return data.extract;
}

function transformWikiToDesignIdea(text) {
  // Grab the first sentence of the Wiki article and clean it up
  let sentences = text.split(".");
  return sentences[0].trim() + ".";
}

async function getDailyIdea() {
  const today = getTodaySeed();
  const key = `dailyIdea-${today}`;

  const cached = localStorage.getItem(key);
  if (cached) {
    return cached;
  }

  const raw = await fetchWikiIdea();
  const idea = transformWikiToDesignIdea(raw);

  localStorage.setItem(key, idea);
  return idea;
}

/* =====================================================
   SECTION: HISTORY HELPERS
===================================================== */

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
  if (!el) return; // Guard clause in case HTML is missing
  
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
  forceDailyFromURL = isDailyFromURL();

  const dailyCheckbox = document.getElementById("dailyMode");
  if (forceDailyFromURL) {
    dailyCheckbox.checked = true;
  }

  isDaily = dailyCheckbox.checked;
  dailyRand = isDaily ? seededRandom(getTodaySeed()) : null;

  const mode = document.getElementById("mode").value;
  const context = document.getElementById("context").value;

  if (isDaily) {
    dailyHeaderEl.textContent = `Today’s Challenge · ${formatTodayLabel()}`;
  } else {
    dailyHeaderEl.textContent = "";
  }

  let palette = generatePalette();
  if (mode === "strict") palette = palette.slice(0, 2);
  if (mode === "type") palette = [];
  lastPalette = palette;

  palette.length
    ? renderPalette(palette)
    : (paletteEl.innerHTML = "No colors. Typography only.");

  let trend = "";
  if (isDaily) {
    trend = await getDailyIdea();
  } else {
    const rawIdea = await fetchWikiIdea();
    trend = transformWikiToDesignIdea(rawIdea);
  }
  document.getElementById("trend").innerText = trend;

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
  if (context === "motion") contextLine = "Design a motion / reel cover concept";

  // ----- CRAZY STYLES & WILDCARDS -----
  const styles = [
    "Acid Graphics", 
    "Neo-Brutalism", 
    "Swiss International", 
    "Cyberpunk / Y2K", 
    "Maximalist Retro", 
    "High-Contrast Editorial",
    "Surreal Abstract",
    "Lo-Fi Arcade"
  ];
  const style = styles[random(0, styles.length - 1)];

  const wildcards = [
    "Constraint: You must use a visible, distorted grid.",
    "Constraint: Incorporate heavy film grain, noise, or halftone patterns.",
    "Constraint: Typography must be the absolute largest element.",
    "Constraint: Break the borders—elements must bleed off the edge.",
    "Constraint: Overlap elements to create a sense of chaos.",
    "Constraint: Make it look like a vintage scanned receipt or ticket.",
    "Constraint: Use only geometric shapes (circles, squares, triangles) to build the composition."
  ];
  const wildcard = wildcards[random(0, wildcards.length - 1)];

  
  // ----- FINAL CHALLENGE TEXT -----
  let wildcardLine = mode === "free" ? `\n${wildcard}` : "";

  lastChallengeText = `MISSION: ${contextLine.toUpperCase()}

INSPIRATION FACT: "${trend}"

VIBE: ${style}${wildcardLine}

RULE: Do NOT illustrate the text literally. Extract its mood, energy, or structure, and translate that into pure layout, color, and typography.`;

  document.getElementById("challenge").innerText = lastChallengeText;

  // ----- SAVE DAILY HISTORY (Moved inside event listener) -----
  if (document.getElementById("dailyMode").checked) {
    const dateKey = getTodaySeed();
    saveToHistory(dateKey, {
      trend,
      palette: lastPalette,
      fontsHTML: document.getElementById("fonts").innerHTML,
      challenge: lastChallengeText
    });
    renderHistory();
  }
});

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

  const shareText = `🎨 Vibe Design Challenge\n\n${lastChallengeText}\n\nTry it here:\n${shareURL}`;

  if (navigator.share) {
    await navigator.share({ text: shareText });
  } else {
    await navigator.clipboard.writeText(shareText);
    alert("Challenge copied to clipboard.");
  }
});

/* =====================================================
   SECTION: DOWNLOAD IMAGE (FIXED ALIGNMENT)
===================================================== */

downloadBtn.addEventListener("click", () => {
  if (!lastChallengeText) return alert("Generate first.");

  // 1. Setup Canvas & Dimensions
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  c.width = 1080;
  c.height = 1350;

  const centerX = c.width / 2;
  const marginX = 120; // Distance from edge
  const maxWidth = c.width - (marginX * 2); // Max width for text blocks

  // 2. Draw Background & Retro Borders
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, c.width, c.height);

  ctx.strokeStyle = "#ffb703"; // Outer yellow
  ctx.lineWidth = 12;
  ctx.strokeRect(40, 40, c.width - 80, c.height - 80);
  
  ctx.strokeStyle = "#fb5607"; // Inner orange
  ctx.lineWidth = 4;
  ctx.strokeRect(60, 60, c.width - 120, c.height - 120);

  // --- IMPORTANT: Wait for fonts to load ---
  document.fonts.ready.then(() => {
    // Set global alignment to center
    ctx.textAlign = "center";

    // 3. Draw Title Block
    let currentY = 180;
    
    ctx.fillStyle = "#ffb703";
    ctx.font = 'bold 64px "Pixelify Sans", monospace';
    ctx.fillText("VIBE DESIGN CHALLENGE", centerX, currentY);

    currentY += 60;
    ctx.fillStyle = "#ffffff";
    ctx.font = '32px "Pixelify Sans", monospace';
    const isDaily = document.getElementById("dailyMode").checked;
    const subtitle = isDaily ? `DAILY TICKET · ${formatTodayLabel()}` : "FREE PLAY MODE";
    ctx.fillText(subtitle, centerX, currentY);

    currentY += 50;
    ctx.fillStyle = "#333333";
    ctx.fillRect(centerX - 150, currentY, 300, 4); // Centered separator line

    // 4. Draw Color Palette Section
    currentY += 100;
    ctx.fillStyle = "#fb5607";
    ctx.font = 'bold 36px "Pixelify Sans", monospace';
    ctx.fillText("COLOR PALETTE", centerX, currentY);

    currentY += 50;
    if (lastPalette.length === 0) {
        ctx.fillStyle = "#888888";
        ctx.font = 'italic 32px sans-serif';
        ctx.fillText("No colors. Typography only.", centerX, currentY + 30);
        currentY += 100; // Add space even if no colors
    } else {
        // Calculate centering for color boxes
        const boxSize = 120;
        const gap = 40;
        const totalPaletteWidth = (lastPalette.length * boxSize) + ((lastPalette.length - 1) * gap);
        let startX = centerX - (totalPaletteWidth / 2) + (boxSize / 2);

        lastPalette.forEach((col, index) => {
          let xPos = startX + (index * (boxSize + gap));
          
          // Draw box (centered on its xPos)
          ctx.fillStyle = col;
          // fillRect draws from top-left, so adjust xPos back by half boxSize
          ctx.fillRect(xPos - (boxSize/2), currentY, boxSize, boxSize);
          
          // Draw border
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 4;
          ctx.strokeRect(xPos - (boxSize/2), currentY, boxSize, boxSize);
          
          // Draw Hex text underneath
          ctx.fillStyle = "#ffffff";
          ctx.font = '24px "Pixelify Sans", monospace';
          ctx.fillText(col.toUpperCase(), xPos, currentY + boxSize + 35);
        });
        currentY += boxSize + 80; // Advance Y past the color boxes
    }

    // 5. Draw Challenge Brief
    currentY += 40; 
    ctx.fillStyle = "#fb5607";
    ctx.font = 'bold 32px "Pixelify Sans", monospace'; 
    ctx.fillText("YOUR MISSION", centerX, currentY);
    
    // Switch font for body text (Reduced to 28px for better fit)
    ctx.fillStyle = "#dddddd";
    ctx.font = '28px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'; 
    
    currentY += 45; 
    
    lastChallengeText.split("\n").forEach((paragraph) => {
      if (paragraph.trim() === "") {
        // Reduced gap for empty lines
        currentY += 10; 
      } else {
        // Wraptext now uses a tighter 38px line height
        currentY = wrapText(ctx, paragraph, centerX, currentY, maxWidth, 38);
      }
    });
    
    // 6. Draw Footer
    ctx.fillStyle = "#666666";
    ctx.font = '28px "Pixelify Sans", monospace';
    // Position from bottom
    ctx.fillText("vibe-design.app", centerX, c.height - 60);

    // 7. Trigger Download
    const a = document.createElement("a");
    a.download = `vibe-challenge-${Date.now()}.png`;
    a.href = c.toDataURL();
    a.click();
  });
});

/**
 * HELPER: Handles text wrapping for Canvas
 * Note: When ctx.textAlign is 'center', the 'x' parameter is the center point.
 */


/* =====================================================
   SECTION: AUTO-GENERATE ON LOAD
===================================================== */

window.addEventListener("load", () => {
  if (shouldAutoGenerate()) {
    const dailyCheckbox = document.getElementById("dailyMode");
    if (dailyCheckbox) dailyCheckbox.checked = true;
    
    renderHistory();
    btn.click();
  } else {
    renderHistory(); // Always render history on load so past dates show up
  }
});


/**
 * HELPER: Handles text wrapping for Canvas
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  let words = text.split(" ");
  let line = "";
  let testY = y;

  for (let n = 0; n < words.length; n++) {
    let testLine = line + words[n] + " ";
    let metrics = ctx.measureText(testLine);
    let testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, testY); // .trim() keeps centering perfect
      line = words[n] + " ";
      testY += lineHeight;
    } else {
      line = testLine;
    }
  }
  
  // Draw the final line of the paragraph
  ctx.fillText(line.trim(), x, testY);
  
  // THE FIX: Add lineHeight before returning so the next paragraph doesn't overlap
  return testY + lineHeight; 
}