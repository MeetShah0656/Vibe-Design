const paletteEl = document.getElementById("palette");
const btn = document.getElementById("generate");

// ---------------- helpers ----------------

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
    "https://api.allorigins.win/raw?url=https://www.reddit.com/r/wholesomememes/hot.json?limit=30"
  );

  const data = await res.json();

  const posts = data.data.children
    .map(p => p.data)
    .filter(p =>
      p.title &&
      p.title.length < 100 &&
      !p.over_18
    );

  const pick = posts[Math.floor(Math.random() * posts.length)];

  return pick.title;
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

  const palette = generatePalette();
  renderPalette(palette);

  let trend = "Create a poster inspired by today’s trend";

try {
  trend = await fetchMemeTrend();
  console.log("TREND OK:", trend);
} catch (e) {
  console.error("TREND ERROR:", e);
}



  document.getElementById("trend").innerText = trend;

  document.getElementById("challenge").innerText =
  `Design a visual poster inspired by the idea:

"${trend}"

Do NOT use this sentence literally.
Translate the emotion or situation into color, layout and typography.
Use only the given palette.`;
});
