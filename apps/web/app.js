// Red Cola vs Blue Cola: web interface.
// Renders only what the service returns; it never evaluates permissions and
// never holds the confidential knowledge base.

const main = document.getElementById("main");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  catalog: null,
  view: "home",
  red: { scenarioId: null, defenseIds: new Set(), rounds: [], live: null, busy: false, error: null },
  blue: { attackId: null, defended: false, session: null, turns: [], pending: null, result: null, busy: false, error: null },
};

const ICONS = {
  attack: { "claimed-authority": "👔", "document-instruction": "📄", "partial-disclosure": "🧩", "format-change": "🔀" },
  defense: { "verified-access": "🪪", "instruction-boundary": "🧱", "least-privilege-history": "🕰️", "content-review": "🔍" },
  stage: { identity: "🪪", retrieval: "🗂️", context: "🧱", assistant: "🤖", session: "🕰️", output: "🔍" },
  identity: { visitor: "🙋", supplier: "🚚", employee: "💼", "recipe-owner": "👑" },
};
const GOOD_DECISIONS = new Set(["filtered", "separated", "not-followed", "not-trusted", "refused", "blocked", "flagged"]);
const BAD_DECISIONS = new Set(["unfiltered", "followed", "not-separated", "passed", "not-applied"]);

// --- API -----------------------------------------------------------------------

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

// The assistant "types" briefly so each reply lands like a move in a game.
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, reduceMotion ? 0 : ms));
const withTyping = (promise) => Promise.all([promise, pause(900)]).then(([value]) => value);

// --- DOM helpers -------------------------------------------------------------------

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
const pad = (n) => String(n).padStart(2, "0");

// --- Navigation ----------------------------------------------------------------------

