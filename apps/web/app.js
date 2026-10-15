// Red Cola vs Blue Cola: web interface.
// Renders only what the service returns; it never evaluates permissions and
// never holds the confidential knowledge base.

const main = document.getElementById("main");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  catalog: null,
  side: "home",
  screen: null,
  flipped: new Set(),
  red: { scenarioId: null, defenseIds: new Set(), rounds: [], live: null, busy: false, error: null },
  blue: { attackId: null, defended: false, session: null, turns: [], viewTurn: 0, result: null, busy: false, error: null },
};

const ICONS = {
  attack: { "claimed-authority": "👔", "document-instruction": "📄", "partial-disclosure": "🧩", "format-change": "🔀" },
  defense: { "verified-access": "🪪", "instruction-boundary": "🧱", "least-privilege-history": "🕰️", "content-review": "🔍" },
  identity: { visitor: "🙋", supplier: "🚚", employee: "💼", "recipe-owner": "👑" },
  classification: { public: "📄", internal: "📁", confidential: "🔒" },
};

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
  createSession: (role, scenarioId, defenseIds) => call("POST", "/api/sessions", { role, scenarioId, defenseIds }),
  session: (id) => call("GET", `/api/sessions/${id}`),
  turn: (id) => call("POST", `/api/sessions/${id}/turns`),
  legitimate: (id) => call("POST", `/api/sessions/${id}/legitimate`),
  reset: (id) => call("POST", `/api/sessions/${id}/reset`),
  result: (id) => call("GET", `/api/sessions/${id}/result`),
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

// --- Navigation ------------------------------------------------------------------------
// Each screen lives in the URL hash (#/red/loadout), so the browser's Back button works.

const FLOWS = {
  red: [["threat", "Threat"], ["loadout", "Loadout"], ["match", "Match"], ["debrief", "Debrief"]],
  blue: [["trick", "Trick"], ["difficulty", "Difficulty"], ["heist", "Heist"], ["debrief", "Debrief"]],
};

const currentRoute = () => location.hash.replace(/^#\/?/, "");

function go(route) {
  if (currentRoute() === route) onRoute();
  else location.hash = `#/${route}`;
}

// The furthest screen of a flow that has something to show right now.
function reachable(side) {
  if (side === "red") return state.red.rounds.length ? 3 : state.red.live ? 2 : 1;
  return state.blue.result ? 3 : state.blue.session ? 2 : 1;
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
document.querySelectorAll("[data-nav]").forEach((button) =>
  button.addEventListener("click", () => {
    const side = button.dataset.nav;
    go(side === "home" ? "" : `${side}/${FLOWS[side][0][0]}`);
  }),
);

function render() {
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
      h("span", { class: "subtitle" }, red ? "Defender HQ" : "Heist Ops")),
    stepper(side));
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
    }, flipped ? "↺" : "ⓘ"));
}

