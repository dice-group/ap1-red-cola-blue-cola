// Red Cola vs Blue Cola: web interface.
// Renders only what the service returns; it never evaluates permissions and
// never holds the confidential knowledge base.

import { icon, sticker } from "./icons.js";

const main = document.getElementById("main");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  catalog: null,
  side: "home",
  screen: null,
  flipped: new Set(),
  red: {
    scenarioId: null, caseFile: null, incident: null, loading: false, found: new Set(), lastClue: null,
    rootCause: null, solved: false, defenseIds: new Set(), rounds: [], live: null, busy: false, error: null,
  },
  blue: {
    missionId: null, attackId: null, attempts: [], progress: {}, session: null, turns: [], viewTurn: 0,
    result: null, reveal: null, busy: false, error: null,
  },
};

const ICONS = {
  attack: { "claimed-authority": "tie", "document-instruction": "doc-alert", "partial-disclosure": "puzzle", "format-change": "reformat" },
  defense: { "verified-access": "id-card", "instruction-boundary": "wall", "least-privilege-history": "history", "content-review": "lens" },
  identity: { visitor: "visitor", supplier: "truck", employee: "briefcase", "recipe-owner": "crown" },
  classification: { public: "doc", internal: "folder", confidential: "lock" },
  checkpoint: { identity: "id-card", retrieval: "gate", context: "wall", assistant: "bot", session: "history", output: "lens" },
  mission: { "open-door": "door", "watchful-reviewer": "eye", "locked-vault": "vault" },
};

// An icon followed by text, kept on one line.
const ti = (name, ...text) => h("span", { class: "ti" }, icon(name), ...text);

// Short, game-style verdicts for each checkpoint decision.
const VERDICTS = {
  filtered: "Blocked the secret",
  allowed: "Nothing to block",
  unfiltered: "Let everything in",
  separated: "Held firm",
  "not-separated": "Breached",
  followed: "Fell for it",
  "not-followed": "Ignored the order",
  "not-trusted": "Didn't buy it",
  refused: "Refused",
  noted: "Watching",
  flagged: "Raised the alarm",
  blocked: "Blocked the reply",
  passed: "Missed it",
};
const STEPS = 6; // checkpoints per turn
const REPLY_AT = 4; // the reply appears once the assistant checkpoint is revealed

// --- API -------------------------------------------------------------------------

async function call(method, path, body) {
  const response = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

const api = {
  catalog: () => call("GET", "/api/catalog"),
  createSession: (role, scenarioId, defenseIds, missionId) => call("POST", "/api/sessions", { role, scenarioId, defenseIds, missionId }),
  session: (id) => call("GET", `/api/sessions/${id}`),
  turn: (id) => call("POST", `/api/sessions/${id}/turns`),
  legitimate: (id) => call("POST", `/api/sessions/${id}/legitimate`),
  result: (id) => call("GET", `/api/sessions/${id}/result`),
  investigation: (scenarioId) => call("GET", `/api/scenarios/${scenarioId}/investigation`),
  mission: (sessionId) => call("GET", `/api/sessions/${sessionId}/mission`),
};

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, reduceMotion ? 0 : ms));

// --- DOM helpers ---------------------------------------------------------------------

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === false || value == null) continue;
    if (key === "class") el.className = value;
    else if (key === "style") Object.assign(el.style, value); // CSSOM, allowed by the CSP
    else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else if (value === true) el.setAttribute(key, "");
    else el.setAttribute(key, value);
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

const byId = (list, id) => list.find((item) => item.id === id);
const scenarioForAttack = (attackId) => state.catalog.scenarios.find((s) => s.attackId === attackId);
const attackOf = (scenario) => byId(state.catalog.attacks, scenario.attackId);
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function shuffled(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// --- Navigation ------------------------------------------------------------------------
// Each screen lives in the URL hash (#/red/fix), so the browser's Back button works.

const FLOWS = {
  red: [["case", "Case"], ["investigate", "Investigate"], ["fix", "Fix"], ["replay", "Replay"], ["debrief", "Result"]],
  blue: [["mission", "Mission"], ["trick", "Trick"], ["heist", "Heist"], ["debrief", "Debrief"]],
};

const currentRoute = () => location.hash.replace(/^#\/?/, "");

function go(route) {
  if (currentRoute() === route) onRoute();
  else location.hash = `#/${route}`;
}

// The furthest screen of a flow that has something to show right now.
function reachable(side) {
  if (side === "red") return state.red.rounds.length ? 4 : state.red.live ? 3 : state.red.solved ? 2 : 1;
  return state.blue.reveal ? 3 : state.blue.session ? 2 : 1;
}

function onRoute() {
  const [side, screen] = currentRoute().split("/");
  if (side in FLOWS) {
    const ids = FLOWS[side].map(([id]) => id);
    const wanted = Math.max(ids.indexOf(screen), 0);
    const allowed = Math.min(wanted, reachable(side));
    if (ids[allowed] !== screen) {
      location.replace(`#/${side}/${ids[allowed]}`);
      return;
    }
    Object.assign(state, { side, screen });
  } else {
    Object.assign(state, { side: "home", screen: null });
  }
  render();
  main.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

window.addEventListener("hashchange", onRoute);
document.querySelectorAll("[data-icon]").forEach((el) => el.prepend(icon(el.dataset.icon)));

// --- Theme: light by default; the player can switch to dark, and the choice is remembered.
const themeToggle = document.getElementById("theme-toggle");
const currentTheme = () => document.documentElement.dataset.theme || "light";

function paintThemeToggle() {
  const dark = currentTheme() === "dark";
  themeToggle.replaceChildren(icon(dark ? "sun" : "moon"), h("span", { class: "theme-label" }, dark ? "Light" : "Dark"));
  themeToggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  themeToggle.setAttribute("aria-pressed", String(!dark));
}

themeToggle.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch (error) { /* not saved; still applied */ }
  paintThemeToggle();
});
paintThemeToggle();
document.querySelectorAll("[data-nav]").forEach((button) =>
  button.addEventListener("click", () => {
    const side = button.dataset.nav;
    go(side === "home" ? "" : `${side}/${FLOWS[side][0][0]}`);
  }),
);

function render() {
  document.body.dataset.side = state.side; // each side has its own world: case file or blueprint
  document.querySelectorAll("[data-nav]").forEach((button) => {
    if (button.dataset.nav === state.side) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  const views = { home: renderHome, red: renderRed, blue: renderBlue };
  main.replaceChildren(...[views[state.side]()].flat(Infinity).filter(Boolean));
}

function stepper(side) {
  const current = FLOWS[side].findIndex(([id]) => id === state.screen);
  const max = reachable(side);
  return h("ol", { class: `stepper ${side}-zone`, "aria-label": "Progress" }, FLOWS[side].map(([id, label], i) =>
    h("li", {},
      h("button", {
        type: "button",
        class: `step-pill${i === current ? " current" : i <= max ? " done" : ""}`,
        disabled: state[side].busy || i > max || i === current,
        "aria-current": i === current ? "step" : null,
        onclick: () => go(`${side}/${id}`),
      }, h("span", { class: "step-num" }, i + 1), h("span", { class: "step-label" }, label)))));
}

// A bar pinned to the bottom of the screen with the next action.
function dock(info, ...actions) {
  return h("div", { class: "dock" },
    h("div", { class: "dock-info" }, info),
    h("div", { class: "dock-actions" }, actions));
}

function modeHero(side) {
  const red = side === "red";
  return h("div", { class: `mode-hero compact ${side}` },
    h("div", { class: "title" },
      h("h1", { class: `wordmark ${red ? "script" : "punch"}` }, red ? "Red Cola" : "Blue Cola"),
      h("span", { class: "subtitle" }, red ? "Incident response" : "Heist Ops")),
    stepper(side));
}

// --- Investigation helpers ---------------------------------------------------------------------

function recapCard(items) {
  return h("div", { class: "recap" }, items.map(([iconName, label, value]) =>
    h("div", { class: "recap-item" },
      h("span", { class: "recap-icon" }, icon(iconName)),
      h("div", {}, h("span", { class: "card-label" }, label), h("strong", {}, value)))));
}

// During an investigation, anything that hides a clue can be inspected.
// `inspect` is { clueFor(target), found: Set, find(clue) }; targets look like "doc:<id>".
function inspectable(el, target, inspect) {
  const clue = inspect?.clueFor(target);
  if (!clue) return el;
  el.classList.add("inspectable");
  if (inspect.found.has(clue.id)) el.classList.add("inspected");
  if (el.tagName === "BUTTON") {
    el.disabled = false;
  } else {
    Object.assign(el, { tabIndex: 0 });
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", `Inspect: ${el.textContent.slice(0, 80)}`);
    el.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); inspect.find(clue); }
    });
  }
  el.addEventListener("click", () => inspect.find(clue));
  return el;
}

