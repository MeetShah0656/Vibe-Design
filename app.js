const paletteEl = document.getElementById("palette");
const btn = document.getElementById("generate");
const shareBtn = document.getElementById("share");
const downloadBtn = document.getElementById("download");

let lastChallengeText = "";
let lastPalette = [];

/* ---------------- helpers ---------------- */

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;

  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  const r = Math.round(255 * f(0));
  const g = Math.round(255 * f(8));
  const b = Math.round(255 * f(4));

  return "#" + [r, g, b].map(x =>
    x.toString(16).padStart(2, "0")
  ).join("");
}

/* ---------------- palette ---------------- */

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

  if (rule === "split")
    hues = [baseHue, baseHue + 150, baseHue + 210, baseHue];

  return hues.map((h, i) =>
    hslToHex((h + 360) % 360, sat, i === 0 ? light : random(30, 75))
  ).slice(0, 4);
}

function renderPalette(colors) {
  paletteEl.innerHTML = "";

  colors.forEach(c => {
    const d = document.createElement("div");
    d.className = "color";
    d.style.background = c;
    d.textContent = c;
    d.onclick = () => navigator.clipboard.writeText(c);
    paletteEl.appendChild(d);
  });
}

/* ---------------- fonts ---------------- */

const fontPool = [
  { name: "Inter", url: "https://fonts.google.com/specimen/Inter" },
  { name: "Poppins", url: "https://fonts.google.com/specimen/Poppins" },
  { name: "DM Serif Display", url: "https://fonts.google.com/specimen/DM+Serif+Display" },
  { name: "Playfair Display", url: "https://fonts.google.com/specimen/Playfair+Display" },
  { name: "Space Grotesk", url: "https://fonts.google.com/specimen/Space+Grotesk" },
  { name: "Bebas Neue", url: "https://fonts.google.com/specimen/Bebas+Neue" },
  { name: "Manrope", url: "https://fonts.google.com/specimen/Manrope" },
  { name: "Archivo", url: "https://fonts.google.com/specimen/Archivo" }
];

function pickFonts() {
  let a = fontPool[random(0, fontPool.length - 1)];
  let b = fontPool[random(0, fontPool.length - 1)];

  while (a.name === b.name) {
    b = fontPool[random(0, fontPool.length - 1)];
  }

  return { headline: a, body: b };
}

/* ---------------- trend ---------------- */

async function fetchMemeTrend() {
  const res = await fetch("https://meme-api.com/gimme/wholesomememes");
  const data = await res.json();
  return data.title;
}

/* ---------------- main ---------------- */

btn.addEventListener("click", async () => {

  const mode = document.getElementById("mode").value;
  const context = document.getElementById("context").value;


  let palette = generatePalette();

  if (mode === "strict") palette = palette.slice(0, 2);
  if (mode === "type") palette = [];

  lastPalette = palette;

  if (palette.length) {
    renderPalette(palette);
  } else {
    paletteEl.innerHTML = "No colors. Focus on typography only.";
  }

  let trend = "A creative moment";

  try {
    trend = await fetchMemeTrend();
  } catch (e) {
    console.error(e);
  }

  document.getElementById("trend").innerText = trend;

  const fonts = pickFonts();

  if (mode === "strict") {
    document.getElementById("fonts").innerHTML =
      `<strong>Font:</strong>
       <a href="${fonts.headline.url}" target="_blank">
       ${fonts.headline.name}</a>`;
  } else {
    document.getElementById("fonts").innerHTML =
      `<strong>Headline:</strong>
       <a href="${fonts.headline.url}" target="_blank">
       ${fonts.headline.name}</a><br>
       <strong>Body:</strong>
       <a href="${fonts.body.url}" target="_blank">
       ${fonts.body.name}</a>`;
  }

  const formats = [
    "Instagram square post (1080×1080)",
    "Instagram portrait post (1080×1350)",
    "Story format (1080×1920)",
    "A4 typography poster"
  ];

  const moods = [
    "playful",
    "bold",
    "minimal",
    "emotional",
    "futuristic",
    "editorial"
  ];

  const format = formats[random(0, formats.length - 1)];
  const mood = moods[random(0, moods.length - 1)];

  let contextLine = "Design a visual artwork";

    if (context === "brand") contextLine = "Design a brand identity visual";
    if (context === "social") contextLine = "Design a social media creative";
    if (context === "motion") contextLine = "Design a motion / reel cover concept";
    

  lastChallengeText =
  `${contextLine} in a ${mood} style for ${format} inspired by this idea:

"${trend}"

Do NOT use the sentence literally.
Translate the emotion into layout, color and typography.

${mode === "type" ? "Use only typography. No colors." : "Use only the given palette."}
${mode === "strict" ? "Use only one font." : ""}`;

  document.getElementById("challenge").innerText = lastChallengeText;
});

/* ---------------- share ---------------- */

shareBtn.addEventListener("click", async () => {

  if (!lastChallengeText) {
    alert("Generate a challenge first.");
    return;
  }

  const text =
`🎨 Vibe Design Challenge

${lastChallengeText}

Try it:
https://meetshah0656.github.io/Vibe-Design/`;

  if (navigator.share) {
    await navigator.share({ text });
  } else {
    await navigator.clipboard.writeText(text);
    alert("Challenge copied to clipboard.");
  }
});

/* ---------------- download image ---------------- */

downloadBtn.addEventListener("click", downloadBriefImage);

function downloadBriefImage() {

  if (!lastChallengeText) {
    alert("Generate a challenge first.");
    return;
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = 1080;
  canvas.height = 1350;

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px sans-serif";
  ctx.fillText("Vibe Design Challenge", 60, 80);

  // palette squares
  let px = 60;
  let py = 110;
  const size = 60;

  if (lastPalette && lastPalette.length) {
    lastPalette.forEach(color => {
      ctx.fillStyle = color;
      ctx.fillRect(px, py, size, size);
      px += size + 16;
    });
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "28px sans-serif";

  let y = 220;
  const lines = lastChallengeText.split("\n");

  lines.forEach(line => {
    y = wrapText(ctx, line, 60, y, 960, 36) + 20;
    y += 12;
  });

  const link = document.createElement("a");
  link.download = "vibe-design-challenge.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {

  const words = text.split(" ");
  let line = "";

  for (let i = 0; i < words.length; i++) {

    const testLine = line + words[i] + " ";
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, y);
      line = words[i] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }

  ctx.fillText(line, x, y);
  return y;
}
