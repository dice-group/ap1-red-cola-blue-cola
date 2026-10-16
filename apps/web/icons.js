// Hand-drawn icon set for Red Cola vs Blue Cola.
// 24×24 grid, rounded 1.75 strokes, with a soft "tint" fill for depth.
// Kept as inline SVG so the demo stays offline and every icon shares one style.

const PAGE = "M6 3h8l4 4v14H6z";
const STAR = "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z";

const SHAPES = {
  // Roles
  shield: `<path class="tint" d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>`,
  spy: `<path class="tint" d="M4 11L6 5l3 1.5h6L18 5l2 6z"/><path d="M3 11h18M4 11L6 5l3 1.5h6L18 5l2 6"/><circle cx="8" cy="16" r="3"/><circle cx="16" cy="16" r="3"/><path d="M11 16h2"/>`,

  // Attacks
  tie: `<path class="tint" d="M10 7h4l2 9-4 5-4-5z"/><path d="M9 3h6l-1 4h-4z"/><path d="M10 7l-2 9 4 5 4-5-2-9"/>`,
  "doc-alert": `<path class="tint" d="${PAGE}"/><path d="${PAGE}"/><path d="M14 3v4h4M12 10v4"/><circle class="dot" cx="12" cy="17" r="1"/>`,
  puzzle: `<path class="tint" d="M4 8h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4h-4a2 2 0 1 0-4 0H4v-4a2 2 0 1 0 0-4z"/><path d="M4 8h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4h-4a2 2 0 1 0-4 0H4v-4a2 2 0 1 0 0-4z"/>`,
  reformat: `<rect class="tint" x="3" y="3" width="12" height="10" rx="1.5"/><rect x="3" y="3" width="12" height="10" rx="1.5"/><path d="M3 8h12M9 3v10M10 18h10M17 15l3 3-3 3"/>`,

  // Defenses and checkpoints
  "id-card": `<rect class="tint" x="3" y="5" width="18" height="14" rx="2"/><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M15 10h3M15 13.5h3"/>`,
  gate: `<path class="tint" d="M3 8h18v4H3z"/><path d="M3 8h18v4H3zM7 8l-4 4M12 8l-4 4M17 8l-4 4M21 8l-4 4M5 12v8M19 12v8"/>`,
  wall: `<rect class="tint" x="3" y="5" width="18" height="14" rx="1"/><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19"/>`,
  history: `<circle class="tint" cx="12" cy="12" r="8"/><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v3.5h3.5M12 8v4l3 2"/>`,
  lens: `<circle class="tint" cx="10.5" cy="10.5" r="6"/><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>`,
  bot: `<rect class="tint" x="4" y="8" width="16" height="11" rx="3"/><rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 8V5.5M9.5 16h5"/><circle class="dot" cx="12" cy="4.5" r="1.2"/><circle class="dot" cx="9" cy="12.5" r="1.2"/><circle class="dot" cx="15" cy="12.5" r="1.2"/>`,

  // Identities
  visitor: `<circle class="tint" cx="12" cy="8" r="4"/><circle cx="12" cy="8" r="4"/><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>`,
  truck: `<path class="tint" d="M3 7h11v9H3z"/><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>`,
  briefcase: `<rect class="tint" x="3" y="7" width="18" height="12" rx="2"/><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18"/>`,
  crown: `<path class="tint" d="M4 8l4 4 4-6 4 6 4-4-2 10H6z"/><path d="M4 8l4 4 4-6 4 6 4-4-2 10H6z"/>`,

  // Documents
  doc: `<path class="tint" d="${PAGE}"/><path d="${PAGE}"/><path d="M14 3v4h4M9 12h6M9 16h6"/>`,
  folder: `<path class="tint" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>`,
  lock: `<rect class="tint" x="5" y="10" width="14" height="10" rx="2"/><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2.5"/>`,
  unlock: `<rect class="tint" x="5" y="10" width="14" height="10" rx="2"/><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.6-1.8M12 14v2.5"/>`,
  books: `<path class="tint" d="M4 4h5v16H4zM10 4h5v16h-5z"/><path d="M4 4h5v16H4zM10 4h5v16h-5zM16 5.5l3.8-1 3.4 14.6-3.8 1z"/>`,

  // Missions
  door: `<path class="tint" d="M6 3h10v18H6z"/><path d="M4 21h16M6 21V3h10v18M16 5l3 1v15"/><circle class="dot" cx="13" cy="12" r="1.1"/>`,
  eye: `<path class="tint" d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>`,
  vault: `<rect class="tint" x="3" y="4" width="18" height="15" rx="2"/><rect x="3" y="4" width="18" height="15" rx="2"/><circle cx="12" cy="11.5" r="4"/><path d="M12 7.5V9M12 14v1.5M8 11.5h1.5M14.5 11.5H16M6 19v2M18 19v2"/>`,

  // Signals and outcomes
  siren: `<path class="tint" d="M6 18v-5a6 6 0 0 1 12 0v5z"/><path d="M6 18v-5a6 6 0 0 1 12 0v5M4 18h16v2.5H4zM12 3v1.5M4.2 6.2l1 1M19.8 6.2l-1 1"/>`,
  warning: `<path class="tint" d="M12 4l9 16H3z"/><path d="M12 4l9 16H3zM12 10v4"/><circle class="dot" cx="12" cy="17" r="1"/>`,
  stop: `<path class="tint" d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><path d="M8 3h8l5 5v8l-5 5H8l-5-5V8zM8 12h8"/>`,
  check: `<circle class="tint" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>`,
  cross: `<circle class="tint" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>`,
  minus: `<circle class="tint" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M8.5 12h7"/>`,
  key: `<circle class="tint" cx="8" cy="15" r="4"/><circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2M14 9l2 2"/>`,
  bulb: `<path class="tint" d="M9 16a6 6 0 1 1 6 0v2H9z"/><path d="M9 16a6 6 0 1 1 6 0v2H9zM10 21h4"/>`,
  notes: `<rect class="tint" x="5" y="5" width="14" height="16" rx="2"/><rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 5V3.5h6V5M8.5 11h7M8.5 15h5"/>`,
  flag: `<path class="tint" d="M5 4h12l-2 4 2 4H5z"/><path d="M5 21V4h12l-2 4 2 4H5"/>`,
  people: `<circle class="tint" cx="9" cy="8" r="3"/><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.8-3 2.9-4.5 5.5-4.5s4.7 1.5 5.5 4.5M16 5.5a3 3 0 0 1 0 5.5M17.5 14.7c1.6.6 2.6 2 3 4.3"/>`,
  gauge: `<path class="tint" d="M4 16a8 8 0 1 1 16 0z"/><path d="M4 16a8 8 0 1 1 16 0M12 16l4-5M3 16h18"/>`,
  target: `<circle class="tint" cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>`,
  trophy: `<path class="tint" d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 20h8"/>`,
  star: `<path class="tint" d="${STAR}"/><path d="${STAR}"/>`,
  hourglass: `<path class="tint" d="M7 3h10v3l-5 6-5-6z"/><path d="M6 3h12M6 21h12M7 3v3l5 6 5-6V3M7 21v-3l5-6 5 6v3"/>`,

  // Actions
  play: `<path class="tint" d="M7 4l13 8-13 8z"/><path d="M7 4l13 8-13 8z"/>`,
  replay: `<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4.5h-4.5"/>`,
  undo: `<path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4.5h4.5"/>`,
  info: `<circle class="tint" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle class="dot" cx="12" cy="7.8" r="1.1"/>`,
  sun: `<circle class="tint" cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`,
  moon: `<path class="tint" d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>`,
};

const SVG_NS = "http://www.w3.org/2000/svg";

// An icon as an inline SVG element. Decorative unless `label` is given.
export function icon(name, { label, className = "" } = {}) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", `ico ${className}`.trim());
  svg.innerHTML = SHAPES[name] ?? SHAPES.info;
  if (label) {
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label);
  } else {
    svg.setAttribute("aria-hidden", "true");
  }
  return svg;
}

// A big icon set inside a serrated bottle cap: the demo's signature emblem.
export function capIcon(name, { tone = "" } = {}) {
  const cap = document.createElement("span");
  cap.className = `cap-emblem ${tone}`.trim();
  cap.append(icon(name));
  return cap;
}