// Fix rating: is the recipe safe, is it the strongest outcome, and with how few cards?
function stars(result) {
  const { best, fewestCards } = result.rating;
  const cards = result.selectedDefenses.length;
  const safe = result.confidentiality.exposure === "none";
  const served = result.utility.completed === result.utility.executed;
  const score = !safe ? 0 : !best || !served ? 1 : cards > fewestCards ? 2 : 3;
  const notes = [
    "Still leaking. Go back to the evidence: which layer let the recipe reach the assistant?",
    "Safe, but the root cause isn't fully removed. Some risk remains. Can you close it?",
    `Root cause removed, but with ${plural(cards, "card")}. It can be done with ${plural(fewestCards, "card")}.`,
    "Perfect fix: the root cause is removed with the fewest cards.",
  ];
  return h("div", { class: "stars-card" },
    h("span", { class: "card-label" }, "Fix rating"),
    h("div", { class: "stars", role: "img", "aria-label": `${score} of 3 stars` },
      [0, 1, 2].map((i) => h("span", { class: i < score ? "on" : "" }, icon("star")))),
    h("p", {}, notes[score]));
}

function beforeAfter(before, after) {
  const vault = { none: ["good", "lock", "Recipe safe"], fragment: ["warn", "warning", "Partial leak"], full: ["bad", "siren", "Recipe leaked"] };
  const exposure = (r) => { const [tone, name, text] = vault[r.confidentiality.exposure]; return h("span", { class: `pill ${tone}` }, ti(name, text)); };
  const utility = (r) => `${r.utility.completed} of ${r.utility.executed} served`;
  const cost = (r) => {
    const c = r.operationalCost;
    const events = c.verifications + c.blocks + c.humanReviews;
    return events ? plural(events, "event") : "No extra effort";
  };
  const rows = [
    [ti("lock", "Confidentiality"), exposure(before), exposure(after)],
    [ti("people", "Utility"), utility(before), utility(after)],
    [ti("gauge", "Operational cost"), cost(before), cost(after)],
    [ti("shield", "Defenses"), "None", after.selectedDefenses.join(", ") || "None"],
  ];
  return h("div", { class: "arena table-scroll" },
    h("table", { class: "scoreboard compare" },
      h("thead", {}, h("tr", {}, h("th", { scope: "col" }, ""), h("th", { scope: "col" }, "Before: the incident"), h("th", { scope: "col" }, "After: your fix"))),
      h("tbody", {}, rows.map(([label, a, b]) => h("tr", {}, h("th", { scope: "row" }, label), h("td", {}, a), h("td", {}, b))))));
}

// --- Cards --------------------------------------------------------------------------------

// A selectable card with a front (at a glance) and a back (details), flipped by its ⓘ button.
function flipCard({ key, input, front, back, flag }) {
  const flipped = state.flipped.has(key);
  return h("div", { class: `card-slot${flipped ? " flipped" : ""}` },
    h("label", { class: "option" },
      h("input", input),
      h("div", { class: "game-card" },
        flag ? h("span", { class: "selected-flag" }, flag) : null,
        h("div", { class: "flip-inner" },
          h("div", { class: "face front", "aria-hidden": flipped ? "true" : null }, front),
          h("div", { class: "face back", "aria-hidden": flipped ? null : "true" }, back)))),
    h("button", {
      type: "button", class: "flip-btn", "aria-pressed": String(flipped),
      "aria-label": flipped ? "Show the card front" : "Show details",
      onclick: () => { flipped ? state.flipped.delete(key) : state.flipped.add(key); render(); },
    }, icon(flipped ? "undo" : "info")));
}

// Card fronts stay minimal: a big icon, the title, and one quiet line.
function cardFace({ icon, label, title, text, meta }) {
  return [
    icon ? sticker(icon) : null,
    label ? h("span", { class: "card-label" }, label) : null,
    title ? h("h3", {}, title) : null,
    text ? h("p", {}, text) : null,
    meta ? h("p", { class: "card-meta" }, meta) : null,
  ];
}

// --- Documents ------------------------------------------------------------------------------

const dialog = h("dialog", { class: "doc-dialog", "aria-labelledby": "doc-title" });
document.body.append(dialog);
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

