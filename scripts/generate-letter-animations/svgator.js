// Builds SVGator pencil animations in the same format as SVGator's own React
// Native exports, so the app plays them with the player it already ships.

const { Buffer } = require("node:buffer");
const crypto = require("node:crypto");

const { formatNumber } = require("./path");

const PLAYER_ID = "91c80d77";
const ANIMATION_VERSION = "2024-09-05";

// Every SVGator export uses this canvas, the letter's own 300 unit tall
// artboard centered in a 300 unit wide frame
const VIEW_BOX = { x: -100, y: -100, width: 300, height: 400 };

const GUIDE_COLOR = "#d9d9d9";
const INK_COLOR = "#3f3f46";
const STROKE_WIDTH = 12;

// Pencil artwork copied from the SVGator exports. The pencil is scaled up and
// positioned so its tip, at PENCIL_TIP in its own coordinates, sits on the path.
const PENCIL_SCALE = 2.108072;
const PENCIL_TIP = { x: 3.75146, y: 46.2759 };
const PENCIL_ART =
  '<path d="M3.87809,47.8096c-.32,0-.67-.1-.98-.37-.26-.23-.44-.54-.5-.88-.04-.23-.02-.42,0-.52.01-.1.04-.21.06-.27.03-.1.08-.25.14-.42.11-.31.28-.76.48-1.28.4-1.04.95-2.43,1.5-3.83.55-1.39,1.11-2.78,1.53-3.83l.97-2.41.17.06l1.56-1.55L39.9681,1.34961c1.49-1.500001,4.1-1.500001,5.6,0l3.06,3.07c1.54,1.54,1.54,4.06,0,5.59999l-32.57,32.59c0,0-.07.07-.11.11l.05.11-.52.26c0,0-.02.01-.04.02l-.58.25-4.90001,2.05c-5.4,2.26-5.52,2.3-5.57,2.32-.15.05-.32.09-.51.09v-.01Zm4.28-12.47l-.66,1.63c-.42,1.04-.98,2.43-1.53,3.82s-1.1,2.77-1.49,3.81c-.2.51-.36.94-.46,1.25-.05.14-.09.25-.11.34l-.02.11c.09-.03.92-.37,5.51-2.29l5.36001-2.24c0,0,.06-.04.09-.07.04-.04.08-.08.1-.1l.08-.09l32.54-32.54999c.98-.98.98-2.5,0-3.48l-3.06-3.07c-.93-.93-2.55-.93-3.48,0L8.15809,35.3396Z" fill="#3f3f46"/>' +
  '<path d="M13.8881,42.4804c-.1-1.08-.25-2.3401-.36-2.9701-.32-.02-.77-.0399-1.08-.0599-1.31-.06-1.39-.07-1.61-.24-.32-.24-.32-.31-.47-2.19-.02-.27-.04-.54-.06-.75-.64997-.1-1.86997-.2701-2.97998-.4201l.19001-1.4899c3.81997.49,3.83997.52,4.06997.84.16.22.16.27.27,1.7.02.31.05.7.08,1.01.17,0,.37.0199.57.0299c1.48.07,1.71.1001,1.92.2001.4.2.56.28.93,4.18l-1.49.14.02.02Z" fill="#3f3f46"/>' +
  '<path d="M37.346,5.35945L36.2852,6.41992l7.593,7.59568l1.0608-1.0605-7.593-7.59565Z" fill="#3f3f46"/>' +
  '<path d="M38.7778,7.44873L10.8047,35.4219l1.0606,1.0606L39.8385,8.50939L38.7778,7.44873Z" fill="#3f3f46"/>' +
  '<path d="M40.727,10.6909L12.7539,38.6641l1.0607,1.0606L41.7877,11.7516L40.727,10.6909Z" fill="#3f3f46"/>' +
  '<path d="M7.63813,45.15c0,0-.33-1.15-1.04-1.77-.74-.65-1.76001-.93-1.77001-.93L5.20813,41c.06.01,1.36.36,2.38,1.25c1.05.92,1.47,2.44,1.48999,2.5l-1.44999.4h.01Z" fill="#3f3f46"/>';
// The purple tip only shows while the pencil is drawing, not while it's lifted
const PENCIL_TIP_DOT =
  '<circle style="isolation:isolate" r="3.369475" transform="matrix(.879898 0 0 .879898 3.86269 46.275814)" fill="#c385f8"/>';

