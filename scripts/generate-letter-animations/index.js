#!/usr/bin/env node

// Generates the pencil animation of every letter, upper and lower case, from
// the letter SVGs in raw-assets/alphabet/vector, and writes them all to
// assets/alphabet/animation/pencil-map.js.
//
// Letters that have a hand-made SVGator export in
// raw-assets/alphabet/animation/pencil keep it, unless --regenerate is passed.
// How each letter is written (stroke order, direction, timing) is set in
// strokes.js.
//
// Usage:
//   node scripts/generate-letter-animations
//   node scripts/generate-letter-animations --preview /tmp/letters.html
//   node scripts/generate-letter-animations --regenerate --dry-run --preview /tmp/letters.html
//
//   --preview <file>  also write an HTML page that plays every animation
//   --regenerate      generate letters that have a hand-made export too
//   --dry-run         don't write pencil-map.js

const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const {
  parsePath,
  reverseSegments,
  segmentLength,
  serialize,
} = require("./path");
const STROKES = require("./strokes");
const { PLAYER_ID, VIEW_BOX, buildAnimation } = require("./svgator");

const projectRoot = path.resolve(__dirname, "../..");
const vectorDirectory = path.join(projectRoot, "raw-assets/alphabet/vector");
const handMadeDirectory = path.join(
  projectRoot,
  "raw-assets/alphabet/animation/pencil",
);
const pencilMapPath = path.join(
  projectRoot,
  "assets/alphabet/animation/pencil-map.js",
);

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
const CASES = ["uppercase", "lowercase"];

// Timing, in milliseconds. The pencil draws at a steady pace, so long strokes
// take longer, within limits that keep short strokes visible and long ones
// from dragging.
const START_DELAY = 100;
const DRAW_MS_PER_UNIT = 13;
const MIN_STROKE_DURATION = 1000;
const MAX_STROKE_DURATION = 5000;
const LIFT_BASE_DURATION = 600;
const LIFT_MS_PER_UNIT = 5;
const MIN_LIFT_DURATION = 1000;
const MAX_LIFT_DURATION = 1600;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1];
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const roundTo100 = (value) => Math.round(value / 100) * 100;

const readLetterSvg = (letterCase, letter) => {
  const file = path.join(vectorDirectory, letterCase, `${letter}.svg`);
  const svg = readFileSync(file, "utf8");
  if (/<(line|polyline|polygon|circle|ellipse|rect)\b/.test(svg)) {
    throw new Error(`${file}: only <path> elements are supported`);
  }
  const width = +svg.match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+) [\d.]+"/)[1];
  const paths = [...svg.matchAll(/<path\b[^>]*?\sd="([^"]*)"/g)].flatMap(
    ([, d]) => parsePath(d.replace(/\s+/g, " ")),
  );
  return { file, width, paths };
};