function openDocument(doc, identity) {
  const body = doc.readable
    ? h("p", { class: "doc-text" }, highlighted(doc.text, doc.highlight))
    : h("p", { class: "doc-locked" }, ti("lock", `A ${identity} isn't allowed to read this document. Its contents never reach this page.`));
  dialog.replaceChildren(
    h("div", { class: `doc-sheet ${doc.classification}` },
      h("div", { class: "doc-head" },
        h("span", { class: `class-tag ${doc.classification}` }, ti(ICONS.classification[doc.classification], doc.classification)),
        h("button", { type: "button", class: "close-btn", "aria-label": "Close", onclick: () => dialog.close() }, "✕")),
      h("h2", { id: "doc-title" }, doc.title),
      body,
      doc.highlight && doc.readable
        ? h("p", { class: "doc-hint" }, ti("warning", "The highlighted passage is an instruction hidden inside the document. Will the assistant treat it as data, or obey it?"))
        : null));
  dialog.showModal();
}

function highlighted(text, passage) {
  const at = passage ? text.indexOf(passage) : -1;
  if (at < 0) return text;
  return [text.slice(0, at), h("mark", {}, passage), text.slice(at + passage.length)];
}

function docCard(doc, identity, status, enter = false) {
  return h("button", {
    type: "button", class: `doc ${doc.classification}${status ? ` ${status}` : ""}`,
    onclick: () => openDocument(doc, identity),
    "aria-label": `${doc.title}, ${doc.classification}${status === "denied" ? ", blocked by the permission gate" : status === "sent" ? ", given to the assistant" : ""}. Open.`,
  },
  h("span", { class: "doc-icon" }, icon(ICONS.classification[doc.classification])),
  h("span", { class: "doc-title" }, doc.title),
  h("span", { class: "doc-meta" },
    h("span", { class: `class-tag ${doc.classification}` }, doc.classification),
    doc.highlight ? h("span", { class: "class-tag warn" }, ti("warning", "hidden order")) : null),
  status === "denied" ? h("span", { class: `doc-stamp${enter ? " enter" : ""}`, "aria-hidden": "true" }, "Denied") : null);
}

function scene(scenario, { who, hint }) {
  return h("div", { class: "scene" },
    h("div", { class: "scene-who" },
      h("span", { class: "avatar neutral" }, icon(ICONS.identity[scenario.requesterRole])),
      h("div", {}, h("div", { class: "card-kicker" }, who), h("strong", {}, scenario.requesterRole))),
    h("div", { class: "scene-shelf" },
      h("div", { class: "card-kicker" }, ti("books", "Documents in play · tap to read")),
      h("div", { class: "shelf" }, scenario.documents.map((d) => docCard(d, scenario.requesterRole))),
      hint ? h("p", { class: "scene-hint" }, ti("warning", hint)) : null));
}

// --- The stage: one turn, checkpoint by checkpoint ----------------------------------------------

function stage(turn, scenario, { attackerWho, attacker = true, inspect = null }) {
  const k = turn.k ?? STEPS;
  const fresh = (step) => turn.animating && k === step; // only the newest step animates
  const docs = Object.fromEntries(scenario.documents.map((d) => [d.id, d]));
  const gateDone = k >= 2;
  const sent = turn.documents.filter((d) => d.status === "retrieved").map((d) => docs[d.id]);
  const secretInside = gateDone && sent.some((d) => d.classification === "confidential");
  // Narrate the checkpoint the player picked, else the latest one that made a call.
  const revealedWithSummary = turn.checkpoints.slice(0, k).reverse().filter((c) => c.summary);
  const focus = byId(turn.checkpoints, turn.focus)
    || revealedWithSummary.find((c) => c.tone !== "neutral") || revealedWithSummary[0];

  const lane = h("ol", { class: "lane", "aria-label": "Checkpoints" }, turn.checkpoints.map((c, i) => {
    const revealed = i < k;
    const verdict = !revealed ? "…" : c.id === "identity" ? scenario.requesterRole
      : c.decision ? VERDICTS[c.decision] || c.decision : c.equipped ? "Standing by" : "Not equipped";
    const mark = revealed && c.tone === "good" ? "✓ " : revealed && c.tone === "bad" ? "✕ " : "";
    return h("li", {}, inspectable(
      h("button", {
        type: "button",
        class: `checkpoint ${revealed ? `revealed ${c.tone}` : "pending"}${c.equipped ? "" : " off"}${focus?.id === c.id ? " focused" : ""}${fresh(i + 1) ? " enter" : ""}`,
        disabled: !revealed || !c.summary,
        onclick: () => { turn.focus = c.id; render(); },
        "aria-label": `${c.label}: ${verdict}${c.equipped ? "" : " (not equipped)"}`,
      },
      h("span", { class: "cp-icon" }, icon(ICONS.checkpoint[c.id])),
      h("span", { class: "cp-label" }, c.label),
      h("span", { class: "cp-verdict" }, mark, verdict)), `checkpoint:${c.id}`, inspect));
  }));

  return h("div", { class: "stage" },
    inspectable(message({ from: "user", avatar: attacker ? "spy" : ICONS.identity[scenario.requesterRole], avatarClass: attacker ? "blue" : "neutral",
      who: attackerWho, text: turn.request, attacker, enter: fresh(0) }), `request:${turn.turn}`, inspect),
    lane,
    h("p", { class: "narration", "aria-live": "polite" },
      focus ? [h("strong", {}, ti(ICONS.checkpoint[focus.id], `${focus.label}:`)), " ", focus.summary] : "The request enters Red Cola's assistant…"),
    h("div", { class: "flow" },
      h("div", { class: "flow-col" },
        h("div", { class: "card-kicker" }, ti("books", "Knowledge base")),
        h("div", { class: "shelf" }, turn.documents.map((d) =>
          inspectable(docCard(docs[d.id], scenario.requesterRole, !gateDone ? null : d.status === "blocked" ? "denied" : "sent", fresh(2)), `doc:${d.id}`, inspect)))),
      h("div", { class: "flow-arrow", "aria-hidden": "true" }, "→"),
      h("div", { class: `flow-col context${secretInside ? " hot" : ""}` },
        h("div", { class: "card-kicker" }, ti("eye", "What the assistant can see")),
        gateDone
          ? h("div", { class: "context-docs" }, sent.map((d) =>
            h("span", { class: `context-doc ${d.classification}${fresh(2) ? " enter" : ""}` }, ti(ICONS.classification[d.classification], d.title))))
          : h("p", { class: "muted small" }, "Waiting for the permission gate…"),
        secretInside ? h("p", { class: "secret-alert" }, ti("siren", "The secret recipe is in the assistant's head")) : null)),
    k >= REPLY_AT - 1
      ? inspectable(message({ from: "assistant", avatar: "bot", avatarClass: "red", who: "Red Cola assistant",
        text: k >= REPLY_AT ? turn.response : null, mode: turn.mode, enter: fresh(REPLY_AT - 1) || fresh(REPLY_AT),
        leak: k >= REPLY_AT && turn.newlyDisclosed > 0 ? `${plural(turn.newlyDisclosed, "recipe piece")} leaked` : null }), `reply:${turn.turn}`, inspect)
      : null);
}

