const paletteEl = document.getElementById("palette");
const btn = document.getElementById("generate");

// ---------------- helpers ----------------



const fontPool = [
  { name: "Inter", url: "https://fonts.google.com/specimen/Inter" },
  { name: "Poppins", url: "https://fonts.google.com/specimen/Poppins" },
  { name: "DM Serif Display", url: "https://fonts.google.com/specimen/DM+Serif+Display" },
  { name: "Playfair Display", url: "https://fonts.google.com/specimen/Playfair+Display" },
  { name: "Space Grotesk", url: "https://fonts.google.com/specimen/Space+Grotesk" },
  { name: "Archivo", url: "https://fonts.google.com/specimen/Archivo" },
  { name: "Bebas Neue", url: "https://fonts.google.com/specimen/Bebas+Neue" },
  { name: "Manrope", url: "https://fonts.google.com/specimen/Manrope" }
];


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

  return (
    "#" +
    [r, g, b]
      .map(x => x.toString(16).padStart(2, "0"))
      .join("")
  );
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ---------------- palette generator ----------------

function generatePalette() {

  const baseHue = random(0, 360);
  const baseSat = random(55, 75);
  const baseLight = random(45, 60);

  const rules = ["analogous", "complementary", "triadic", "split"];
  const rule = rules[random(0, rules.length - 1)];

  let hues = [];

  if (rule === "analogous") {
    hues = [baseHue, baseHue + 20, baseHue - 20, baseHue + 40];
  }

  if (rule === "complementary") {
    hues = [baseHue, baseHue + 180, baseHue, baseHue + 180];
  }

  if (rule === "triadic") {
    hues = [baseHue, baseHue + 120, baseHue + 240, baseHue];
  }

  if (rule === "split") {
    hues = [baseHue, baseHue + 150, baseHue + 210, baseHue];
  }

  const palette = hues.map((h, i) => {
    const light = i === 0 ? baseLight : random(30, 75);
    return hslToHex((h + 360) % 360, baseSat, light);
  });

  return palette.slice(0, 4);
}

// ---------------- reddit trend ----------------

async function fetchMemeTrend() {

  const res = await fetch(
    "https://meme-api.com/gimme/wholesomememes"
  );

  const data = await res.json();

  return data.title;
}





// ---------------- UI ----------------

function renderPalette(colors) {
  paletteEl.innerHTML = "";

  colors.forEach(c => {
    const div = document.createElement("div");
    div.className = "color";
    div.style.background = c;
    div.innerText = c;

    div.onclick = () => navigator.clipboard.writeText(c);

    paletteEl.appendChild(div);
  });
}

btn.addEventListener("click", async () => {

    const mode = document.getElementById("mode").value;


    let palette = generatePalette();

    if (mode === "strict") palette = palette.slice(0, 2);
    if (mode === "type") palette = [];

    if (palette.length > 0) {
  renderPalette(palette);
} else {
  document.getElementById("palette").innerHTML = "No colors. Focus on typography only.";
}


  let trend = "Create a poster inspired by today’s trend";

try {
  trend = await fetchMemeTrend();
  console.log("TREND OK:", trend);
} catch (e) {
  console.error("TREND ERROR:", e);
}



  document.getElementById("trend").innerText = trend;

  const fonts = pickFonts();

  if (mode === "strict") {
  document.getElementById("fonts").innerHTML = `
  <strong>Font:</strong>
  <a href="${fonts.headline.url}" target="_blank">${fonts.headline.name}</a>
  `;
}


document.getElementById("fonts").innerHTML = `
<strong>Headline:</strong>
<a href="${fonts.headline.url}" target="_blank">${fonts.headline.name}</a><br>
<strong>Body:</strong>
<a href="${fonts.body.url}" target="_blank">${fonts.body.name}</a>
`;


const formats = [
  "Instagram square post (1080×1080)",
  "Instagram portrait post (1080×1350)",
  "Story format (1080×1920)",
  "Typography poster (A4)"
];

const moods = [
  "playful",
  "bold",
  "minimal",
  "emotional",
  "futuristic",
  "editorial"
];

const format = formats[Math.floor(Math.random() * formats.length)];
const mood = moods[Math.floor(Math.random() * moods.length)];

document.getElementById("challenge").innerText =
`Design a ${mood} visual artwork for ${format} inspired by the idea:

"${trend}"

Do NOT use the sentence literally.
Translate the emotion into composition, color and typography.
Use only the given palette.`;

function pickFonts() {

  let first = fontPool[Math.floor(Math.random() * fontPool.length)];
  let second = fontPool[Math.floor(Math.random() * fontPool.length)];

  while (second.name === first.name) {
    second = fontPool[Math.floor(Math.random() * fontPool.length)];
  }

  return {
    headline: first,
    body: second
  };
}

});