// SVGator's obfuscation of the "s" and "options" fields, the inverse of the
// player's decoder (lt() in @svgator/react-native's 91c80d77 player)
const hexValue = (text) => +("0x" + (text.replace(/[^0-9a-fA-F]+/g, "") || 27));
const remainder = (value, divisor = 27) =>
  !value || value % divisor
    ? value % divisor
    : remainder(value / divisor, divisor);

const encode = (value, rootId) => {
  const playerValue = hexValue(PLAYER_ID);
  const seed = 0x1000; // Any 4 hex digits work, the decoder reads them back
  const offset = (hexValue(rootId) % seed) + (playerValue % 27);
  const characters = [...JSON.stringify(value)].map((character) => {
    const code = character.charCodeAt(0) + offset;
    return code > 0xff
      ? "|" + code.toString(16).padStart(4, "0")
      : code.toString(16).padStart(2, "0");
  });
  let text = seed.toString(16) + characters.join("");
  let base64 = Buffer.from(text, "latin1").toString("base64");
  // The decoder turns a trailing "/" into "=", so pad with a letter it drops
  while (base64.endsWith("/")) {
    text += "X";
    base64 = Buffer.from(text, "latin1").toString("base64");
  }
  // SVGator writes the base64 padding as "|" for "==" and "/" for "="
  if (base64.endsWith("==")) base64 = base64.slice(0, -2) + "|";
  else if (base64.endsWith("=")) base64 = base64.slice(0, -1) + "/";

  // The decoder drops one character after the first few, then after every
  // `interval` characters, so put a filler character in each of those places
  const first = remainder(playerValue, 5);
  const interval = remainder(playerValue) + 5;
  let result = "";
  let rest = base64;
  let take = first;
  while (rest.length > take) {
    result += rest.slice(0, take) + "Q";
    rest = rest.slice(take);
    take = interval;
  }
  return result + rest;
};

// SVGator ids are a random prefix plus a counter; derive the prefix from the
// letter so regenerating gives identical files
const idPrefix = (name) => {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const hash = crypto.createHash("sha256").update(name).digest();
  let prefix = "e";
  for (let i = 0; i < 10; i++) prefix += alphabet[hash[i] % alphabet.length];
  return prefix;
};

const round = (value) => +value.toFixed(6);

const offsetPoint = (point, offset) => ({
  x: round(point.x + offset.x),
  y: round(point.y + offset.y),
});

const pencilTransform = (point) =>
  `matrix(${PENCIL_SCALE} 0 0 ${PENCIL_SCALE} ${formatNumber(point.x - PENCIL_SCALE * PENCIL_TIP.x)} ${formatNumber(point.y - PENCIL_SCALE * PENCIL_TIP.y)})`;

const pencilData = {
  s: { x: PENCIL_SCALE, y: PENCIL_SCALE },
  t: { x: -PENCIL_TIP.x, y: -PENCIL_TIP.y },
};

// One motion keyframe per path node, timed by arc length, with the node's
// Bézier handles so the pencil follows the curve
const strokeMotion = (stroke, offset) => {
  const keys = [];
  let distance = 0;
  // Keyframe times must keep increasing, even between nodes a hair apart
  const time = () =>
    Math.max(
      Math.round(stroke.start + (distance / stroke.length) * stroke.duration),
      (keys[keys.length - 1]?.t ?? -1) + 1,
    );

  stroke.segments.forEach((segment, index) => {
    const key = keys[index] || {
      t: time(),
      v: { ...offsetPoint(segment.p0, offset), type: "cusp" },
    };
    if (segment.p1) key.v.end = offsetPoint(segment.p1, offset);
    keys[index] = key;

    distance += stroke.segmentLengths[index];
    const next = {
      t: time(),
      v: { ...offsetPoint(segment.p3, offset), type: "cusp" },
    };
    if (segment.p2) next.v.start = offsetPoint(segment.p2, offset);
    keys[index + 1] = next;
  });
  return keys;
};

// Opacity steps: [1, 0] holds the old value until the next key, [1, 1]
// jumps to the next value straight away
const HOLD = [1, 0];
const JUMP = [1, 1];