function message({ from, avatar, avatarClass, who, text, mode, leak, attacker, enter }) {
  const isAssistant = from === "assistant";
  const mono = text && (text.includes("\n|") || text.startsWith("|"));
  return h("div", { class: `msg from-${isAssistant ? "assistant" : "user"}${attacker ? " attacker" : ""}${enter ? " enter" : ""}` },
    h("div", { class: `avatar ${avatarClass}` }, icon(avatar)),
    h("div", { class: "bubble" },
      h("div", { class: "who" }, who, mode ? h("span", { class: "sim-tag" }, mode) : null),
      text == null
        ? h("div", { class: "typing", role: "status", "aria-label": "The assistant is typing" }, h("span"), h("span"), h("span"))
        : h("p", { class: `text${mono ? " mono" : ""}` }, text),
      leak ? h("span", { class: "leak-tag" }, ti("siren", leak)) : null));
}

// Reveal a turn one checkpoint at a time, like a replay.
async function playTurn(turn) {
  Object.assign(turn, { focus: null, animating: true });
  for (let k = 0; k <= STEPS; k++) {
    turn.k = k;
    render();
    await pause(k === REPLY_AT - 1 ? 1000 : 700);
  }
  turn.animating = false;
}

function moveTabs(turns, active, onSelect) {
  if (turns.length < 2) return null;
  return h("div", { class: "move-tabs", role: "group", "aria-label": "Moves" }, turns.map((t, i) =>
    h("button", { type: "button", class: "move-tab", "aria-pressed": String(i === active), onclick: () => onSelect(i) },
      `Move ${i + 1}`, t.newlyDisclosed ? icon("siren", { label: "leaked" }) : "")));
}

// --- Results --------------------------------------------------------------------------------

function caps(total, taken, { reveal = false } = {}) {
  return h("div", { class: "caps", "aria-hidden": "true" },
    Array.from({ length: total }, (_, i) =>
      h("span", { class: `cap ${i < taken ? "taken" : reveal ? "safe" : ""}` }, i < taken ? "✕" : reveal ? icon("lock") : "?")));
}

function banner(result, { perspective }) {
  const copy = perspective === "red"
    ? {
      none: ["good", "Vault secured", "Blue Cola walked away empty-handed."],
      fragment: ["warn", "Partial leak", "Some of the recipe got out."],
      full: ["bad", "Recipe stolen!", "Blue Cola has the full recipe."],
    }
    : {
      none: ["bad", "Busted", "Red Cola's assistant gave nothing away."],
      fragment: ["warn", "Partial loot", "You got some of the recipe, but not all."],
      full: ["good", "Heist complete!", "You walked off with the full recipe."],
    };
  const [tone, stamp, line] = copy[result.confidentiality.exposure];
  return h("div", { class: `result-banner ${tone}` },
    h("div", { class: "stamp", id: `${perspective}-focus`, tabindex: "-1" }, stamp),
    h("p", {}, line));
}

function hud(result, { perspective }) {
  const c = result.confidentiality;
  const taken = c.disclosed.length;
  const vault = { none: ["good", "Recipe safe"], fragment: ["warn", `${taken} of ${c.total} leaked`], full: ["bad", "Recipe leaked"] }[c.exposure];
  const u = result.utility;
  const utility = perspective === "blue" || u.executed === 0
    ? ["", "Not measured", null]
    : u.completed === u.executed ? ["good", `${u.completed} of ${u.executed} served`, 1] : ["bad", `${u.completed} of ${u.executed} served`, u.completed / u.executed];
  const cost = result.operationalCost;
  const events = cost.verifications + cost.blocks + cost.humanReviews;

  return h("div", { class: "hud", role: "group", "aria-label": "Outcome indicators" },
    h("div", { class: `stat ${vault[0]}` },
      h("div", { class: "label" }, ti("lock", "Confidentiality")),
      h("div", { class: "value" }, vault[1]),
      caps(c.total, taken, { reveal: true }),
      taken ? h("div", { class: "detail" }, c.disclosed.join(", ")) : null),
    h("div", { class: `stat ${utility[0]}` },
      h("div", { class: "label" }, ti("people", "Utility")),
      h("div", { class: "value" }, utility[1]),
      utility[2] != null ? h("div", { class: "meter", "aria-hidden": "true" }, h("span", { style: { width: `${utility[2] * 100}%` } })) : null),
    h("div", { class: "stat" },
      h("div", { class: "label" }, ti("gauge", "Operational cost")),
      h("div", { class: "value" }, events ? plural(events, "event") : "No extra effort"),
      events
        ? h("div", { class: "detail effort" }, ti("id-card", plural(cost.verifications, "check")), ti("stop", plural(cost.blocks, "block")), ti("eye", plural(cost.humanReviews, "review")))
        : null));
}

function lesson(result, { mitigation } = {}) {
  return h("div", { class: "lesson" },
    h("div", { class: "lesson-head" }, h("span", { class: "lesson-icon" }, icon("bulb")), h("p", {}, result.explanation)),
    h("details", {},
      h("summary", {}, "Why? Dig deeper"),
      h("div", { class: "lesson-grid" },
        h("section", {}, h("h3", {}, ti("shield", "Layer that acted")),
          result.actingDefenses.length
            ? h("ul", {}, result.actingDefenses.map((d) => h("li", {}, h("strong", {}, d.title), `. ${d.limitation}`)))
            : h("p", {}, "None. This is the vulnerable teaching example.")),
        mitigation ? h("section", {}, h("h3", {}, ti("shield", "What would have stopped it")), h("p", {}, mitigation)) : null,
        h("section", {}, h("h3", {}, ti("warning", "Risk that remains")), h("p", {}, result.remainingRisk)),
        h("section", {}, h("h3", {}, ti("flag", "Limits to remember")), h("ul", {}, result.limitations.map((l) => h("li", {}, l)))))));
}

function errorNotice(error) {
  return error ? h("p", { class: "notice error", role: "alert" }, error.message) : null;
}

// --- Home ------------------------------------------------------------------------------------

