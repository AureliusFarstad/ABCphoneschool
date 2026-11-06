// Parses, measures and edits the stroke paths of the letter SVGs.
// A subpath is a list of segments in absolute coordinates; every segment is
// a straight line or a cubic Bézier: { p0, p3 } or { p0, p1, p2, p3 }.

const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
const ARGUMENT_COUNTS = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  Z: 0,
};

const tokenize = (d) => {
  const tokens = [];
  for (const [, command, args] of d.matchAll(/([a-zA-Z])([^a-zA-Z]*)/g)) {
    tokens.push({ command, args: (args.match(NUMBER) || []).map(Number) });
  }
  return tokens;
};

const parsePath = (d) => {
  const subpaths = [];
  let segments = null;
  let current = { x: 0, y: 0 };
  let start = current;
  let lastControl = null; // For S and T reflections
  let lastCommand = "";

  const lineTo = (p3) => {
    segments.push({ p0: current, p3 });
    current = p3;
  };
  const curveTo = (p1, p2, p3) => {
    segments.push({ p0: current, p1, p2, p3 });
    current = p3;
  };

  for (const { command, args } of tokenize(d)) {
    const upper = command.toUpperCase();
    if (!(upper in ARGUMENT_COUNTS)) {
      throw new Error(`Unsupported path command "${command}" in: ${d}`);
    }
    const relative = command !== upper;
    const count = ARGUMENT_COUNTS[upper];
    let index = 0;
    do {
      const a = args.slice(index, index + count);
      index += count;
      const point = (x, y) =>
        relative ? { x: current.x + x, y: current.y + y } : { x, y };
      const reflect = () =>
        lastControl
          ? {
              x: 2 * current.x - lastControl.x,
              y: 2 * current.y - lastControl.y,
            }
          : current;
      let control = null;

      // A moveto followed by more pairs continues as lineto
      if (upper === "M" && index > count) {
        lineTo(point(a[0], a[1]));
      } else if (upper === "M") {
        segments = [];
        subpaths.push(segments);
        current = point(a[0], a[1]);
        start = current;
      } else if (upper === "L") {
        lineTo(point(a[0], a[1]));
      } else if (upper === "H") {
        lineTo({ x: relative ? current.x + a[0] : a[0], y: current.y });
      } else if (upper === "V") {
        lineTo({ x: current.x, y: relative ? current.y + a[0] : a[0] });
      } else if (upper === "C") {
        const p1 = point(a[0], a[1]);
        control = point(a[2], a[3]);
        curveTo(p1, control, point(a[4], a[5]));
      } else if (upper === "S") {
        const p1 = /[CS]/i.test(lastCommand) ? reflect() : current;
        control = point(a[0], a[1]);
        curveTo(p1, control, point(a[2], a[3]));
      } else if (upper === "Q" || upper === "T") {
        const q =
          upper === "Q"
            ? point(a[0], a[1])
            : /[QT]/i.test(lastCommand)
              ? reflect()
              : current;
        const p3 = upper === "Q" ? point(a[2], a[3]) : point(a[0], a[1]);
        const p0 = current;
        curveTo(
          {
            x: p0.x + (2 / 3) * (q.x - p0.x),
            y: p0.y + (2 / 3) * (q.y - p0.y),
          },
          {
            x: p3.x + (2 / 3) * (q.x - p3.x),
            y: p3.y + (2 / 3) * (q.y - p3.y),
          },
          p3,
        );
        control = q;
      } else if (upper === "Z") {
        if (current.x !== start.x || current.y !== start.y) lineTo(start);
      }
      lastControl = control;
      lastCommand = upper;
    } while (index < args.length && count > 0);
  }
  return subpaths.filter((subpath) => subpath.length > 0);
};

const pointAt = ({ p0, p1, p2, p3 }, t) => {
  if (!p1) {
    return { x: p0.x + (p3.x - p0.x) * t, y: p0.y + (p3.y - p0.y) * t };
  }
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const e = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + e * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + e * p3.y,
  };
};

// Polyline approximation; 200 steps keeps the error well under 0.01 units
const segmentLength = (segment) => {
  if (!segment.p1) {
    return Math.hypot(segment.p3.x - segment.p0.x, segment.p3.y - segment.p0.y);
  }
  let length = 0;
  let previous = segment.p0;
  for (let i = 1; i <= 200; i++) {
    const next = pointAt(segment, i / 200);
    length += Math.hypot(next.x - previous.x, next.y - previous.y);
    previous = next;
  }
  return length;
};

const reverseSegments = (segments) =>
  segments
    .slice()
    .reverse()
    .map(({ p0, p1, p2, p3 }) =>
      p1 ? { p0: p3, p1: p2, p2: p1, p3: p0 } : { p0: p3, p3: p0 },
    );

const formatNumber = (value) => String(+value.toFixed(3));

const formatPoint = ({ x, y }) => `${formatNumber(x)},${formatNumber(y)}`;

const serialize = (segments) =>
  `M${formatPoint(segments[0].p0)}` +
  segments
    .map(({ p1, p2, p3 }) =>
      p1
        ? `C${formatPoint(p1)},${formatPoint(p2)},${formatPoint(p3)}`
        : `L${formatPoint(p3)}`,
    )
    .join("");

module.exports = {
  formatNumber,
  parsePath,
  pointAt,
  reverseSegments,
  segmentLength,
  serialize,
};