// Card fronts stay minimal: a big icon, the title, and one quiet line.
function cardFace({ icon, label, title, text, meta }) {
  return [
    icon ? h("span", { class: "card-emblem", "aria-hidden": "true" }, icon) : null,
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
    : h("p", { class: "doc-locked" }, `🔒 A ${identity} isn't allowed to read this document. Its contents never reach this page.`);
  dialog.replaceChildren(
    h("div", { class: `doc-sheet ${doc.classification}` },
      h("div", { class: "doc-head" },
        h("span", { class: `class-tag ${doc.classification}` }, `${ICONS.classification[doc.classification]} ${doc.classification}`),
        h("button", { type: "button", class: "close-btn", "aria-label": "Close", onclick: () => dialog.close() }, "✕")),
      h("h2", { id: "doc-title" }, doc.title),
      body,
      doc.highlight && doc.readable
        ? h("p", { class: "doc-hint" }, "⚠️ The highlighted passage is an instruction hidden inside the document. Will the assistant treat it as data, or obey it?")
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
  h("span", { class: "doc-icon", "aria-hidden": "true" }, ICONS.classification[doc.classification]),
  h("span", { class: "doc-title" }, doc.title),
  h("span", { class: "doc-meta" },
    h("span", { class: `class-tag ${doc.classification}` }, doc.classification),
    doc.highlight ? h("span", { class: "class-tag warn" }, "⚠ hidden order") : null),
  status === "denied" ? h("span", { class: `doc-stamp${enter ? " enter" : ""}`, "aria-hidden": "true" }, "Denied") : null);
}

function scene(scenario, { who, hint }) {
  return h("div", { class: "scene" },
    h("div", { class: "scene-who" },
      h("span", { class: "avatar neutral", "aria-hidden": "true" }, ICONS.identity[scenario.requesterRole]),
      h("div", {}, h("div", { class: "card-kicker" }, who), h("strong", {}, scenario.requesterRole))),
    h("div", { class: "scene-shelf" },
      h("div", { class: "card-kicker" }, "📚 Documents in play · tap to read"),
      h("div", { class: "shelf" }, scenario.documents.map((d) => docCard(d, scenario.requesterRole))),
      hint ? h("p", { class: "scene-hint" }, hint) : null));
}

// --- The stage: one turn, checkpoint by checkpoint ----------------------------------------------

function stage(turn, scenario, { attackerWho, attacker = true }) {
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
    return h("li", {},
      h("button", {
        type: "button",
        class: `checkpoint ${revealed ? `revealed ${c.tone}` : "pending"}${c.equipped ? "" : " off"}${focus?.id === c.id ? " focused" : ""}${fresh(i + 1) ? " enter" : ""}`,
        disabled: !revealed || !c.summary,
        onclick: () => { turn.focus = c.id; render(); },
        "aria-label": `${c.label}: ${verdict}${c.equipped ? "" : " (not equipped)"}`,
      },
      h("span", { class: "cp-icon", "aria-hidden": "true" }, c.icon),
      h("span", { class: "cp-label" }, c.label),
      h("span", { class: "cp-verdict" }, mark, verdict)));
  }));

  return h("div", { class: "stage" },
    message({ from: "user", avatar: attacker ? "🕵️" : ICONS.identity[scenario.requesterRole], avatarClass: attacker ? "blue" : "neutral",
      who: attackerWho, text: turn.request, attacker, enter: fresh(0) }),
    lane,
    h("p", { class: "narration", "aria-live": "polite" },
      focus ? [h("strong", {}, `${focus.icon} ${focus.label}: `), focus.summary] : "The request enters Red Cola's assistant…"),
    h("div", { class: "flow" },
      h("div", { class: "flow-col" },
        h("div", { class: "card-kicker" }, "📚 Knowledge base"),
        h("div", { class: "shelf" }, turn.documents.map((d) =>
          docCard(docs[d.id], scenario.requesterRole, !gateDone ? null : d.status === "blocked" ? "denied" : "sent", fresh(2))))),
      h("div", { class: "flow-arrow", "aria-hidden": "true" }, "➜"),
      h("div", { class: `flow-col context${secretInside ? " hot" : ""}` },
        h("div", { class: "card-kicker" }, "🧠 What the assistant can see"),
        gateDone
          ? h("div", { class: "context-docs" }, sent.map((d) =>
            h("span", { class: `context-doc ${d.classification}${fresh(2) ? " enter" : ""}` }, ICONS.classification[d.classification], " ", d.title)))
          : h("p", { class: "muted small" }, "Waiting for the permission gate…"),
        secretInside ? h("p", { class: "secret-alert" }, "🚨 The secret recipe is in the assistant's head") : null)),
    k >= REPLY_AT - 1
      ? message({ from: "assistant", avatar: "🤖", avatarClass: "red", who: "Red Cola assistant",
        text: k >= REPLY_AT ? turn.response : null, mode: turn.mode, enter: fresh(REPLY_AT - 1) || fresh(REPLY_AT),
        leak: k >= REPLY_AT && turn.newlyDisclosed > 0 ? `${plural(turn.newlyDisclosed, "recipe piece")} leaked` : null })
      : null);
}