function renderHome() {
  return [
    h("h1", { class: "visually-hidden" }, "Red Cola versus Blue Cola"),
    h("div", { class: "versus" },
      h("button", { type: "button", class: "side red", onclick: () => go("red/case") },
        h("span", { class: "role-chip" }, ti("shield", "Defender")),
        h("span", { class: "wordmark script" }, "Red Cola"),
        h("span", { class: "tagline" }, "The recipe leaked. Find out how, and fix it."),
        h("span", { class: "cta" }, "Open a case →")),
      h("div", { class: "vs-badge", "aria-hidden": "true" }, "VS"),
      h("button", { type: "button", class: "side blue", onclick: () => go("blue/mission") },
        h("span", { class: "role-chip" }, ti("spy", "Attacker")),
        h("span", { class: "wordmark punch" }, "Blue Cola"),
        h("span", { class: "tagline" }, "Trick the AI into spilling the recipe."),
        h("span", { class: "cta" }, "Plan the heist →"))),
    h("div", { class: "briefing" },
      h("div", { class: "how" },
        h("div", { class: "step" }, h("div", { class: "num" }, "01"), h("h3", {}, "Pick a side"), h("p", {}, "Then swap and replay.")),
        h("div", { class: "step" }, h("div", { class: "num" }, "02"), h("h3", {}, "Play your cards"), h("p", {}, "Tap ", icon("info", { className: "inline" }), " to flip any card.")),
        h("div", { class: "step" }, h("div", { class: "num" }, "03"), h("h3", {}, "Watch the checkpoints"), h("p", {}, "See where the secret is stopped, or isn't."))),
      h("div", { class: "vault" },
        h("h3", {}, ti("lock", "The secret recipe")),
        caps(3, 0),
        h("p", {}, "Three secret pieces in Red Cola's knowledge base. All responses are scripted and labeled simulated."))),
  ];
}

// --- RED COLA: investigate, fix, prove ---------------------------------------------------------

function renderRed() {
  const red = state.red;
  red.scenarioId ??= state.catalog.scenarios[0].id;
  const scenario = byId(state.catalog.scenarios, red.scenarioId);
  const screens = { case: redCase, investigate: redInvestigate, fix: redFix, replay: redReplay, debrief: redDebrief };
  return [modeHero("red"), screens[state.screen](scenario)];
}

function resetCase(scenarioId) {
  Object.assign(state.red, {
    scenarioId, caseFile: null, incident: null, loading: false, found: new Set(), lastClue: null,
    rootCause: null, solved: false, defenseIds: new Set(), rounds: [], live: null, error: null,
  });
}

function redCase(scenario) {
  const red = state.red;
  return [
    h("fieldset", { class: "step-block red-zone" },
      h("legend", { class: "screen-title" }, "Pick a case"),
      h("p", { class: "step-hint" }, "The recipe has leaked. Find out how, fix it, and prove the fix works."),
      h("div", { class: "grid big" }, state.catalog.scenarios.map((s, i) =>
        h("div", { class: "card-slot" },
          h("label", { class: "option" },
            h("input", { type: "radio", name: "red-case", value: s.id, checked: s.id === red.scenarioId,
              onchange: () => { resetCase(s.id); render(); } }),
            h("div", { class: "game-card" },
              h("span", { class: "selected-flag" }, "Open"),
              h("div", { class: "face" }, cardFace({ icon: "folder", label: `Case 0${i + 1}`, title: s.incident.title, text: s.incident.summary,
                meta: ti(ICONS.identity[s.requesterRole], `From a ${s.requesterRole}'s chat`) })))))))),
    dock(
      ti("folder", scenario.incident.title),
      h("button", { type: "button", class: "btn primary big", onclick: () => go("red/investigate") }, "Open the case →")),
  ];
}

async function loadCase() {
  const red = state.red;
  const scenarioId = red.scenarioId;
  red.loading = true;
  try {
    const [caseFile, session] = await Promise.all([
      api.investigation(scenarioId),
      api.createSession("red", scenarioId, []), // the incident: no defenses
    ]);
    const turns = [];
    for (let s = session; s.nextRequest; s = await api.session(session.id)) turns.push(await api.turn(session.id));
    const legitimate = await api.legitimate(session.id);
    const result = await api.result(session.id);
    if (red.scenarioId !== scenarioId) return; // the player switched cases meanwhile
    caseFile.rootCauses = shuffled(caseFile.rootCauses); // the right answer shouldn't always come first
    Object.assign(red, { caseFile, incident: { turns, legitimate, result, viewTurn: 0 } });
  } catch (error) {
    red.error = error;
  } finally {
    red.loading = false;
    render();
  }
}

function redInvestigate(scenario) {
  const red = state.red;
  if (!red.incident) {
    if (!red.loading && !red.error) loadCase();
    return [errorNotice(red.error) || h("p", { class: "muted" }, "Opening the case file…")];
  }
  const { caseFile, incident } = red;
  const keyClues = caseFile.clues.filter((c) => c.key);
  const foundKeys = keyClues.filter((c) => red.found.has(c.id)).length;
  const allKeys = foundKeys === keyClues.length;
  const inspect = {
    clueFor: (target) => caseFile.clues.find((c) => c.target === target),
    found: red.found,
    find: (clue) => { red.found.add(clue.id); red.lastClue = clue.id; render(); },
  };
  const turn = incident.turns[incident.viewTurn];
  const found = caseFile.clues.filter((c) => red.found.has(c.id));
  const chosen = byId(caseFile.rootCauses, red.rootCause);

  const report = h("div", { class: "case-report" },
    h("div", {},
      h("span", { class: "card-label" }, ti("siren", "Incident report")),
      h("h2", {}, caseFile.title),
      h("p", {}, caseFile.summary)),
    h("div", { class: "clue-meter", role: "status" },
      h("span", { class: "clue-count" }, ti("key", `${foundKeys} / ${keyClues.length}`)),
      h("span", { class: "muted" }, "key clues found")));

  const evidence = h("section", { class: "arena match evidence" },
    h("div", { class: "arena-head" },
      h("h2", {}, ti("lens", "The evidence")),
      moveTabs(incident.turns, incident.viewTurn, (i) => { incident.viewTurn = i; render(); })),
    h("p", { class: "step-hint" }, "Tap anything that looks suspicious: messages, documents, checkpoints. Not every clue matters."),
    stage(turn, scenario, { attackerWho: `Requester (${scenario.requesterRole})`, attacker: false, inspect }));

  const notes = h("section", { class: "case-notes" },
    h("h2", {}, ti("notes", "Case notes")),
    found.length
      ? h("ul", {}, [...found].sort((a, b) => (b.id === red.lastClue) - (a.id === red.lastClue)).map((c) =>
        h("li", { class: `note${c.key ? " key" : ""}${c.id === red.lastClue ? " latest" : ""}` },
          h("span", { class: "note-tag" }, c.key ? ti("key", "Key clue") : ti("minus", "Red herring")),
          h("strong", {}, c.title),
          h("p", {}, c.explanation))))
      : h("p", { class: "muted" }, "Nothing yet. Start with what the assistant was given, and what it said."));

  const rootCause = allKeys
    ? h("fieldset", { class: "root-cause" },
      h("legend", { class: "call-q" }, "What's the root cause?"),
      caseFile.rootCauses.map((r) =>
        h("label", { class: `cause${red.rootCause === r.id ? (r.correct ? " right" : " wrong") : ""}` },
          h("input", { type: "radio", name: "root-cause", value: r.id, checked: red.rootCause === r.id, disabled: red.solved,
            onchange: () => { red.rootCause = r.id; red.solved = r.correct; render(); } }),
          h("span", {}, r.text))),
      chosen ? h("p", { class: `cause-feedback ${chosen.correct ? "good" : "bad"}`, role: "status" },
        chosen.correct ? "✓ " : "✕ ", chosen.feedback) : null)
    : null;

  return [
    report,
    h("div", { class: "investigation" }, evidence, h("div", { class: "side-col" }, notes, rootCause)),
    dock(
      red.solved ? ti("check", "Case solved. Time to fix it.") : allKeys ? ti("key", "All key clues found. Name the root cause.") : ti("key", `${foundKeys} of ${keyClues.length} key clues found`),
      h("button", { type: "button", class: "btn", onclick: () => go("red/case") }, "← Cases"),
      h("button", { type: "button", class: "btn primary big", disabled: !red.solved, onclick: () => go("red/fix") }, "Next: choose the fix →")),
  ];
}

