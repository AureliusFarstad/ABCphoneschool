// How each letter is written, where it differs from the letter's SVG.
//
// By default every path in raw-assets/alphabet/vector/<case>/<letter>.svg is
// one stroke, drawn in the order and direction the path was drawn in. Empty
// paths are skipped, so path 0 is the first path that draws something.
// A letter's entry can override that:
//
//   strokes: list of strokes in writing order, each
//     path:     index of the path in the SVG
//     segments: [from, to] to draw only part of the path, as segment indices
//               (end exclusive)
//     reverse:  draw the path, or the part of it, end to start
//     parts:    instead of path, a list of { path, segments, reverse } to
//               draw as one stroke without lifting the pencil
//     duration: milliseconds to draw the stroke
//   lifts: milliseconds the pencil takes to move to each next stroke
//   offset: { x, y } nudge, in SVG units, from the centered position
//
// Letters follow the hand-made animations: start at the top, and draw the
// big line down first, then jump back to the top for the rest.

module.exports = {
  // Big line down, big line down, little line across
  uppercase_h: { strokes: [{ path: 0 }, { path: 2 }, { path: 1 }] },

  // Big line down, little line across the top, little line across the bottom
  // (only used with --regenerate, I has a hand-made animation)
  uppercase_i: { strokes: [{ path: 1 }, { path: 0 }, { path: 2 }] },

  // Big line down and hook, then the little line across the top
  uppercase_j: { strokes: [{ path: 1 }, { path: 0 }] },

  // The SVG draws M in one go from the bottom left. Draw the left line down,
  // then jump to the top for the rest, like N
  uppercase_m: {
    strokes: [
      { path: 0, segments: [0, 3], reverse: true },
      { path: 0, segments: [3, 10] },
    ],
  },

  // The SVG draws N from the top right. Match the hand-made animation: left
  // line down, jump to the top, slide down, line up
  // (only used with --regenerate)
  uppercase_n: {
    strokes: [
      { path: 0, segments: [5, 8] },
      { path: 0, segments: [0, 5], reverse: true },
    ],
  },

  // Big line down, little line across the top (only used with --regenerate)
  uppercase_t: { strokes: [{ path: 1 }, { path: 0 }] },

  // The SVG splits W into three paths; draw it in one go
  uppercase_w: {
    strokes: [{ parts: [{ path: 0 }, { path: 1 }, { path: 2 }] }],
  },

  // Both lines slide down
  uppercase_x: { strokes: [{ path: 0 }, { path: 1, reverse: true }] },

  // Slide down to the middle, then from the top right slide down to the
  // middle and keep going down
  uppercase_y: {
    strokes: [
      { path: 0, segments: [0, 3] },
      { parts: [{ path: 0, segments: [3, 5], reverse: true }, { path: 1 }] },
    ],
  },

  // Both lines slide down
  lowercase_x: { strokes: [{ path: 0 }, { path: 1, reverse: true }] },
};