const buildAnimation = ({ name, strokes, lifts, offset, duration }) => {
  const prefix = idPrefix(name);
  const rootId = `${prefix}1`;
  let counter = 2;
  const nextId = () => `${prefix}${counter++}`;

  const elements = {};
  const translate = `translate(${formatNumber(offset.x)} ${formatNumber(offset.y)})`;
  const pathAttributes = (color) =>
    `fill="none" stroke="${color}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10"`;

  const guides = strokes
    .map((stroke) => `<path d="${stroke.d}" ${pathAttributes(GUIDE_COLOR)}/>`)
    .join("");

  // The ink is fully drawn at rest, cleared when playback starts, then drawn
  // in stroke by stroke
  const ink = strokes
    .map((stroke) => {
      const id = nextId();
      const dash = Math.ceil(stroke.length * 100) / 100;
      elements[id] = {
        "stroke-dashoffset": [
          { t: 0, v: 0, e: JUMP },
          { t: stroke.start, v: dash },
          { t: stroke.end, v: 0 },
        ],
      };
      return `<path id="${id}" d="${stroke.d}" ${pathAttributes(INK_COLOR)} stroke-dasharray="${dash}"/>`;
    })
    .join("");

  const pencilId = `${prefix}-pencil`;
  const pencils = [];
  strokes.forEach((stroke, index) => {
    const id = nextId();
    const isFirst = index === 0;
    const isLast = index === strokes.length - 1;
    const keys = strokeMotion(stroke, offset);
    // The first pencil shows as soon as playback starts; the last one stays
    // at the end once the letter is drawn
    let opacity;
    if (isFirst && isLast) {
      opacity = [
        { t: 0, v: 0, e: JUMP },
        { t: stroke.start, v: 1 },
      ];
    } else if (isFirst) {
      opacity = [
        { t: 0, v: 0, e: JUMP },
        { t: stroke.start, v: 1 },
        { t: stroke.end, v: 1, e: JUMP },
        { t: duration, v: 0 },
      ];
    } else if (isLast) {
      opacity = [
        { t: 0, v: 0, e: HOLD },
        { t: stroke.start, v: 1 },
      ];
    } else {
      opacity = [
        { t: 0, v: 0, e: HOLD },
        { t: stroke.start, v: 1, e: HOLD },
        { t: stroke.end, v: 0 },
      ];
    }
    elements[id] = {
      transform: { data: pencilData, keys: { o: keys } },
      opacity,
    };
    pencils.push(
      `<g id="${id}" transform="${pencilTransform(keys[0].v)}" opacity="0"><use xlink:href="#${pencilId}"/>${PENCIL_TIP_DOT}</g>`,
    );

    const lift = lifts[index];
    if (lift) {
      const liftId = nextId();
      const from = offsetPoint(lift.from, offset);
      const to = offsetPoint(lift.to, offset);
      elements[liftId] = {
        transform: {
          data: pencilData,
          keys: {
            o: [
              { t: lift.start, v: { ...from, type: "corner" } },
              { t: lift.end, v: { ...to, type: "corner" } },
            ],
          },
        },
        opacity: [
          { t: 0, v: 0, e: HOLD },
          { t: lift.start, v: 1, e: HOLD },
          { t: lift.end, v: 0 },
        ],
      };
      pencils.push(
        `<g id="${liftId}" transform="${pencilTransform(from)}" opacity="0"><use xlink:href="#${pencilId}"/></g>`,
      );
    }
  });

  const settings = {
    duration,
    direction: 1,
    iterations: 1,
    fill: 1,
    alternate: false,
    speed: 1,
    fps: 100,
  };
  const config = {
    root: rootId,
    version: ANIMATION_VERSION,
    animations: [{ elements, s: encode(settings, rootId) }],
    options: encode({ start: "programmatic" }, rootId),
  };

  const viewBox = `${VIEW_BOX.x} ${VIEW_BOX.y} ${VIEW_BOX.width} ${VIEW_BOX.height}`;
  const svg =
    `<svg id="${rootId}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${viewBox}" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">` +
    `<defs><g id="${pencilId}">${PENCIL_ART}</g></defs>` +
    `<g transform="${translate}">${guides}</g>` +
    `<g transform="${translate}">${ink}</g>` +
    pencils.join("");
  // Same bootstrap SVGator appends after its player script
  const bootstrap =
    "(function(s,i,o,w,d,a,b){(a=Array.from(d.querySelectorAll('svg#' + i.root)).filter(n=> !n.svgatorPlayer)[0]||{}).svgatorPlayer={ready:(function(a){b=[];return function(c){return c?(b.push(c),a.svgatorPlayer):b}})(a)};w[o]=w[o]||{};w[o][s]=w[o][s]||[];w[o][s].push(i);})" +
    `('${PLAYER_ID}',${JSON.stringify(config)},'__SVGATOR_PLAYER__',window,document)`;

  return { svg, bootstrap };
};

module.exports = { PLAYER_ID, VIEW_BOX, buildAnimation, encode };