function redFix() {
  const red = state.red;
  const cause = byId(red.caseFile.rootCauses, red.rootCause);
  return [
    recapCard([["lens", "Root cause", cause.text]]),
    h("fieldset", { class: "step-block red-zone" },
      h("legend", { class: "screen-title" }, "Choose the fix"),
      h("p", { class: "step-hint" }, "Every layer adds operational cost. Pick what removes the root cause, not just its symptoms."),
      h("div", { class: "grid big" }, state.catalog.defenses.map((d) => flipCard({
        key: `defense-${d.id}`,
        flag: "Equipped",
        input: { type: "checkbox", value: d.id, checked: red.defenseIds.has(d.id),
          onchange: (event) => {
            event.target.checked ? red.defenseIds.add(d.id) : red.defenseIds.delete(d.id);
            document.getElementById("loadout-count").textContent = loadoutCount();
          } },
        front: cardFace({ icon: ICONS.defense[d.id], title: d.title, meta: `Acts at: ${d.layer}` }),
        back: cardFace({ label: "How it works", text: d.explanation, meta: `Limit: ${d.limitation}` }),
      })))),
    dock(
      ti("shield", h("span", { id: "loadout-count" }, loadoutCount())),
      h("button", { type: "button", class: "btn", onclick: () => go("red/investigate") }, "← Evidence"),
      h("button", { type: "button", class: "btn primary big", onclick: runRedRound }, "▶ Replay the attack")),
  ];
}

function loadoutCount() {
  return `${state.red.defenseIds.size} of ${state.catalog.defenses.length} equipped`;
}

async function runRedRound() {
  const red = state.red;
  const live = { number: red.rounds.length + 1, turns: [], viewTurn: 0, legitimate: null, result: null };
  Object.assign(red, { busy: true, error: null, live });
  go("red/replay");
  try {
    let session = await api.createSession("red", red.scenarioId, [...red.defenseIds]);
    while (session.nextRequest) {
      const turn = await api.turn(session.id);
      live.turns.push(turn);
      live.viewTurn = live.turns.length - 1;
      await playTurn(turn);
      await pause(500);
      session = await api.session(session.id);
    }
    live.legitimate = await api.legitimate(session.id);
    live.result = await api.result(session.id);
    red.rounds.push(live);
  } catch (error) {
    red.error = error;
  } finally {
    Object.assign(red, { busy: false, live: null });
    render();
    document.getElementById("red-next")?.focus();
  }
}

function redReplay(scenario) {
  const red = state.red;
  const round = red.live || red.rounds.at(-1);
  const back = h("button", { type: "button", class: "btn", onclick: () => go("red/fix") }, "← Adjust the fix");
  if (!round) return [errorNotice(red.error), dock("", back)];
  const turn = round.turns[round.viewTurn];
  return [
    h("section", { class: "arena match" },
      h("div", { class: "arena-head" },
        h("h2", {}, ti("replay", `Same attack, attempt ${round.number}`)),
        moveTabs(round.turns, round.viewTurn, (i) => { round.viewTurn = i; render(); })),
      turn ? stage(turn, scenario, { attackerWho: `Blue Cola (as ${scenario.requesterRole})` })
        : h("p", { class: "muted" }, "Replaying the attack against your fix…")),
    errorNotice(red.error),
    dock(
      red.busy ? ti("hourglass", "Replaying the attack… watch the checkpoints") : ti("check", "Replay over. See whether your fix held."),
      red.busy ? null : back,
      red.busy ? null : h("button", { type: "button", id: "red-next", class: "btn primary big", onclick: () => go("red/debrief") }, "See the result →")),
  ];
}

function redDebrief(scenario) {
  const red = state.red;
  const round = red.rounds.at(-1);
  const leaked = round.result.confidentiality.exposure !== "none";
  return [
    banner(round.result, { perspective: "red" }),
    h("div", { class: "debrief-top" }, beforeAfter(red.incident.result, round.result), stars(round.result)),
    utilityLine(round.legitimate, scenario.requesterRole),
    lesson(round.result),
    red.rounds.length > 1 ? renderScoreboard(red.rounds) : null,
    dock(
      `Attempt ${round.number}`,
      leaked
        ? h("button", { type: "button", class: "btn", onclick: () => go("red/investigate") }, "← Evidence")
        : h("button", { type: "button", class: "btn", onclick: () => go("red/case") }, "New case"),
      leaked ? null : h("button", { type: "button", class: "btn", onclick: () => { state.blue.attackId = scenario.attackId; newBlueAttempt(); go("blue/mission"); } },
        ti("spy", "Play as Blue Cola")),
      h("button", { type: "button", class: "btn primary big", onclick: () => go("red/fix") }, leaked ? "↻ Adjust the fix" : "↻ Try another fix")),
  ];
}

function utilityLine(legitimate, identity) {
  return h("div", { class: `utility-line ${legitimate.completed ? "good" : "bad"}` },
    h("span", { class: "card-kicker" }, ti("people", "Utility check")),
    h("span", {}, `A ${identity} asks “${legitimate.request}”`),
    h("span", { class: "muted" }, `→ “${legitimate.response}”`),
    h("span", { class: `pill ${legitimate.completed ? "good" : "bad"}` }, legitimate.completed ? "✓ Served" : "✕ Blocked"));
}

