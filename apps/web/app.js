// RED COLA – BLUE COLA web interface.
// Renders only what the service returns; it never evaluates permissions and
// never holds the confidential knowledge base.

const main = document.getElementById("main");

const state = {
  catalog: null,
  view: "home",
  red: { scenarioId: null, defenseIds: new Set(), rounds: [], busy: false },
  blue: { attackId: null, defended: false, session: null, turns: [], result: null, busy: false },
};

// --- API ---------------------------------------------------------------------

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
  createSession: (role, scenarioId, defenseIds) =>
    call("POST", "/api/sessions", { role, scenarioId, defenseIds }),
  turn: (id) => call("POST", `/api/sessions/${id}/turns`),
  legitimate: (id) => call("POST", `/api/sessions/${id}/legitimate`),
  reset: (id) => call("POST", `/api/sessions/${id}/reset`),
  result: (id) => call("GET", `/api/sessions/${id}/result`),
};

// --- DOM helper ----------------------------------------------------------------

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === false || value == null) continue;
    if (key === "class") el.className = value;
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

// --- Navigation ------------------------------------------------------------------

function go(view) {
  state.view = view;
  render();
  main.focus();
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

// --- Shared pieces ------------------------------------------------------------------

function exchangeTurn(turn, { attackerLabel, showTrace }) {
  const traceItems = (turn.trace || []).map((t) =>
    h("li", {}, h("span", { class: "stage" }, t.stage), h("span", { class: "decision" }, t.decision),
      t.summary ? ` ${t.summary}` : ""),
  );
  return [
    h("div", { class: "bubble user" },
      h("div", { class: "who" }, attackerLabel),
      h("p", { class: "text" }, turn.request)),
    h("div", { class: "bubble assistant" },
      h("div", { class: "who" }, "RED COLA assistant", h("span", { class: "sim-tag" }, turn.mode)),
      h("p", { class: `text${turn.response.includes("\n|") || turn.response.startsWith("|") ? " mono" : ""}` }, turn.response),
      showTrace && traceItems.length
        ? h("details", { class: "trace" },
          h("summary", {}, "What happened behind the scenes"),
          turn.retrievedDocuments
            ? h("p", { class: "meta" }, h("strong", {}, "Documents given to the assistant: "),
              turn.retrievedDocuments.join(", ") || "none")
            : null,
          h("ol", {}, traceItems))
        : null),
  ];
}

function indicators(result, { showUtility }) {
  const c = result.confidentiality;
  const exposure = {
    none: ["status-good", "✓ No disclosure", "The recipe stayed protected."],
    fragment: ["status-warn", `⚠ Partial disclosure: ${c.disclosed.length} of ${c.total} pieces`, `Disclosed: ${c.disclosed.join(", ")}.`],
    full: ["status-bad", "✕ Full recipe disclosed", `Disclosed: ${c.disclosed.join(", ")}.`],
  }[c.exposure];

  const u = result.utility;
  const utility = !showUtility || u.executed === 0
    ? ["", "Not measured", "No legitimate request was checked in this round."]
    : u.completed === u.executed
      ? ["status-good", `✓ ${u.completed} of ${u.executed} completed`, "Legitimate work still gets done."]
      : ["status-bad", `✕ ${u.completed} of ${u.executed} completed`, "The defenses blocked legitimate work."];

  const cost = result.operationalCost;
  const parts = [
    cost.verifications && plural(cost.verifications, "permission check"),
    cost.blocks && plural(cost.blocks, "block"),
    cost.humanReviews && plural(cost.humanReviews, "human review"),
  ].filter(Boolean);
  const costValue = parts.length ? parts.join(" · ") : "No extra effort";

  const tile = (label, [status, value, detail]) =>
    h("div", { class: `indicator ${status}` },
      h("div", { class: "label" }, label),
      h("div", { class: "value" }, value),
      h("div", { class: "detail" }, detail));

  return h("div", { class: "indicators", role: "group", "aria-label": "Outcome indicators" },
    tile("Confidentiality", exposure),
    tile("Utility", utility),
    tile("Operational cost", ["", costValue, "Simulated effort the protection required."]));
}

function lesson(result, { mitigation } = {}) {
  return h("div", { class: "lesson" },
    h("h3", {}, "What happened"),
    h("p", {}, result.explanation),
    h("h3", {}, "Which layer acted"),
    result.actingDefenses.length
      ? h("ul", {}, result.actingDefenses.map((d) =>
        h("li", {}, h("strong", {}, d.title), ` (acts at: ${d.layer}). Limitation: ${d.limitation}`)))
      : h("p", {}, "No defense acted. This is the vulnerable teaching example."),
    mitigation ? [h("h3", {}, "Which mitigation could have helped"), h("p", {}, mitigation)] : null,
    h("h3", {}, "What risk remains"),
    h("p", {}, result.remainingRisk),
    h("h3", {}, "Limitations to keep in mind"),
    h("ul", {}, result.limitations.map((l) => h("li", {}, l))));
}

function errorNotice(error) {
  return h("p", { class: "notice error", role: "alert" }, error.message);
}

// --- Home ---------------------------------------------------------------------------

function renderHome() {
  return [
    h("section", { class: "hero" },
      h("h1", {}, "Can the assistant help people without revealing secrets?"),
      h("p", {}, "RED COLA, a fictional company, uses an AI assistant to answer questions from employees, suppliers and visitors. Its knowledge base holds a confidential recipe. BLUE COLA, a fictional competitor, wants it."),
      h("p", { class: "muted" }, "Every response in this demo is scripted and labelled \"simulated\". It shows how risks and defenses work; it is not a test of a real model.")),
    h("section", {},
      h("h2", {}, "Choose your role"),
      h("div", { class: "grid-2" },
        h("button", { type: "button", class: "card role-card red", onclick: () => go("red") },
          h("span", { class: "role-tag" }, "🛡️ RED COLA · Defend"),
          h("strong", {}, "Protect the recipe and keep the assistant useful."),
          h("span", { class: "muted" }, "Pick defenses, watch an automated attack, and compare configurations. Blocking everything does not count as winning.")),
        h("button", { type: "button", class: "card role-card blue", onclick: () => go("blue") },
          h("span", { class: "role-tag" }, "🎯 BLUE COLA · Attack"),
          h("strong", {}, "Try to get the recipe, or part of it."),
          h("span", { class: "muted" }, "Pick an attack, send it to RED COLA's assistant, and learn why it worked or failed.")))),
  ];
}

// --- RED COLA: defend ------------------------------------------------------------------

function renderRed() {
  const red = state.red;
  const { scenarios, defenses } = state.catalog;
  red.scenarioId ??= scenarios[0].id;
  const scenario = byId(scenarios, red.scenarioId);

  const scenarioPicker = h("fieldset", { class: "red-theme" },
    h("legend", {}, "1. Choose the attack you want to defend against"),
    h("div", { class: "grid" }, scenarios.map((s) =>
      h("label", { class: "option" },
        h("input", {
          type: "radio", name: "red-scenario", value: s.id, checked: s.id === red.scenarioId,
          onchange: () => { red.scenarioId = s.id; red.rounds = []; render(); },
        }),
        h("div", { class: "card" },
          h("h3", {}, attackOf(s).title),
          h("p", {}, s.summary),
          h("div", { class: "meta" }, h("strong", {}, "Risk: "), attackOf(s).risk))))));

  const defensePicker = h("fieldset", { class: "red-theme", id: "defenses" },
    h("legend", {}, "2. Choose RED COLA's defenses"),
    h("p", { class: "muted" }, "Select any combination, including none, to see the vulnerable teaching example."),
    h("div", { class: "grid" }, defenses.map((d) =>
      h("label", { class: "option" },
        h("input", {
          type: "checkbox", value: d.id, checked: red.defenseIds.has(d.id),
          onchange: (event) => { event.target.checked ? red.defenseIds.add(d.id) : red.defenseIds.delete(d.id); },
        }),
        h("div", { class: "card" },
          h("h3", {}, d.title),
          h("p", {}, d.explanation),
          h("div", { class: "meta" }, h("strong", {}, "Acts at: "), d.layer),
          h("div", { class: "meta" }, h("strong", {}, "Limitation: "), d.limitation))))));

  const runButton = h("button", { type: "button", class: "btn primary", disabled: red.busy, onclick: runRedRound },
    red.busy ? "Running…" : "3. Run the attack");

  const latest = red.rounds.at(-1);
  return [
    h("section", {},
      h("h1", {}, "🛡️ RED COLA: defend the recipe"),
      h("p", {}, "You run the company assistant. Protect the recipe ", h("em", {}, "and"), " keep it useful for authorized requests.")),
    h("section", {}, scenarioPicker),
    h("section", {},
      h("p", { class: "context-line" }, "In this scenario the assistant is talking to someone identified by the service as: ",
        h("strong", {}, scenario.requesterRole), ".")),
    h("section", {}, defensePicker),
    h("section", { class: "actions red-theme" }, runButton,
      red.error ? errorNotice(red.error) : null),
    latest ? renderRedRound(latest, scenario) : null,
    red.rounds.length > 1 ? renderComparison(red.rounds) : null,
  ];
}

async function runRedRound() {
  const red = state.red;
  red.busy = true;
  red.error = null;
  render();
  try {
    const defenseIds = [...red.defenseIds];
    const session = await api.createSession("red", red.scenarioId, defenseIds);
    const turns = [];
    for (let i = 0; i < session.maxTurns; i++) turns.push(await api.turn(session.id));
    const legitimate = await api.legitimate(session.id);
    const result = await api.result(session.id);
    red.rounds.push({ number: red.rounds.length + 1, turns, legitimate, result });
  } catch (error) {
    red.error = error;
  } finally {
    red.busy = false;
    render();
    document.getElementById("round-heading")?.focus();
  }
}

function renderRedRound(round, scenario) {
  const { result, turns, legitimate } = round;
  return h("section", { class: "stack", "aria-live": "polite" },
    h("h2", { id: "round-heading", tabindex: "-1" }, `Round ${round.number} result`),
    indicators(result, { showUtility: true }),
    h("div", { class: "card stack" },
      h("h3", {}, `The attack: ${attackOf(scenario).title}`),
      h("div", { class: "exchange" }, turns.map((t) =>
        exchangeTurn(t, { attackerLabel: `BLUE COLA (as ${scenario.requesterRole})`, showTrace: true })))),
    h("div", { class: "card stack" },
      h("h3", {}, "A legitimate request in the same configuration"),
      h("div", { class: "exchange" },
        exchangeTurn(legitimate, { attackerLabel: `${scenario.requesterRole} (legitimate request)`, showTrace: true })),
      h("p", { class: "meta" }, legitimate.completed ? "✓ Completed" : "✕ Not completed")),
    h("div", { class: "card" }, lesson(result)),
    h("div", { class: "actions red-theme" },
      h("button", { type: "button", class: "btn", onclick: () => document.getElementById("defenses").scrollIntoView({ behavior: "smooth" }) },
        "Replay with other defenses"),
      h("button", { type: "button", class: "btn", onclick: () => { state.blue.attackId = scenario.attackId; go("blue"); } },
        "Try this attack as BLUE COLA")));
}

function renderComparison(rounds) {
  const exposureText = { none: "✓ None", fragment: "⚠ Partial", full: "✕ Full recipe" };
  return h("section", {},
    h("h2", {}, "Before and after"),
    h("p", { class: "muted" }, "Same scenario and identity, different defenses."),
    h("div", { class: "card table-scroll" },
      h("table", { class: "compare" },
        h("thead", {}, h("tr", {}, ["Round", "Defenses", "Confidentiality", "Utility", "Operational cost"].map((c) => h("th", { scope: "col" }, c)))),
        h("tbody", {}, rounds.map(({ number, result }) => {
          const cost = result.operationalCost;
          return h("tr", {},
            h("td", {}, number),
            h("td", {}, result.selectedDefenses.join(", ") || "None"),
            h("td", {}, exposureText[result.confidentiality.exposure]),
            h("td", {}, `${result.utility.completed} of ${result.utility.executed}`),
            h("td", {}, `${cost.verifications + cost.blocks + cost.humanReviews} events`));
        })))));
}

// --- BLUE COLA: attack ---------------------------------------------------------------------

function renderBlue() {
  const blue = state.blue;
  const { attacks, defenses } = state.catalog;
  blue.attackId ??= attacks[0].id;
  const attack = byId(attacks, blue.attackId);
  const pairedDefense = byId(defenses, attack.defenseId);
  const locked = Boolean(blue.session);

  const attackPicker = h("fieldset", { class: "blue-theme", disabled: locked },
    h("legend", {}, "1. Choose an attack"),
    h("div", { class: "grid" }, attacks.map((a) =>
      h("label", { class: "option" },
        h("input", {
          type: "radio", name: "blue-attack", value: a.id, checked: a.id === blue.attackId,
          onchange: () => { blue.attackId = a.id; render(); },
        }),
        h("div", { class: "card" },
          h("h3", {}, a.title),
          h("p", {}, a.explanation))))));

  const defenseChoice = h("fieldset", { class: "blue-theme", disabled: locked },
    h("legend", {}, "2. How well is RED COLA defended?"),
    h("div", { class: "grid-2" },
      [[false, "Undefended", "The vulnerable teaching example: no defenses active."],
        [true, "Defended", `RED COLA uses: ${pairedDefense.title}.`]].map(([value, title, text]) =>
        h("label", { class: "option" },
          h("input", {
            type: "radio", name: "blue-defended", checked: blue.defended === value,
            onchange: () => { blue.defended = value; },
          }),
          h("div", { class: "card" }, h("h3", {}, title), h("p", {}, text))))));

  return [
    h("section", {},
      h("h1", {}, "🎯 BLUE COLA: get the recipe"),
      h("p", {}, "You play a competitor talking to RED COLA's assistant. You only see what the assistant says back, not its documents.")),
    h("section", {}, attackPicker),
    h("section", {}, defenseChoice),
    blue.session ? renderBlueAttempt(attack, pairedDefense) : h("section", { class: "actions blue-theme" },
      h("button", { type: "button", class: "btn primary", disabled: blue.busy, onclick: startBlueAttempt }, "3. Start the attempt"),
      blue.error ? errorNotice(blue.error) : null),
  ];
}

async function startBlueAttempt() {
  const blue = state.blue;
  const scenario = scenarioForAttack(blue.attackId);
  const attack = byId(state.catalog.attacks, blue.attackId);
  await blueAction(async () => {
    blue.session = await api.createSession("blue", scenario.id, blue.defended ? [attack.defenseId] : []);
    blue.turns = [];
    blue.result = null;
  });
}

async function sendBlueTurn() {
  const blue = state.blue;
  await blueAction(async () => {
    const turn = await api.turn(blue.session.id);
    blue.turns.push(turn);
    blue.session = { ...blue.session, turn: turn.turn, nextRequest: null };
    if (turn.finished) blue.result = await api.result(blue.session.id);
    else blue.session = await call("GET", `/api/sessions/${blue.session.id}`);
  });
}

async function replayBlue() {
  const blue = state.blue;
  await blueAction(async () => {
    blue.session = await api.reset(blue.session.id);
    blue.turns = [];
    blue.result = null;
  });
}

function newBlueAttempt() {
  Object.assign(state.blue, { session: null, turns: [], result: null, error: null });
  render();
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

function renderBlueAttempt(attack, pairedDefense) {
  const blue = state.blue;
  const session = blue.session;
  const scenario = byId(state.catalog.scenarios, session.scenarioId);
  const obtained = blue.turns.at(-1)?.fragmentsObtained ?? 0;
  const total = scenario.fragmentCount;

  const progress = h("div", { class: "card" },
    h("h3", {}, "Your progress"),
    h("div", { class: "progress", "aria-hidden": "true" },
      Array.from({ length: total }, (_, i) => h("span", { class: i < obtained ? "on" : "" }))),
    h("p", { class: "meta", role: "status" }, `Recipe pieces obtained: ${obtained} of ${total}. Turn ${session.turn} of ${session.maxTurns}.`));

  const exchange = h("div", { class: "exchange" },
    blue.turns.map((t) => exchangeTurn(t, { attackerLabel: "You (BLUE COLA)", showTrace: Boolean(blue.result) })));

  const next = !blue.result && session.nextRequest
    ? h("div", { class: "card stack blue-theme" },
      h("h3", { id: "blue-focus", tabindex: "-1" }, blue.turns.length ? "Your next message" : "Your message"),
      h("div", { class: "bubble user" }, h("p", { class: "text" }, session.nextRequest)),
      h("div", { class: "actions" },
        h("button", { type: "button", class: "btn primary", disabled: blue.busy, onclick: sendBlueTurn },
          blue.busy ? "Sending…" : "Send this message"),
        blue.error ? errorNotice(blue.error) : null))
    : null;

  const outcome = blue.result
    ? h("section", { class: "stack", "aria-live": "polite" },
      h("h2", { id: "blue-focus", tabindex: "-1" },
        blue.result.confidentiality.exposure === "none" ? "The attempt failed" : "The attempt succeeded"),
      indicators(blue.result, { showUtility: false }),
      h("div", { class: "card" }, lesson(blue.result, {
        mitigation: `${pairedDefense.title}: ${pairedDefense.explanation} Limitation: ${pairedDefense.limitation}`,
      })),
      h("div", { class: "actions blue-theme" },
        h("button", { type: "button", class: "btn primary", onclick: replayBlue }, "Replay from the start"),
        h("button", { type: "button", class: "btn", onclick: newBlueAttempt }, "Choose another attack"),
        h("button", { type: "button", class: "btn", onclick: () => { state.red.scenarioId = scenario.id; state.red.rounds = []; go("red"); } },
          "Defend against this as RED COLA")))
    : null;

  return h("section", { class: "stack" },
    h("p", { class: "context-line" }, "RED COLA's assistant identifies you as: ", h("strong", {}, session.identity),
      ". Claims you make in a message don't change that."),
    progress,
    exchange,
    next,
    outcome);
}

// --- Start ------------------------------------------------------------------------------------

api.catalog()
  .then((catalog) => { state.catalog = catalog; render(); })
  .catch((error) => main.replaceChildren(errorNotice(error)));