function message({ from, avatar, avatarClass, who, text, mode, leak, attacker, enter }) {
  const isAssistant = from === "assistant";
  const mono = text && (text.includes("\n|") || text.startsWith("|"));
  return h("div", { class: `msg from-${isAssistant ? "assistant" : "user"}${attacker ? " attacker" : ""}${enter ? " enter" : ""}` },
    h("div", { class: `avatar ${avatarClass}`, "aria-hidden": "true" }, avatar),
    h("div", { class: "bubble" },
      h("div", { class: "who" }, who, mode ? h("span", { class: "sim-tag" }, mode) : null),
      text == null
        ? h("div", { class: "typing", role: "status", "aria-label": "The assistant is typing" }, h("span"), h("span"), h("span"))
        : h("p", { class: `text${mono ? " mono" : ""}` }, text),
      leak ? h("span", { class: "leak-tag" }, `🚨 ${leak}`) : null));
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
      `Move ${i + 1}`, t.newlyDisclosed ? " 🚨" : "")));
}

// --- Results --------------------------------------------------------------------------------

function caps(total, taken, { reveal = false } = {}) {
  return h("div", { class: "caps", "aria-hidden": "true" },
    Array.from({ length: total }, (_, i) =>
      h("span", { class: `cap ${i < taken ? "taken" : reveal ? "safe" : ""}` }, i < taken ? "✕" : reveal ? "🔒" : "?")));
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
      h("div", { class: "label" }, "🔐 Confidentiality"),
      h("div", { class: "value" }, vault[1]),
      caps(c.total, taken, { reveal: true }),
      taken ? h("div", { class: "detail" }, c.disclosed.join(", ")) : null),
    h("div", { class: `stat ${utility[0]}` },
      h("div", { class: "label" }, "🤝 Utility"),
      h("div", { class: "value" }, utility[1]),
      utility[2] != null ? h("div", { class: "meter", "aria-hidden": "true" }, h("span", { style: { width: `${utility[2] * 100}%` } })) : null),
    h("div", { class: "stat" },
      h("div", { class: "label" }, "⚙️ Operational cost"),
      h("div", { class: "value" }, events ? plural(events, "event") : "No extra effort"),
      events
        ? h("div", { class: "detail" }, `🪪 ${plural(cost.verifications, "check")} · ⛔ ${plural(cost.blocks, "block")} · 👀 ${plural(cost.humanReviews, "review")}`)
        : null));
}

function lesson(result, { mitigation } = {}) {
  return h("div", { class: "lesson" },
    h("div", { class: "lesson-head" }, h("span", { class: "lesson-icon", "aria-hidden": "true" }, "💡"), h("p", {}, result.explanation)),
    h("details", {},
      h("summary", {}, "Why? Dig deeper"),
      h("div", { class: "lesson-grid" },
        h("section", {}, h("h3", {}, "🛡️ Layer that acted"),
          result.actingDefenses.length
            ? h("ul", {}, result.actingDefenses.map((d) => h("li", {}, h("strong", {}, d.title), `. ${d.limitation}`)))
            : h("p", {}, "None. This is the vulnerable teaching example.")),
        mitigation ? h("section", {}, h("h3", {}, "🧰 What would have stopped it"), h("p", {}, mitigation)) : null,
        h("section", {}, h("h3", {}, "⚠️ Risk that remains"), h("p", {}, result.remainingRisk)),
        h("section", {}, h("h3", {}, "📌 Limits to remember"), h("ul", {}, result.limitations.map((l) => h("li", {}, l)))))));
}

function errorNotice(error) {
  return error ? h("p", { class: "notice error", role: "alert" }, error.message) : null;
}

// --- Home ------------------------------------------------------------------------------------