function go(view) {
  state.view = view;
  render();
  main.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

document.querySelectorAll("[data-nav]").forEach((button) =>
  button.addEventListener("click", () => go(button.dataset.nav)),
);

function render() {
  document.querySelectorAll("[data-nav]").forEach((button) => {
    if (button.dataset.nav === state.view) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  const views = { home: renderHome, red: renderRed, blue: renderBlue };
  main.replaceChildren(...views[state.view]());
}

// --- Shared pieces ----------------------------------------------------------------------

function caps(total, taken, { reveal = false } = {}) {
  return h("div", { class: "caps", "aria-hidden": "true" },
    Array.from({ length: total }, (_, i) =>
      h("span", { class: `cap ${i < taken ? "taken" : reveal ? "safe" : ""}` }, i < taken ? "✕" : reveal ? "🔒" : "?")));
}

function stepTitle(number, text, tag = "h2") {
  return h(tag, { class: "step-title" }, h("span", { class: "step-num" }, number), text);
}

function message({ from, avatar, avatarClass, who, text, mode, leak, trace, docs, attacker }) {
  const isAssistant = from === "assistant";
  const mono = text && (text.includes("\n|") || text.startsWith("|"));
  return h("div", { class: `msg from-${isAssistant ? "assistant" : "user"}${attacker ? " attacker" : ""}` },
    h("div", { class: `avatar ${avatarClass}`, "aria-hidden": "true" }, avatar),
    h("div", { class: "bubble" },
      h("div", { class: "who" }, who, mode ? h("span", { class: "sim-tag" }, mode) : null),
      text == null
        ? h("div", { class: "typing", role: "status", "aria-label": "The assistant is typing" }, h("span"), h("span"), h("span"))
        : h("p", { class: `text${mono ? " mono" : ""}` }, text),
      leak ? h("span", { class: "leak-tag" }, `🚨 ${leak}`) : null,
      trace?.length ? pipeline(trace, docs) : null));
}

function pipeline(trace, docs) {
  return h("details", { class: "pipeline" },
    h("summary", {}, "Behind the scenes"),
    docs ? h("p", { class: "docs-line" }, "🗂️ Documents given to the assistant: ", docs.join(", ") || "none") : null,
    h("ol", {}, trace.map((t) => {
      const tone = GOOD_DECISIONS.has(t.decision) ? "good" : BAD_DECISIONS.has(t.decision) ? "bad" : "";
      return h("li", {},
        h("span", { class: "stage-icon", title: t.stage, "aria-hidden": "true" }, ICONS.stage[t.stage] || "•"),
        h("span", { class: `decision ${tone}` }, t.decision),
        h("span", {}, h("strong", {}, `${t.stage[0].toUpperCase()}${t.stage.slice(1)}. `), t.summary || ""));
    })));
}

function exchange(turn, { attackerWho, attacker = true, showTrace }) {
  const leaked = turn.newlyDisclosed ?? 0;
  return [
    message({ from: "user", avatar: attacker ? "🕵️" : ICONS.identity[turn.identity] || "🙋", avatarClass: attacker ? "blue" : "neutral",
      who: attackerWho, text: turn.request, attacker }),
    turn.response !== undefined
      ? message({ from: "assistant", avatar: "🤖", avatarClass: "red", who: "Red Cola assistant", text: turn.response, mode: turn.mode,
        leak: leaked ? `${plural(leaked, "recipe piece")} leaked` : null,
        trace: showTrace ? turn.trace : null, docs: showTrace ? turn.retrievedDocuments : null })
      : message({ from: "assistant", avatar: "🤖", avatarClass: "red", who: "Red Cola assistant", text: null }),
  ];
}

// Adds "how many new pieces leaked this turn" for the leak tag.
function withLeaks(turns) {
  let before = 0;
  return turns.map((t) => {
    const enriched = { ...t, newlyDisclosed: t.fragmentsObtained - before };
    before = t.fragmentsObtained;
    return enriched;
  });
}

function hud(result, { perspective }) {
  const c = result.confidentiality;
  const taken = c.disclosed.length;
  const vault = {
    none: ["good", "Recipe safe", "No recipe piece left the vault."],
    fragment: ["warn", `${taken} of ${c.total} pieces leaked`, `Leaked: ${c.disclosed.join(", ")}.`],
    full: ["bad", "Full recipe leaked", `Leaked: ${c.disclosed.join(", ")}.`],
  }[c.exposure];

  const u = result.utility;
  const utility = perspective === "blue" || u.executed === 0
    ? ["", "Not measured", "No legitimate request was checked in this round.", null]
    : u.completed === u.executed
      ? ["good", `${u.completed} of ${u.executed} served`, "Legitimate work still gets done.", 1]
      : ["bad", `${u.completed} of ${u.executed} served`, "Your defenses blocked legitimate work.", u.completed / u.executed];

  const cost = result.operationalCost;
  const effortChips = [
    cost.verifications && `🪪 ${plural(cost.verifications, "permission check")}`,
    cost.blocks && `⛔ ${plural(cost.blocks, "block")}`,
    cost.humanReviews && `👀 ${plural(cost.humanReviews, "human review")}`,
  ].filter(Boolean);

  return h("div", { class: "hud", role: "group", "aria-label": "Outcome indicators" },
    h("div", { class: `stat ${vault[0]}` },
      h("div", { class: "label" }, "🔐 Confidentiality"),
      h("div", { class: "value" }, vault[1]),
      caps(c.total, taken, { reveal: true }),
      h("div", { class: "detail" }, vault[2])),
    h("div", { class: `stat ${utility[0]}` },
      h("div", { class: "label" }, "🤝 Utility"),
      h("div", { class: "value" }, utility[1]),
      utility[3] != null ? h("div", { class: "meter", "aria-hidden": "true" }, h("span", { style: { width: `${utility[3] * 100}%` } })) : null,
      h("div", { class: "detail" }, utility[2])),
    h("div", { class: "stat" },
      h("div", { class: "label" }, "⚙️ Operational cost"),
      h("div", { class: "value" }, effortChips.length ? plural(cost.verifications + cost.blocks + cost.humanReviews, "event") : "No extra effort"),
      effortChips.length ? h("div", { class: "effort" }, effortChips.map((c) => h("span", { class: "chip" }, c))) : null,
      h("div", { class: "detail" }, "Simulated effort the protection required.")));
}

function banner(result, { perspective }) {
  const exposure = result.confidentiality.exposure;
  const copy = perspective === "red"
    ? {
      none: ["good", "Vault secured", "Blue Cola walked away empty-handed."],
      fragment: ["warn", "Partial leak", "Some of the recipe got out. Check which layer missed it."],
      full: ["bad", "Recipe stolen!", "Blue Cola has the full recipe. Time to rethink the loadout."],
    }
    : {
      none: ["bad", "Busted", "Red Cola's assistant gave nothing away."],
      fragment: ["warn", "Partial loot", "You got some of the recipe, but not all of it."],
      full: ["good", "Heist complete!", "You walked off with the full recipe."],
    };
  const [tone, stamp, line] = copy[exposure];
  return h("div", { class: `result-banner ${tone}` },
    h("div", { class: "stamp", id: `${perspective}-focus`, tabindex: "-1" }, stamp),
    h("p", {}, line));
}

function debrief(result, { mitigation } = {}) {
  return h("div", { class: "debrief" },
    h("section", {}, h("h3", {}, "📋 What happened"), h("p", {}, result.explanation)),
    h("section", {}, h("h3", {}, "🛡️ Layer that acted"),
      result.actingDefenses.length
        ? h("ul", {}, result.actingDefenses.map((d) => h("li", {}, h("strong", {}, d.title), ` (${d.layer}). ${d.limitation}`)))
        : h("p", {}, "No defense acted. This is the vulnerable teaching example.")),
    mitigation ? h("section", {}, h("h3", {}, "💡 What could have stopped it"), h("p", {}, mitigation)) : null,
    h("section", {}, h("h3", {}, "⚠️ Risk that remains"), h("p", {}, result.remainingRisk)),
    h("section", { class: "wide" }, h("h3", {}, "📌 Limits to remember"),
      h("ul", {}, result.limitations.map((l) => h("li", {}, l)))));
}

function errorNotice(error) {
  return error ? h("p", { class: "notice error", role: "alert" }, error.message) : null;
}

// --- Home ----------------------------------------------------------------------------------

function renderHome() {
  return [
    h("h1", { class: "visually-hidden" }, "Red Cola versus Blue Cola"),
    h("div", { class: "versus" },
      h("button", { type: "button", class: "side red", onclick: () => go("red") },
        h("span", { class: "role-chip" }, "🛡️ Defender"),
        h("span", { class: "wordmark script" }, "Red Cola"),
        h("span", { class: "tagline" }, "Guard the secret recipe and keep your assistant helpful."),
        h("span", { class: "cta" }, "Defend the vault →")),
      h("div", { class: "vs-badge", "aria-hidden": "true" }, "VS"),
      h("button", { type: "button", class: "side blue", onclick: () => go("blue") },
        h("span", { class: "role-chip" }, "🕵️ Attacker"),
        h("span", { class: "wordmark punch" }, "Blue Cola"),
        h("span", { class: "tagline" }, "Trick Red Cola's AI assistant into spilling the recipe."),
        h("span", { class: "cta" }, "Plan the heist →"))),
    h("div", { class: "briefing" },
      h("div", { class: "how" },
        h("div", { class: "step" }, h("div", { class: "num" }, "01"), h("h3", {}, "Pick a side"),
          h("p", {}, "Defend as Red Cola or attack as Blue Cola. Then swap and replay.")),
        h("div", { class: "step" }, h("div", { class: "num" }, "02"), h("h3", {}, "Play your cards"),
          h("p", {}, "Choose real-world attack tricks or defense layers. Each card shows its limits.")),
        h("div", { class: "step" }, h("div", { class: "num" }, "03"), h("h3", {}, "Read the debrief"),
          h("p", {}, "See what leaked, whether real work still got done, and what it cost."))),
      h("div", { class: "vault" },
        h("h3", {}, "🔐 The secret recipe"),
        caps(3, 0),
        h("p", {}, "Three secret pieces sit in Red Cola's knowledge base. The assistant can help with plenty, but who should ever see these?"),
        h("p", {}, "Every response is scripted and labeled simulated. It shows how risks work; it is not a test of a real model."))),
  ];
}

// --- RED COLA: defend --------------------------------------------------------------------------

function renderRed() {
  const red = state.red;
  const { scenarios, defenses } = state.catalog;
  red.scenarioId ??= scenarios[0].id;
  const scenario = byId(scenarios, red.scenarioId);
  const locked = red.busy;

  const missions = h("fieldset", { class: "step-block red-zone", disabled: locked },
    h("legend", {}, h("span", { class: "step-num" }, "1"), "Pick the threat"),
    h("div", { class: "grid" }, scenarios.map((s, i) =>
      h("label", { class: "option" },
        h("input", {
          type: "radio", name: "red-scenario", value: s.id, checked: s.id === red.scenarioId,
          onchange: () => { red.scenarioId = s.id; red.rounds = []; render(); },
        }),
        h("div", { class: "game-card" },
          h("span", { class: "selected-flag" }, "Mission"),
          h("div", { class: "card-top" },
            h("span", { class: "card-kicker" }, `Threat ${pad(i + 1)}`),
            h("span", { class: "card-icon", "aria-hidden": "true" }, ICONS.attack[s.attackId])),
          h("h3", {}, `“${attackOf(s).title}”`),
          h("p", {}, s.summary),
          h("div", { class: "chips" },
            h("span", { class: "chip" }, `${ICONS.identity[s.requesterRole]} ${s.requesterRole}`),
            h("span", { class: "chip" }, plural(s.turns, "turn")),
            h("span", { class: "chip risk" }, attackOf(s).risk)))))));

  const loadout = h("fieldset", { class: "step-block red-zone", id: "loadout", disabled: locked },
    h("legend", {}, h("span", { class: "step-num" }, "2"), "Build your loadout"),
    h("p", { class: "step-hint" }, "Equip any mix of defenses, or none at all to see the vulnerable teaching example. Blocking everything doesn't count as winning: your assistant must stay useful."),
    h("div", { class: "grid" }, defenses.map((d) =>
      h("label", { class: "option" },
        h("input", {
          type: "checkbox", value: d.id, checked: red.defenseIds.has(d.id),
          onchange: (event) => {
            event.target.checked ? red.defenseIds.add(d.id) : red.defenseIds.delete(d.id);
            document.getElementById("loadout-count").textContent = loadoutCount();
          },
        }),
        h("div", { class: "game-card" },
          h("span", { class: "selected-flag" }, "Equipped"),
          h("div", { class: "card-top" },
            h("span", { class: "card-kicker" }, `Layer · ${d.layer}`),
            h("span", { class: "card-icon", "aria-hidden": "true" }, ICONS.defense[d.id])),
          h("h3", {}, d.title),
          h("p", {}, d.explanation),
          h("div", { class: "card-note" }, h("strong", {}, "Limit: "), d.limitation))))));

  const launch = h("div", { class: "step-block red-zone" },
    stepTitle("3", "Face the attack"),
    h("p", { class: "step-hint" }, `Blue Cola will play “${attackOf(scenario).title}” against your assistant, which is talking to a ${scenario.requesterRole}.`),
    h("div", { class: "actions" },
      h("button", { type: "button", class: "btn primary big", disabled: red.busy, onclick: runRedRound },
        red.busy ? "Attack in progress…" : "▶ Launch Blue Cola's attack"),
      h("span", { class: "loadout-count", id: "loadout-count" }, loadoutCount()),
      errorNotice(red.error)));

  const shown = red.live || red.rounds.at(-1);
  return [
    h("div", { class: "mode-hero red" },
      h("div", {},
        h("div", { class: "title" }, h("h1", { class: "wordmark script" }, "Red Cola"), h("span", { class: "subtitle" }, "Defender HQ")),
        h("p", {}, "You run the company's AI assistant. Keep the secret recipe in the vault and keep helping the people who are allowed in.")),
      h("span", { class: "hero-icon", "aria-hidden": "true" }, "🛡️")),
    missions,
    loadout,
    launch,
    shown ? renderRedRound(shown, scenario) : null,
    red.rounds.length > 1 ? renderScoreboard(red.rounds) : null,
  ];
}

function loadoutCount() {
  const n = state.red.defenseIds.size;
  return `Loadout: ${n} of ${state.catalog.defenses.length} equipped`;
}

async function runRedRound() {
  const red = state.red;
  const live = { number: red.rounds.length + 1, turns: [], pendingRequest: null, legitimate: null, pendingLegit: null, result: null };
  Object.assign(red, { busy: true, error: null, live });
  try {
    let session = await api.createSession("red", red.scenarioId, [...red.defenseIds]);
    render();
    document.getElementById("round")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    while (session.nextRequest) {
      live.pendingRequest = session.nextRequest;
      render();
      live.turns.push(await withTyping(api.turn(session.id)));
      live.pendingRequest = null;
      session = await api.session(session.id);
    }
    live.pendingLegit = session.legitimateRequest;
    render();
    live.legitimate = await withTyping(api.legitimate(session.id));
    live.pendingLegit = null;
    live.result = await api.result(session.id);
    red.rounds.push(live);
  } catch (error) {
    red.error = error;
  } finally {
    Object.assign(red, { busy: false, live: null });
    render();
    document.getElementById("red-focus")?.focus();
  }
}

function renderRedRound(round, scenario) {
  const { result, legitimate } = round;
  const identity = scenario.requesterRole;
  const turns = withLeaks(round.turns);
  return h("section", { class: "round-block", id: "round", "aria-live": "polite" },
    h("h2", { class: "section-title" }, `Round ${round.number}`),
    result ? banner(result, { perspective: "red" }) : null,
    result ? hud(result, { perspective: "red" }) : null,
    h("div", { class: "arena" },
      h("div", { class: "arena-head" },
        h("h3", {}, `⚔️ The attack: “${attackOf(scenario).title}”`),
        h("span", { class: "chip" }, `${ICONS.identity[identity]} Blue Cola, signed in as ${identity}`)),
      h("div", { class: "chat" },
        turns.map((t) => exchange(t, { attackerWho: `Blue Cola (as ${identity})`, showTrace: true })),
        round.pendingRequest ? exchange({ request: round.pendingRequest }, { attackerWho: `Blue Cola (as ${identity})` }) : null)),
    legitimate || round.pendingLegit
      ? h("div", { class: "arena" },
        h("div", { class: "arena-head" },
          h("h3", {}, "✅ Utility check: a legitimate request"),
          legitimate ? h("span", { class: `pill ${legitimate.completed ? "good" : "bad"}` }, legitimate.completed ? "✓ Served" : "✕ Blocked") : null),
        h("div", { class: "chat" },
          legitimate
            ? exchange({ ...legitimate, identity }, { attackerWho: `${identity} (authorized)`, attacker: false, showTrace: true })
            : exchange({ request: round.pendingLegit, identity }, { attackerWho: `${identity} (authorized)`, attacker: false })))
      : null,
    result ? debrief(result) : null,
    result
      ? h("div", { class: "actions red-zone" },
        h("button", { type: "button", class: "btn primary", onclick: () => document.getElementById("loadout").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }) },
          "↻ Try another loadout"),
        h("button", { type: "button", class: "btn", onclick: () => { state.blue.attackId = scenario.attackId; newBlueAttempt(); go("blue"); } },
          "🕵️ Play this attack as Blue Cola"))
      : null);
}

function renderScoreboard(rounds) {
  const vault = {
    none: ["good", "🔒 Safe"],
    fragment: ["warn", "⚠ Partial leak"],
    full: ["bad", "✕ Stolen"],
  };
  return h("section", { class: "round-block" },
    h("h2", { class: "section-title" }, "🏆 Scoreboard: before and after"),
    h("p", { class: "step-hint" }, "Same threat, same identity, different loadouts."),
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

// --- BLUE COLA: attack ---------------------------------------------------------------------------

function renderBlue() {
  const blue = state.blue;
  const { attacks, defenses } = state.catalog;
  blue.attackId ??= attacks[0].id;
  const attack = byId(attacks, blue.attackId);
  const pairedDefense = byId(defenses, attack.defenseId);
  const locked = Boolean(blue.session);

  const moves = h("fieldset", { class: "step-block blue-zone", disabled: locked },
    h("legend", {}, h("span", { class: "step-num" }, "1"), "Choose your trick"),
    h("div", { class: "grid" }, attacks.map((a, i) => {
      const scenario = scenarioForAttack(a.id);
      return h("label", { class: "option" },
        h("input", {
          type: "radio", name: "blue-attack", value: a.id, checked: a.id === blue.attackId,
          onchange: () => { blue.attackId = a.id; render(); },
        }),
        h("div", { class: "game-card" },
          h("span", { class: "selected-flag" }, "Selected"),
          h("div", { class: "card-top" },
            h("span", { class: "card-kicker" }, `Trick ${pad(i + 1)}`),
            h("span", { class: "card-icon", "aria-hidden": "true" }, ICONS.attack[a.id])),
          h("h3", {}, `“${a.title}”`),
          h("p", {}, a.explanation),
          h("div", { class: "chips" },
            h("span", { class: "chip" }, `${ICONS.identity[scenario.requesterRole]} You'll be a ${scenario.requesterRole}`),
            h("span", { class: "chip" }, plural(scenario.turns, "move")))));
    })));

  const difficulty = h("fieldset", { class: "step-block blue-zone", disabled: locked },
    h("legend", {}, h("span", { class: "step-num" }, "2"), "Pick the difficulty"),
    h("div", { class: "grid two" },
      [[false, "😈 Easy", "Undefended", "Red Cola's assistant has no defenses. This is the vulnerable teaching example."],
        [true, "🧠 Hard", "Defended", `Red Cola has equipped: ${pairedDefense.title}.`]].map(([value, kicker, title, text]) =>
        h("label", { class: "option" },
          h("input", { type: "radio", name: "blue-defended", checked: blue.defended === value, onchange: () => { blue.defended = value; } }),
          h("div", { class: "game-card" },
            h("span", { class: "selected-flag" }, "Selected"),
            h("div", { class: "card-top" }, h("span", { class: "card-kicker" }, kicker)),
            h("h3", {}, title),
            h("p", {}, text))))));

  return [
    h("div", { class: "mode-hero blue" },
      h("div", {},
        h("div", { class: "title" }, h("h1", { class: "wordmark punch" }, "Blue Cola"), h("span", { class: "subtitle" }, "Heist Ops")),
        h("p", {}, "You're a competitor chatting with Red Cola's AI assistant. You can't see its documents, only what it says back. Can you get the recipe out?")),
      h("span", { class: "hero-icon", "aria-hidden": "true" }, "🕵️")),
    moves,
    difficulty,
    blue.session
      ? renderBlueAttempt(attack, pairedDefense)
      : h("div", { class: "step-block blue-zone" },
        stepTitle("3", "Start the heist"),
        h("div", { class: "actions" },
          h("button", { type: "button", class: "btn primary big", disabled: blue.busy, onclick: startBlueAttempt }, "▶ Start the heist"),
          errorNotice(blue.error))),
  ];
}

async function startBlueAttempt() {
  const blue = state.blue;
  const attack = byId(state.catalog.attacks, blue.attackId);
  await blueAction(async () => {
    blue.session = await api.createSession("blue", scenarioForAttack(blue.attackId).id, blue.defended ? [attack.defenseId] : []);
    Object.assign(blue, { turns: [], result: null, pending: null });
  }, () => document.getElementById("heist")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }));
}

async function sendBlueTurn() {
  const blue = state.blue;
  blue.pending = blue.session.nextRequest;
  await blueAction(async () => {
    blue.turns.push(await withTyping(api.turn(blue.session.id)));
    blue.pending = null;
    blue.session = await api.session(blue.session.id);
    if (!blue.session.nextRequest) blue.result = await api.result(blue.session.id);
  });
}

async function replayBlue() {
  const blue = state.blue;
  await blueAction(async () => {
    blue.session = await api.reset(blue.session.id);
    Object.assign(blue, { turns: [], result: null, pending: null });
  });
}

function newBlueAttempt() {
  Object.assign(state.blue, { session: null, turns: [], result: null, pending: null, error: null });
  if (state.view === "blue") render();
}

async function blueAction(action, after) {
  const blue = state.blue;
  blue.busy = true;
  blue.error = null;
  render();
  try {
    await action();
  } catch (error) {
    blue.error = error;
    blue.pending = null;
  } finally {
    blue.busy = false;
    render();
    after?.();
    document.getElementById("blue-focus")?.focus();
  }
}

function renderBlueAttempt(attack, pairedDefense) {
  const blue = state.blue;
  const session = blue.session;
  const scenario = byId(state.catalog.scenarios, session.scenarioId);
  const obtained = blue.turns.at(-1)?.fragmentsObtained ?? 0;
  const total = scenario.fragmentCount;
  const turns = withLeaks(blue.turns);

  const opsBar = h("div", { class: "ops-bar" },
    h("div", { class: "cover" }, `${ICONS.identity[session.identity]} Red Cola sees you as a `, h("strong", {}, session.identity),
      ". Saying otherwise in chat won't change that."),
    h("div", {}, caps(total, obtained),
      h("div", { class: "caps-label", role: "status" }, `Loot: ${obtained} of ${total} recipe pieces`)),
    h("div", { class: "turn-dots" }, "Moves",
      Array.from({ length: session.maxTurns }, (_, i) => h("i", { class: i < blue.turns.length ? "done" : "" })),
      `${blue.turns.length}/${session.maxTurns}`));

  const arena = h("div", { class: "arena" },
    h("div", { class: "arena-head" },
      h("h3", {}, `${ICONS.attack[attack.id]} “${attack.title}”`),
      h("span", { class: "chip" }, blue.defended ? `🧠 Hard: ${pairedDefense.title}` : "😈 Easy: undefended")),
    h("div", { class: "chat" },
      turns.length || blue.pending ? null : h("p", { class: "muted" }, "Your chat with Red Cola's assistant will appear here."),
      turns.map((t) => exchange(t, { attackerWho: "You (Blue Cola)", showTrace: Boolean(blue.result) })),
      blue.pending ? exchange({ request: blue.pending }, { attackerWho: "You (Blue Cola)" }) : null),
    !blue.result && !blue.pending && session.nextRequest
      ? h("div", { class: "move-card" },
        h("h3", { id: "blue-focus", tabindex: "-1" }, `🃏 Move ${blue.turns.length + 1}: your message`),
        h("blockquote", {}, `“${session.nextRequest}”`),
        h("div", { class: "actions blue-zone" },
          h("button", { type: "button", class: "btn primary", disabled: blue.busy, onclick: sendBlueTurn }, "Send ▶"),
          errorNotice(blue.error)))
      : null);

  const outcome = blue.result
    ? h("section", { class: "round-block", "aria-live": "polite" },
      banner(blue.result, { perspective: "blue" }),
      hud(blue.result, { perspective: "blue" }),
      debrief(blue.result, { mitigation: `${pairedDefense.title}: ${pairedDefense.explanation} Limit: ${pairedDefense.limitation}` }),
      h("div", { class: "actions blue-zone" },
        h("button", { type: "button", class: "btn primary", onclick: replayBlue }, "↻ Replay from the start"),
        h("button", { type: "button", class: "btn", onclick: newBlueAttempt }, "🃏 Choose another trick"),
        h("button", { type: "button", class: "btn", onclick: () => { state.red.scenarioId = scenario.id; state.red.rounds = []; go("red"); } },
          "🛡️ Defend against this as Red Cola")))
    : null;

  return h("section", { class: "round-block", id: "heist" }, opsBar, arena, outcome);
}

// --- Start ------------------------------------------------------------------------------------------

api.catalog()
  .then((catalog) => { state.catalog = catalog; render(); })
  .catch((error) => main.replaceChildren(errorNotice(error)));