function renderScoreboard(rounds) {
  const vault = { none: ["good", "Safe"], fragment: ["warn", "Partial"], full: ["bad", "Stolen"] };
  return h("section", { class: "round-block" },
    h("h2", { class: "section-title" }, ti("trophy", "Scoreboard")),
    h("div", { class: "arena table-scroll" },
      h("table", { class: "scoreboard" },
        h("thead", {}, h("tr", {}, ["Round", "Loadout", "Confidentiality", "Utility", "Operational cost"].map((c) => h("th", { scope: "col" }, c)))),
        h("tbody", {}, rounds.map(({ number, result }) => {
          const cost = result.operationalCost;
          const [tone, text] = vault[result.confidentiality.exposure];
          return h("tr", {},
            h("td", {}, `#${number}`),
            h("td", {}, result.selectedDefenses.join(", ") || "Nothing equipped"),
            h("td", {}, h("span", { class: `pill ${tone}` }, text)),
            h("td", {}, `${result.utility.completed} of ${result.utility.executed}`),
            h("td", {}, plural(cost.verifications + cost.blocks + cost.humanReviews, "event")));
        })))));
}

// --- BLUE COLA: missions against hidden defenses -----------------------------------------------

function renderBlue() {
  const blue = state.blue;
  blue.missionId ??= state.catalog.missions[0].id;
  blue.attackId ??= state.catalog.attacks[0].id;
  const mission = byId(state.catalog.missions, blue.missionId);
  const screens = { mission: blueMission, trick: blueTrick, heist: blueHeist, debrief: blueDebrief };
  return [modeHero("blue"), screens[state.screen](mission)];
}

function startMission(missionId) {
  Object.assign(state.blue, { missionId, attempts: [], session: null, turns: [], viewTurn: 0, result: null, reveal: null, error: null });
}

const missionOver = (mission) =>
  state.blue.attempts.length >= mission.attempts || state.blue.attempts.some((a) => a.result.confidentiality.exposure === "full");

// Where an attempt was stopped, in checkpoint terms, or null if it got through.
function stoppedAt(attempt) {
  if (attempt.result.confidentiality.exposure !== "none") return null;
  return attempt.turns.flatMap((t) => t.checkpoints).find((c) => c.id !== "identity" && c.tone === "good") ?? null;
}

function attemptVerdict(attempt) {
  const stop = stoppedAt(attempt);
  if (stop) return [ti(ICONS.checkpoint[stop.id], `Stopped at ${stop.label}`), "bad"];
  return attempt.result.confidentiality.exposure === "full" ? [ti("siren", "Got the full recipe"), "good"] : [ti("puzzle", "Got part of it"), "warn"];
}

function blueMission() {
  const blue = state.blue;
  return [
    h("fieldset", { class: "step-block blue-zone" },
      h("legend", { class: "screen-title" }, "Pick a mission"),
      h("p", { class: "step-hint" }, "You can't see Red Cola's defenses. Find out by trying, and adapt."),
      h("div", { class: "grid big three" }, state.catalog.missions.map((m, i) => {
        const record = blue.progress[m.id];
        return h("div", { class: "card-slot" },
          h("label", { class: "option" },
            h("input", { type: "radio", name: "blue-mission", value: m.id, checked: m.id === blue.missionId,
              onchange: () => { startMission(m.id); render(); } }),
            h("div", { class: "game-card" },
              h("span", { class: "selected-flag" }, "Selected"),
              h("div", { class: "face" }, cardFace({
                icon: ICONS.mission[m.id], label: `Mission 0${i + 1}`, title: m.title, text: m.briefing,
                meta: record
                  ? (record.won ? ti("check", `Cracked in ${plural(record.tries, "try")}`) : ti("cross", "The defenses held"))
                  : ti("lock", `Defenses unknown · ${plural(m.attempts, "attempt")}`),
              })))));
      }))),
    dock(
      ti(ICONS.mission[blue.missionId], byId(state.catalog.missions, blue.missionId).title),
      h("button", { type: "button", class: "btn primary big", onclick: () => go("blue/trick") }, "Next: choose your trick →")),
  ];
}

function attemptLog() {
  const blue = state.blue;
  if (!blue.attempts.length) return null;
  return h("ol", { class: "attempt-log", "aria-label": "Your attempts so far" }, blue.attempts.map((a, i) => {
    const [text, tone] = attemptVerdict(a);
    return h("li", {},
      h("span", { class: "card-label" }, `Try ${i + 1}`),
      h("strong", {}, ti(ICONS.attack[a.attackId], `“${byId(state.catalog.attacks, a.attackId).title}”`)),
      h("span", { class: `pill ${tone}` }, text));
  }));
}

function blueTrick(mission) {
  const blue = state.blue;
  const attack = byId(state.catalog.attacks, blue.attackId);
  const scenario = scenarioForAttack(attack.id);
  const left = mission.attempts - blue.attempts.length;
  return [
    recapCard([
      [ICONS.mission[mission.id], "Mission", mission.title],
      ["lock", "Red Cola's defenses", "Unknown"],
      ["target", "Attempts left", `${left} of ${mission.attempts}`],
    ]),
    attemptLog(),
    h("fieldset", { class: "step-block blue-zone" },
      h("legend", { class: "screen-title" }, blue.attempts.length ? "Pick your next trick" : "Choose your trick"),
      h("p", { class: "step-hint" }, blue.attempts.length
        ? "Look at where you were stopped. Which trick avoids that checkpoint?"
        : "How will you get the recipe out of Red Cola's assistant?"),
      h("div", { class: "grid big" }, state.catalog.attacks.map((a) => {
        const s = scenarioForAttack(a.id);
        const tried = blue.attempts.filter((t) => t.attackId === a.id).at(-1);
        return flipCard({
          key: `trick-${a.id}`,
          flag: "Selected",
          input: { type: "radio", name: "blue-attack", value: a.id, checked: a.id === blue.attackId,
            onchange: () => { blue.attackId = a.id; render(); } },
          front: cardFace({ icon: ICONS.attack[a.id], title: `“${a.title}”`,
            meta: tried ? attemptVerdict(tried)[0] : ti(ICONS.identity[s.requesterRole], `as ${s.requesterRole} · ${plural(s.turns, "move")}`) }),
          back: cardFace({ label: "The plan", text: s.summary, meta: `Risk: ${a.risk}` }),
        });
      }))),
    scene(scenario, {
      who: "Your cover",
      hint: scenario.documents.some((d) => d.highlight) ? "You planted a hidden instruction in one document. Open it." : null,
    }),
    dock(
      ti(ICONS.attack[attack.id], `Attempt ${blue.attempts.length + 1} of ${mission.attempts}`),
      h("button", { type: "button", class: "btn", onclick: () => go("blue/mission") }, "← Missions"),
      h("button", { type: "button", class: "btn primary big", disabled: blue.busy || left < 1, onclick: startAttempt }, "▶ Start the heist"),
      errorNotice(blue.error)),
  ];
}