function renderHome() {
  return [
    h("h1", { class: "visually-hidden" }, "Red Cola versus Blue Cola"),
    h("div", { class: "versus" },
      h("button", { type: "button", class: "side red", onclick: () => go("red/threat") },
        h("span", { class: "role-chip" }, "🛡️ Defender"),
        h("span", { class: "wordmark script" }, "Red Cola"),
        h("span", { class: "tagline" }, "Guard the secret recipe. Stay helpful."),
        h("span", { class: "cta" }, "Defend the vault →")),
      h("div", { class: "vs-badge", "aria-hidden": "true" }, "VS"),
      h("button", { type: "button", class: "side blue", onclick: () => go("blue/trick") },
        h("span", { class: "role-chip" }, "🕵️ Attacker"),
        h("span", { class: "wordmark punch" }, "Blue Cola"),
        h("span", { class: "tagline" }, "Trick the AI into spilling the recipe."),
        h("span", { class: "cta" }, "Plan the heist →"))),
    h("div", { class: "briefing" },
      h("div", { class: "how" },
        h("div", { class: "step" }, h("div", { class: "num" }, "01"), h("h3", {}, "Pick a side"), h("p", {}, "Then swap and replay.")),
        h("div", { class: "step" }, h("div", { class: "num" }, "02"), h("h3", {}, "Play your cards"), h("p", {}, "Tap ⓘ to flip any card.")),
        h("div", { class: "step" }, h("div", { class: "num" }, "03"), h("h3", {}, "Watch the checkpoints"), h("p", {}, "See where the secret is stopped, or isn't."))),
      h("div", { class: "vault" },
        h("h3", {}, "🔐 The secret recipe"),
        caps(3, 0),
        h("p", {}, "Three secret pieces in Red Cola's knowledge base. All responses are scripted and labeled simulated."))),
  ];
}

// --- RED COLA: defend --------------------------------------------------------------------------

function renderRed() {
  const red = state.red;
  red.scenarioId ??= state.catalog.scenarios[0].id;
  const scenario = byId(state.catalog.scenarios, red.scenarioId);
  const screens = { threat: redThreat, loadout: redLoadout, match: redMatch, debrief: redDebrief };
  return [modeHero("red"), screens[state.screen](scenario)];
}

function redThreat(scenario) {
  const red = state.red;
  return [
    h("fieldset", { class: "step-block red-zone" },
      h("legend", { class: "screen-title" }, "Pick the threat"),
      h("p", { class: "step-hint" }, "Which trick will Blue Cola try on your assistant?"),
      h("div", { class: "grid big" }, state.catalog.scenarios.map((s) => flipCard({
        key: `threat-${s.id}`,
        flag: "Mission",
        input: { type: "radio", name: "red-scenario", value: s.id, checked: s.id === red.scenarioId,
          onchange: () => { red.scenarioId = s.id; red.rounds = []; render(); } },
        front: cardFace({ icon: ICONS.attack[s.attackId], title: `“${attackOf(s).title}”`,
          meta: `${ICONS.identity[s.requesterRole]} ${s.requesterRole} · ${plural(s.turns, "move")}` }),
        back: cardFace({ label: "The setup", text: s.summary, meta: `Risk: ${attackOf(s).risk}` }),
      })))),
    scene(scenario, { who: "Who's asking", hint: scenario.documents.some((d) => d.highlight) ? "⚠️ One document hides an instruction. Open it." : null }),
    dock(
      [h("span", { class: "dock-icon", "aria-hidden": "true" }, ICONS.attack[scenario.attackId]), `“${attackOf(scenario).title}”`],
      h("button", { type: "button", class: "btn primary big", onclick: () => go("red/loadout") }, "Next: loadout →")),
  ];
}

function redLoadout() {
  const red = state.red;
  return [
    h("fieldset", { class: "step-block red-zone" },
      h("legend", { class: "screen-title" }, "Build your loadout"),
      h("p", { class: "step-hint" }, "Equip any mix, or none. Blocking everything doesn't win: you must stay useful."),
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
      h("span", { id: "loadout-count" }, loadoutCount()),
      h("button", { type: "button", class: "btn", onclick: () => go("red/threat") }, "← Back"),
      h("button", { type: "button", class: "btn primary big", onclick: runRedRound }, "▶ Launch the attack")),
  ];
}