const buildLetter = (name, { file, width, paths }) => {
  const spec = STROKES[name] || {};
  const strokeSpecs =
    spec.strokes || paths.map((_, index) => ({ path: index }));

  const partSegments = (part) => {
    if (!paths[part.path]) {
      throw new Error(`${name}: ${file} has no path ${part.path}`);
    }
    let segments = paths[part.path];
    if (part.segments) segments = segments.slice(...part.segments);
    if (part.reverse) segments = reverseSegments(segments);
    return segments;
  };

  let time = START_DELAY;
  const strokes = [];
  const lifts = [];
  strokeSpecs.forEach((strokeSpec, index) => {
    const joined = [];
    for (const part of strokeSpec.parts || [strokeSpec]) {
      const next = partSegments(part);
      const end = joined[joined.length - 1]?.p3;
      // Bridge any gap between joined parts with a straight line
      if (end && Math.hypot(next[0].p0.x - end.x, next[0].p0.y - end.y) > 0.5) {
        joined.push({ p0: end, p3: next[0].p0 });
      }
      joined.push(...next);
    }
    // Zero-length segments would give two motion keyframes the same time
    const segments = joined.filter((segment) => segmentLength(segment) > 0.01);
    if (segments.length === 0) {
      throw new Error(`${name}: stroke ${index} has nothing to draw`);
    }

    const segmentLengths = segments.map(segmentLength);
    const length = segmentLengths.reduce((sum, value) => sum + value, 0);
    const duration =
      strokeSpec.duration ??
      clamp(
        roundTo100(length * DRAW_MS_PER_UNIT),
        MIN_STROKE_DURATION,
        MAX_STROKE_DURATION,
      );

    const previous = strokes[strokes.length - 1];
    if (previous) {
      const from = previous.segments[previous.segments.length - 1].p3;
      const to = segments[0].p0;
      const liftDuration =
        spec.lifts?.[index - 1] ??
        clamp(
          roundTo100(
            LIFT_BASE_DURATION +
              Math.hypot(to.x - from.x, to.y - from.y) * LIFT_MS_PER_UNIT,
          ),
          MIN_LIFT_DURATION,
          MAX_LIFT_DURATION,
        );
      lifts.push({ from, to, start: time, end: time + liftDuration });
      time += liftDuration;
    }

    strokes.push({
      d: serialize(segments),
      segments,
      segmentLengths,
      length,
      duration,
      start: time,
      end: time + duration,
    });
    time += duration;
  });

  // Center the letter's artboard in the frame
  const offset = {
    x: VIEW_BOX.x + (VIEW_BOX.width - width) / 2 + (spec.offset?.x || 0),
    y: spec.offset?.y || 0,
  };
  return buildAnimation({ name, strokes, lifts, offset, duration: time });
};

// The SVGatorPlayer.wrapPage(...) call from a hand-made export, as
// scripts/svgator_videos_to_js_dict.py takes it
const readHandMadeEntry = (file) => {
  const source = readFileSync(file, "utf8");
  const start = source.indexOf("SVGatorPlayer.wrapPage");
  const end = source.indexOf("\n}\n", start);
  const entry = source.slice(start, end).trim().replace(/;$/, "");
  if (start === -1 || !entry.endsWith(")")) {
    throw new Error(`${file}: couldn't find the SVGatorPlayer.wrapPage call`);
  }
  return entry;
};

const generatedEntry = ({ svg, bootstrap }) =>
  `SVGatorPlayer.wrapPage(${JSON.stringify(svg + "<script><![CDATA[")} + SVGatorPlayer.getPlayer(${JSON.stringify(PLAYER_ID)}) + ${JSON.stringify(bootstrap + "]]></script></svg>")})`;

const writePencilMap = async (entries) => {
  const prettier = require("prettier");
  const source =
    "// This file is generated by scripts/generate-letter-animations\n" +
    "// @ts-nocheck\n" +
    'import SVGatorPlayer from "@svgator/react-native";\n\n' +
    "const pencil = {\n" +
    entries.map(({ key, entry }) => `  ${key}: ${entry},\n`).join("") +
    "};\n\nexport default pencil;\n";
  const config = await prettier.resolveConfig(pencilMapPath);
  writeFileSync(
    pencilMapPath,
    await prettier.format(source, { ...config, filepath: pencilMapPath }),
  );
};

// Evaluates map entries the way the app does, with the player taken from the
// installed @svgator/react-native package
const createPagePlayer = () => {
  const packageSource = readFileSync(
    require.resolve("@svgator/react-native/index.js", { paths: [projectRoot] }),
    "utf8",
  );
  // The player is a string literal keyed by its id
  const start =
    packageSource.indexOf(`'${PLAYER_ID}': "`) + PLAYER_ID.length + 4;
  let end = start + 1;
  while (packageSource[end] !== '"') end += packageSource[end] === "\\" ? 2 : 1;
  const playerSource = vm.runInNewContext(packageSource.slice(start, end + 1));
  return {
    getPlayer: (id) => {
      if (id !== PLAYER_ID) throw new Error(`Unexpected player ${id}`);
      return playerSource;
    },
    wrapPage: (svg) =>
      "<!doctype html><html><head><style>html,body{height:100%;overflow:hidden;width:100%;margin:0;padding:0}svg{height:100%;left:0;position:fixed;top:0;width:100%}</style></head><body>" +
      svg +
      "</body></html>",
  };
};