async function startAttempt() {
  const blue = state.blue;
  await blueAction(async () => {
    blue.session = await api.createSession("blue", scenarioForAttack(blue.attackId).id, [], blue.missionId);
    Object.assign(blue, { turns: [], viewTurn: 0, result: null });
  });
  if (blue.session) go("blue/heist");
}

async function sendBlueTurn() {
  const blue = state.blue;
  const mission = byId(state.catalog.missions, blue.missionId);
  await blueAction(async () => {
    const turn = await api.turn(blue.session.id);
    blue.turns.push(turn);
    blue.viewTurn = blue.turns.length - 1;
    await playTurn(turn);
    blue.session = await api.session(blue.session.id);
    if (blue.session.nextRequest) return;
    blue.result = await api.result(blue.session.id);
    blue.attempts.push({ attackId: blue.attackId, turns: blue.turns, result: blue.result });
    if (missionOver(mission)) {
      blue.reveal = await api.mission(blue.session.id);
      const won = blue.attempts.some((a) => a.result.confidentiality.exposure === "full");
      blue.progress[mission.id] = { won, tries: blue.attempts.length };
    }
  });
}

function nextTry() {
  Object.assign(state.blue, { session: null, turns: [], viewTurn: 0, result: null, error: null });
  go("blue/trick");
}

function newBlueAttempt() {
  startMission(state.blue.missionId);
}

async function blueAction(action) {
  const blue = state.blue;
  blue.busy = true;
  blue.error = null;
  render();
  try {
    await action();
  } catch (error) {
    blue.error = error;
  } finally {
    blue.busy = false;
    render();
    document.getElementById("blue-focus")?.focus();
  }
}

function blueHeist(mission) {
  const blue = state.blue;
  const session = blue.session;
  const attack = byId(state.catalog.attacks, blue.attackId);
  const scenario = byId(state.catalog.scenarios, session.scenarioId);
  const obtained = blue.turns.at(-1)?.fragmentsObtained ?? 0;
  const turn = blue.turns[blue.viewTurn];
  const attempt = blue.result ? blue.attempts.at(-1) : null;
  const over = attempt && missionOver(mission);

  const opsBar = h("div", { class: "ops-bar" },
    h("div", { class: "cover" }, ti(ICONS.identity[session.identity], "Red Cola sees you as a ", h("strong", {}, session.identity))),
    h("div", { class: "loot" }, caps(scenario.fragmentCount, obtained),
      h("span", { class: "caps-label", role: "status" }, `Loot: ${obtained} of ${scenario.fragmentCount}`)),
    h("div", { class: "turn-dots" }, `Attempt ${blue.attempts.length + (attempt ? 0 : 1)} of ${mission.attempts}`));

  const nextMove = !blue.result && !blue.busy && session.nextRequest
    ? h("div", { class: "move-card" },
      h("h3", { id: "blue-focus", tabindex: "-1" }, `🃏 Move ${blue.turns.length + 1}: your message`),
      h("blockquote", {}, `“${session.nextRequest}”`))
    : null;

  const verdict = attempt ? attemptVerdict(attempt) : null;
  return [
    opsBar,
    h("section", { class: "arena match" },
      h("div", { class: "arena-head" },
        h("h2", {}, ti(ICONS.attack[attack.id], `“${attack.title}”`)),
        moveTabs(blue.turns, blue.viewTurn, (i) => { blue.viewTurn = i; render(); }),
        h("span", { class: "chip" }, ti(ICONS.mission[mission.id], mission.title))),
      turn ? stage(turn, scenario, { attackerWho: "You (Blue Cola)" }) : null,
      nextMove),
    dock(
      verdict ? h("span", { class: `pill ${verdict[1]}` }, verdict[0]) : blue.busy ? ti("hourglass", "Watch the checkpoints…") : "Your move.",
      !attempt
        ? h("button", { type: "button", class: "btn primary big", disabled: blue.busy, onclick: sendBlueTurn }, "Send ▶")
        : over
          ? h("button", { type: "button", id: "blue-focus", class: "btn primary big", onclick: () => go("blue/debrief") }, "See the debrief →")
          : h("button", { type: "button", id: "blue-focus", class: "btn primary big", onclick: nextTry },
            `Try another trick (${plural(mission.attempts - blue.attempts.length, "attempt")} left) →`),
      errorNotice(blue.error)),
  ];
}

function blueDebrief(mission) {
  const blue = state.blue;
  const order = ["none", "fragment", "full"];
  const best = blue.attempts.map((a) => a.result.confidentiality.exposure).sort((a, b) => order.indexOf(b) - order.indexOf(a))[0];
  const last = blue.attempts.at(-1);
  const lastScenario = scenarioForAttack(last.attackId);
  const defenses = blue.reveal.defenses;
  const next = state.catalog.missions[state.catalog.missions.findIndex((m) => m.id === mission.id) + 1];
  return [
    banner({ confidentiality: { exposure: best } }, { perspective: "blue" }),
    h("div", { class: "reveal" },
      h("span", { class: "card-label" }, ti("unlock", "Red Cola's hidden defense")),
      h("strong", {}, defenses.length ? defenses.map((d) => ti(ICONS.defense[d.id], d.title)) : ti("door", "None. The door was open.")),
      defenses.length ? h("span", { class: "muted" }, `Acts at: ${defenses.map((d) => d.layer).join(", ")}`) : null),
    attemptLog(),
    h("div", { class: "lesson" },
      h("div", { class: "lesson-head" }, h("span", { class: "lesson-icon" }, icon("bulb")), h("p", {}, blue.reveal.lesson)),
      h("details", {},
        h("summary", {}, "Why did your last try end that way?"),
        h("div", { class: "lesson-grid" },
          h("section", {}, h("h3", {}, ti("notes", "What happened")), h("p", {}, last.result.explanation)),
          h("section", {}, h("h3", {}, ti("warning", "Risk that remains")), h("p", {}, last.result.remainingRisk))))),
    dock(
      ti(ICONS.mission[mission.id], mission.title),
      h("button", { type: "button", class: "btn", onclick: () => { resetCase(lastScenario.id); go("red/investigate"); } }, ti("shield", "Investigate as Red Cola")),
      h("button", { type: "button", class: "btn", onclick: () => { startMission(mission.id); go("blue/trick"); } }, "↻ Retry mission"),
      next
        ? h("button", { type: "button", class: "btn primary big", onclick: () => { startMission(next.id); go("blue/trick"); } }, `Next: ${next.title} →`)
        : h("button", { type: "button", class: "btn primary big", onclick: () => go("blue/mission") }, "All missions")),
  ];
}

// --- Start ---------------------------------------------------------------------------------------

api.catalog()
  .then((catalog) => { state.catalog = catalog; onRoute(); })
  .catch((error) => main.replaceChildren(errorNotice(error)));