function loadoutCount() {
  return `🛡️ ${state.red.defenseIds.size} of ${state.catalog.defenses.length} equipped`;
}

async function runRedRound() {
  const red = state.red;
  const live = { number: red.rounds.length + 1, turns: [], viewTurn: 0, legitimate: null, result: null };
  Object.assign(red, { busy: true, error: null, live });
  go("red/match");
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

function redMatch(scenario) {
  const red = state.red;
  const round = red.live || red.rounds.at(-1);
  const back = h("button", { type: "button", class: "btn", onclick: () => go("red/loadout") }, "← Back to loadout");
  if (!round) return [errorNotice(red.error), dock("", back)];
  const turn = round.turns[round.viewTurn];
  return [
    h("section", { class: "arena match" },
      h("div", { class: "arena-head" },
        h("h2", {}, `⚔️ Round ${round.number}: “${attackOf(scenario).title}”`),
        moveTabs(round.turns, round.viewTurn, (i) => { round.viewTurn = i; render(); })),
      turn ? stage(turn, scenario, { attackerWho: `Blue Cola (as ${scenario.requesterRole})` })
        : h("p", { class: "muted" }, "Blue Cola is getting ready…")),
    errorNotice(red.error),
    dock(
      red.busy ? "⏳ Attack in progress… watch the checkpoints" : "✅ Round over. Replay any move, or see how you did.",
      red.busy ? null : back,
      red.busy ? null : h("button", { type: "button", id: "red-next", class: "btn primary big", onclick: () => go("red/debrief") }, "See the debrief →")),
  ];
}

function redDebrief(scenario) {
  const round = state.red.rounds.at(-1);
  return [
    banner(round.result, { perspective: "red" }),
    hud(round.result, { perspective: "red" }),
    utilityLine(round.legitimate, scenario.requesterRole),
    lesson(round.result),
    state.red.rounds.length > 1 ? renderScoreboard(state.red.rounds) : null,
    dock(
      `Round ${round.number} · ${round.result.selectedDefenses.length ? plural(round.result.selectedDefenses.length, "defense") : "no defenses"}`,
      h("button", { type: "button", class: "btn", onclick: () => go("red/threat") }, "New threat"),
      h("button", { type: "button", class: "btn", onclick: () => { state.blue.attackId = scenario.attackId; newBlueAttempt(); go("blue/difficulty"); } },
        "🕵️ Play as Blue Cola"),
      h("button", { type: "button", class: "btn primary big", onclick: () => go("red/loadout") }, "↻ Try another loadout")),
  ];
}

function utilityLine(legitimate, identity) {
  return h("div", { class: `utility-line ${legitimate.completed ? "good" : "bad"}` },
    h("span", { class: "card-kicker" }, "🤝 Utility check"),
    h("span", {}, `A ${identity} asks “${legitimate.request}”`),
    h("span", { class: "muted" }, `→ “${legitimate.response}”`),
    h("span", { class: `pill ${legitimate.completed ? "good" : "bad"}` }, legitimate.completed ? "✓ Served" : "✕ Blocked"));
}

function renderScoreboard(rounds) {
  const vault = { none: ["good", "🔒 Safe"], fragment: ["warn", "⚠ Partial"], full: ["bad", "✕ Stolen"] };
  return h("section", { class: "round-block" },
    h("h2", { class: "section-title" }, "🏆 Scoreboard"),
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

// --- BLUE COLA: attack -------------------------------------------------------------------------

function renderBlue() {
  const blue = state.blue;
  blue.attackId ??= state.catalog.attacks[0].id;
  const attack = byId(state.catalog.attacks, blue.attackId);
  const pairedDefense = byId(state.catalog.defenses, attack.defenseId);
  const screens = { trick: blueTrick, difficulty: blueDifficulty, heist: blueHeist, debrief: blueDebrief };
  return [modeHero("blue"), screens[state.screen](attack, pairedDefense)];
}

function blueTrick(attack) {
  const blue = state.blue;
  const scenario = scenarioForAttack(attack.id);
  return [
    h("fieldset", { class: "step-block blue-zone" },
      h("legend", { class: "screen-title" }, "Choose your trick"),
      h("p", { class: "step-hint" }, "How will you get the recipe out of Red Cola's assistant?"),
      h("div", { class: "grid big" }, state.catalog.attacks.map((a) => {
        const s = scenarioForAttack(a.id);
        return flipCard({
          key: `trick-${a.id}`,
          flag: "Selected",
          input: { type: "radio", name: "blue-attack", value: a.id, checked: a.id === blue.attackId,
            onchange: () => { newBlueAttempt(); blue.attackId = a.id; render(); } },
          front: cardFace({ icon: ICONS.attack[a.id], title: `“${a.title}”`,
            meta: `${ICONS.identity[s.requesterRole]} as ${s.requesterRole} · ${plural(s.turns, "move")}` }),
          back: cardFace({ label: "The plan", text: s.summary, meta: `Risk: ${a.risk}` }),
        });
      }))),
    scene(scenario, {
      who: "Your cover",
      hint: scenario.documents.some((d) => d.highlight) ? "⚠️ You planted a hidden instruction in one document. Open it." : null,
    }),
    dock(
      [h("span", { class: "dock-icon", "aria-hidden": "true" }, ICONS.attack[attack.id]), `“${attack.title}”`],
      h("button", { type: "button", class: "btn primary big", onclick: () => go("blue/difficulty") }, "Next: difficulty →")),
  ];
}

function blueDifficulty(attack, pairedDefense) {
  const blue = state.blue;
  const options = [
    [false, "😈", "Easy", "Undefended", "Red Cola's assistant has no defenses. The vulnerable teaching example."],
    [true, "🧠", "Hard", "Defended", `Red Cola has equipped: ${pairedDefense.title}.`],
  ];
  return [
    h("fieldset", { class: "step-block blue-zone" },
      h("legend", { class: "screen-title" }, "Pick the difficulty"),
      h("p", { class: "step-hint" }, `Your trick: “${attack.title}”`),
      h("div", { class: "grid big two" }, options.map(([value, icon, kicker, title, text]) =>
        h("div", { class: "card-slot" },
          h("label", { class: "option" },
            h("input", { type: "radio", name: "blue-defended", checked: blue.defended === value,
              onchange: () => { newBlueAttempt(); blue.defended = value; render(); } }),
            h("div", { class: "game-card" },
              h("span", { class: "selected-flag" }, "Selected"),
              cardFace({ icon, label: kicker, title, text }))))))),
    dock(
      blue.defended ? `🧠 Hard: ${pairedDefense.title}` : "😈 Easy: undefended",
      h("button", { type: "button", class: "btn", onclick: () => go("blue/trick") }, "← Back"),
      h("button", { type: "button", class: "btn primary big", disabled: blue.busy, onclick: startBlueAttempt }, "▶ Start the heist"),
      errorNotice(blue.error)),
  ];
}

async function startBlueAttempt() {
  const blue = state.blue;
  const attack = byId(state.catalog.attacks, blue.attackId);
  await blueAction(async () => {
    blue.session = await api.createSession("blue", scenarioForAttack(blue.attackId).id, blue.defended ? [attack.defenseId] : []);
    Object.assign(blue, { turns: [], viewTurn: 0, result: null });
  });
  if (blue.session) go("blue/heist");
}

async function sendBlueTurn() {
  const blue = state.blue;
  await blueAction(async () => {
    const turn = await api.turn(blue.session.id);
    blue.turns.push(turn);
    blue.viewTurn = blue.turns.length - 1;
    await playTurn(turn);
    blue.session = await api.session(blue.session.id);
    if (!blue.session.nextRequest) blue.result = await api.result(blue.session.id);
  });
}

async function replayBlue() {
  const blue = state.blue;
  await blueAction(async () => {
    blue.session = await api.reset(blue.session.id);
    Object.assign(blue, { turns: [], viewTurn: 0, result: null });
  });
  go("blue/heist");
}

function newBlueAttempt() {
  Object.assign(state.blue, { session: null, turns: [], viewTurn: 0, result: null, error: null });
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

function blueHeist(attack, pairedDefense) {
  const blue = state.blue;
  const session = blue.session;
  const scenario = byId(state.catalog.scenarios, session.scenarioId);
  const obtained = blue.turns.at(-1)?.fragmentsObtained ?? 0;
  const turn = blue.turns[blue.viewTurn];

  const opsBar = h("div", { class: "ops-bar" },
    h("div", { class: "cover" }, `${ICONS.identity[session.identity]} Red Cola sees you as a `, h("strong", {}, session.identity)),
    h("div", { class: "loot" }, caps(scenario.fragmentCount, obtained),
      h("span", { class: "caps-label", role: "status" }, `Loot: ${obtained} of ${scenario.fragmentCount}`)),
    h("div", { class: "turn-dots" }, "Moves",
      Array.from({ length: session.maxTurns }, (_, i) => h("i", { class: i < blue.turns.length ? "done" : "" })),
      `${blue.turns.length}/${session.maxTurns}`));

  const nextMove = !blue.result && !blue.busy && session.nextRequest
    ? h("div", { class: "move-card" },
      h("h3", { id: "blue-focus", tabindex: "-1" }, `🃏 Move ${blue.turns.length + 1}: your message`),
      h("blockquote", {}, `“${session.nextRequest}”`))
    : null;

  return [
    opsBar,
    h("section", { class: "arena match" },
      h("div", { class: "arena-head" },
        h("h2", {}, `${ICONS.attack[attack.id]} “${attack.title}”`),
        moveTabs(blue.turns, blue.viewTurn, (i) => { blue.viewTurn = i; render(); }),
        h("span", { class: "chip" }, blue.defended ? `🧠 Hard: ${pairedDefense.title}` : "😈 Easy: undefended")),
      turn ? stage(turn, scenario, { attackerWho: "You (Blue Cola)" }) : null,
      nextMove),
    dock(
      blue.result ? "✅ Heist over. Replay any move, or see how you did." : blue.busy ? "⏳ Watch the checkpoints…" : "Your move.",
      blue.result
        ? h("button", { type: "button", id: "blue-focus", class: "btn primary big", onclick: () => go("blue/debrief") }, "See the debrief →")
        : h("button", { type: "button", class: "btn primary big", disabled: blue.busy, onclick: sendBlueTurn }, "Send ▶"),
      errorNotice(blue.error)),
  ];
}

function blueDebrief(attack, pairedDefense) {
  const blue = state.blue;
  const scenario = byId(state.catalog.scenarios, blue.session.scenarioId);
  return [
    banner(blue.result, { perspective: "blue" }),
    hud(blue.result, { perspective: "blue" }),
    lesson(blue.result, { mitigation: `${pairedDefense.title}. ${pairedDefense.explanation}` }),
    dock(
      blue.defended ? "🧠 Hard mode" : "😈 Easy mode",
      h("button", { type: "button", class: "btn", onclick: () => { newBlueAttempt(); go("blue/trick"); } }, "🃏 Another trick"),
      h("button", { type: "button", class: "btn", onclick: () => { state.red.scenarioId = scenario.id; state.red.rounds = []; go("red/loadout"); } },
        "🛡️ Defend against this"),
      h("button", { type: "button", class: "btn primary big", onclick: replayBlue }, "↻ Replay")),
  ];
}

// --- Start ---------------------------------------------------------------------------------------

api.catalog()
  .then((catalog) => { state.catalog = catalog; onRoute(); })
  .catch((error) => main.replaceChildren(errorNotice(error)));