const writePreview = (file, cards) => {
  const player = createPagePlayer();
  const toPage = (entry) =>
    vm.runInNewContext(`(${entry})`, { SVGatorPlayer: player });
  const escapeAttribute = (text) =>
    text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

  const cardHtml = cards
    .map(
      ({ label, versions }) => `
    <section class="card">
      <h2>${label}</h2>
      <div class="versions">
        ${versions
          .map(
            ({ title, entry }) => `
        <figure>
          <iframe srcdoc="${escapeAttribute(toPage(entry))}"></iframe>
          <figcaption>${title}</figcaption>
        </figure>`,
          )
          .join("")}
      </div>
      <button type="button">Play</button>
    </section>`,
    )
    .join("");

  writeFileSync(
    file,
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Letter animations</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 16px; background: #f2eff0; color: #18181b; }
  header { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
  h1 { font-size: 20px; margin: 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .card { background: #fff; border: 2px solid #c385f8; border-radius: 12px; padding: 8px; }
  h2 { font-size: 16px; margin: 0 0 4px; }
  .versions { display: flex; gap: 4px; }
  figure { margin: 0; flex: 1; }
  iframe { width: 100%; aspect-ratio: 3 / 4; border: 0; background: #fff; }
  figcaption { font-size: 12px; color: #71717a; text-align: center; }
  button { font: inherit; padding: 4px 12px; border-radius: 8px; border: 1px solid #9c28dd; background: #efe3fa; cursor: pointer; }
</style>
</head>
<body>
<header><h1>Letter animations</h1><button type="button" id="play-all">Play all</button></header>
<div class="grid">${cardHtml}
</div>
<script>
  const play = (frame) => frame.contentDocument.querySelector("svg").svgatorPlayer.restart();
  document.querySelectorAll(".card").forEach((card) => {
    card.querySelector("button").addEventListener("click", () => card.querySelectorAll("iframe").forEach(play));
  });
  document.getElementById("play-all").addEventListener("click", () => document.querySelectorAll("iframe").forEach(play));
</script>
</body>
</html>
`,
  );
};

const main = async () => {
  const regenerate = flag("--regenerate");
  const previewFile = option("--preview");
  const entries = [];
  const cards = [];

  for (const letterCase of CASES) {
    for (const letter of LETTERS) {
      const name = `${letterCase}_${letter}`;
      const key = `${name}_pencil`;
      const handMadeFile = path.join(
        handMadeDirectory,
        `${letterCase}-${letter}-pencil.js`,
      );
      const handMade = existsSync(handMadeFile)
        ? readHandMadeEntry(handMadeFile)
        : null;
      const generated =
        !handMade || regenerate
          ? generatedEntry(buildLetter(name, readLetterSvg(letterCase, letter)))
          : null;

      entries.push({
        key,
        entry: handMade && !regenerate ? handMade : generated,
      });
      const versions = [];
      if (handMade) versions.push({ title: "hand-made", entry: handMade });
      if (generated) versions.push({ title: "generated", entry: generated });
      cards.push({
        label: letterCase === "uppercase" ? letter.toUpperCase() : letter,
        versions,
      });
    }
  }

  if (!flag("--dry-run")) {
    await writePencilMap(entries);
    console.log(`Wrote ${path.relative(projectRoot, pencilMapPath)}`);
  }
  if (previewFile) {
    writePreview(path.resolve(previewFile), cards);
    console.log(`Wrote ${previewFile}`);
  }
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  buildLetter,
  createPagePlayer,
  generatedEntry,
  readHandMadeEntry,
  readLetterSvg,
};
