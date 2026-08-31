const DATASET_ID = "values-45-v1";
const SAVE_VERSION = 3;
const STORAGE_KEY = `life-compass-v1-${DATASET_ID}`;
const DECK_REVEAL_KEY = `life-compass-deck-revealed-${DATASET_ID}`;
const HANDOFF_KEY = `life-compass-handoff-${DATASET_ID}`;
const SORT_CHAPTER_SIZE = 15;
const INTEGRATIONS = {
  build: "../pain-jigsaw/builder.html",
  pain: "../pain-jigsaw/",
  pace: "../pacing/index.html"
};
const PAIN_JIGSAW_PAGES = {
  "understand-your-condition": "understand.html",
  "reconnect-to-life": "reconnect.html",
  "activity-management": "activity.html",
  movement: "movement.html",
  "nutrition-and-lifestyle": "nutrition.html",
  "managing-thoughts-and-emotions": "thoughts.html",
  sleep: "sleep.html",
  "relaxation-and-mindfulness": "relaxation.html",
  "setting-goals": "setting-goals.html",
  communication: "communication.html",
  "self-management-toolbox": "toolbox.html",
  "flare-ups": "flare-ups.html",
  acceptance: "acceptance.html"
};
const routes = new Set(["welcome", "discover", "deck", "sort", "reflection", "top-ten", "top-five", "top-three", "synthesis", "north-star", "goal-area", "goal-plan", "my-compass", "next-steps"]);

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
const resumeButton = document.querySelector("#resumeButton");
let values = [];
let valueMap = new Map();
let browseOrderIds = [];
let toastTimer;
let deckRevealedThisSession = false;
let deckEntryMode = "";
let sortEntryPending = false;
const exploredDeckCards = new Set();

const freshState = () => ({
  saveVersion: SAVE_VERSION,
  datasetId: DATASET_ID,
  route: "welcome",
  lastRoute: null,
  sortIndex: 0,
  sortHistory: [],
  sortPauseAt: null,
  piles: { essential: [], important: [], unsure: [], notImportant: [] },
  candidates: [],
  pendingTarget: null,
  reflectionFrom: null,
  northStar: null,
  synthesis: "",
  actions: { looksLike: "", thisWeek: "", tomorrow: "" },
  goal: { pieceId: "", picture: "", statement: "", timeframe: "two-weeks", gentleVersion: "", firstStep: "" },
  compassHistory: [],
  revealSampleIds: [],
  flipHintSeen: false,
  updatedAt: null
});

let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (saved.datasetId && saved.datasetId !== DATASET_ID) return freshState();
    return migrateState(saved);
  } catch {
    return freshState();
  }
}

function migrateState(saved = {}) {
  const base = freshState();
  const migrated = { ...base, ...saved, saveVersion: SAVE_VERSION, datasetId: DATASET_ID };
  migrated.piles = { ...base.piles, ...(saved.piles || {}) };
  migrated.actions = { ...base.actions, ...(saved.actions || {}) };
  migrated.goal = { ...base.goal, ...(saved.goal || {}) };
  migrated.sortHistory = Array.isArray(saved.sortHistory) ? saved.sortHistory : Object.values(migrated.piles).flat();
  migrated.compassHistory = Array.isArray(saved.compassHistory) ? saved.compassHistory : [];
  migrated.revealSampleIds = Array.isArray(saved.revealSampleIds) ? saved.revealSampleIds : [];
  migrated.synthesis = typeof saved.synthesis === "string" ? saved.synthesis : "";
  if (migrated.pendingTarget && ![10, 5, 3].includes(migrated.pendingTarget)) {
    migrated.pendingTarget = null;
    migrated.reflectionFrom = null;
    migrated.reductionSelection = [];
  }
  return migrated;
}

function saveState() {
  state.updatedAt = new Date().toISOString();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* The current page remains usable if storage is unavailable. */ }
  resumeButton.hidden = !state.lastRoute;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function navigate(route, { replace = false } = {}) {
  const safeRoute = routes.has(route) ? route : "welcome";
  state.route = safeRoute;
  if (safeRoute !== "welcome") state.lastRoute = safeRoute;
  saveState();
  const hash = `#/${safeRoute}`;
  if (replace) history.replaceState(null, "", hash);
  else if (location.hash !== hash) history.pushState(null, "", hash);
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function routeFromHash() {
  const route = location.hash.replace(/^#\/?/, "") || "welcome";
  return routes.has(route) ? route : "welcome";
}

function hasRevealedDeck() {
  if (deckRevealedThisSession) return true;
  try {
    deckRevealedThisSession = sessionStorage.getItem(DECK_REVEAL_KEY) === "true";
  } catch {
    // The in-memory flag still gives this visit the intended one-time behaviour.
  }
  return deckRevealedThisSession;
}

function markDeckRevealed() {
  deckRevealedThisSession = true;
  try { sessionStorage.setItem(DECK_REVEAL_KEY, "true"); } catch { /* Storage may be unavailable in private browsing. */ }
}

function resetDeckReveal() {
  deckRevealedThisSession = false;
  try { sessionStorage.removeItem(DECK_REVEAL_KEY); } catch { /* The in-memory flag has already been reset. */ }
}

function getValue(id) { return valueMap.get(id); }
function getValues(ids) { return ids.map(getValue).filter(Boolean); }
function escapeHtml(value = "") { return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character])); }

function balancedDeckValues() {
  const families = new Map();
  values.forEach(value => {
    if (!families.has(value.category)) families.set(value.category, []);
    families.get(value.category).push(value);
  });
  const familyNames = [...families.keys()].sort((a, b) => a.localeCompare(b));
  const ordered = [];
  let row = 0;
  while (ordered.length < values.length) {
    familyNames.forEach(name => {
      const value = families.get(name)[row];
      if (value) ordered.push(value);
    });
    row += 1;
  }
  return ordered;
}

function browseValues() {
  const orderIsCurrent = browseOrderIds.length === values.length && browseOrderIds.every(id => valueMap.has(id));
  if (!orderIsCurrent) {
    browseOrderIds = values.map(value => value.id);
    for (let index = browseOrderIds.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [browseOrderIds[index], browseOrderIds[swapIndex]] = [browseOrderIds[swapIndex], browseOrderIds[index]];
    }
  }
  return getValues(browseOrderIds);
}

function revealValues() {
  const saved = getValues(state.revealSampleIds);
  if (saved.length === 17) return saved;
  const sample = balancedDeckValues().slice(0, 17);
  state.revealSampleIds = sample.map(value => value.id);
  saveState();
  return sample;
}

function cardMarkup(value, { compact = false, staticCard = false, flippable = null, showFlipHint = false } = {}) {
  const titleClass = value.title.length >= 11 ? " long-title" : "";
  const canFlip = flippable ?? !staticCard;
  const jigsaw = value.back.jigsaw;
  return `<article class="value-card${staticCard ? " static" : ""}${showFlipHint ? " flip-hint-active" : ""}" data-card-id="${value.id}" style="--accent:${value.colour}">
    ${canFlip ? `<button class="flip-control" type="button" aria-label="Turn ${value.title} card over" aria-pressed="false">↻</button>` : ""}
    <div class="card-inner">
      <section class="card-face card-front" aria-label="${value.title} card front" aria-hidden="false">
        <p class="card-category">${value.category}</p>
        <h3 class="card-title${titleClass}">${value.title}</h3>
        <div class="card-art"><img src="${value.illustration}" alt="" loading="lazy"></div>
        <p class="card-question">${value.front.question}</p>
      </section>
      ${canFlip ? `<section class="card-face card-back" aria-label="${value.title} card reverse" aria-hidden="true" inert>
        <p class="back-kicker">What Matters Most in action</p>
        <h3>${value.title}</h3>
        <div class="back-prompts">
          <article><small>What this value looks like</small><p>${value.back.looksLike}</p></article>
          <article><small>This week</small><p>${value.back.thisWeek}</p></article>
          <article class="jigsaw-connection"><small>Pain Management Jigsaw connection</small><a href="#/next-steps" data-link><strong>${jigsaw?.title || "Self management toolbox"}</strong><span>${jigsaw?.connection || "Explore practical approaches that can support what matters to you."}</span></a></article>
        </div>
        ${compact ? "" : `<div class="card-journey"><small>Continue your journey</small><a href="#/next-steps" data-link>Create My Jigsaw</a><a href="#/next-steps" data-link>Pain Management Jigsaw</a></div>`}
      </section>` : ""}
    </div>
    ${canFlip && showFlipHint ? `<p class="flip-hint" aria-live="polite">Turn the card to explore more</p>` : ""}
  </article>`;
}

function pageWelcome() {
  return pageDeckReveal(true);
}

function pageDiscover() {
  return `<section class="page narrow"><p class="eyebrow">Before you begin</p><h1>Let recognition lead.</h1>
    <p class="lead">You do not need to defend a choice or choose the person you think you should be. Notice the values that feel alive, grounding, or quietly familiar.</p>
    <div class="reflection-panel" style="margin-top:42px"><p class="eyebrow">The journey</p><blockquote>Browse. Sort. Reflect. Narrow. Choose. Act.</blockquote><p class="lead">First, meet the whole deck. When sorting begins, you can turn a card over to explore how a value could live in practice.</p><button class="button" data-go="deck">Discover the values</button></div>
  </section>`;
}

function pageDeckGrid() {
  const familyCount = new Set(values.map(value => value.category)).size;
  const entryClass = deckEntryMode === "reveal" ? " deck-from-reveal" : "";
  return `<section class="page deck-page${entryClass}"><div class="deck-layout">
    <div class="deck-main"><div class="section-heading"><div><p class="eyebrow">Discover values</p><h2>Browse the deck</h2></div><p>Move slowly and notice what draws your attention. Nothing is being chosen yet.</p></div>
      <div class="deck-toolbar"><p><strong>${values.length}</strong> values · ${familyCount} families · one personal compass</p><div class="sort-invitation" data-sort-invitation><span>Explore a few cards. The next step will appear when you are ready.</span><button class="button" data-start-sort hidden>Begin sorting</button></div></div>
      <div class="deck-grid">${browseValues().map(v => cardMarkup(v, { flippable: false })).join("")}</div>
    </div></div>
  </section>`;
}

function pageDeckReveal(isLanding = false) {
  const previewValues = revealValues();
  const middle = Math.floor(previewValues.length / 2);
  const previewCards = previewValues.map((value, index) => {
    const offset = index - middle;
    const distance = Math.abs(offset) / middle;
    const fanY = Math.round(32 * Math.pow(distance, 1.45));
    const fanRotation = offset * 4.8;
    const settleY = Math.round(fanY * 0.72);
    const settleRotation = fanRotation * 0.62;
    const fanScale = (1 - distance * 0.035).toFixed(3);
    return `<div class="deck-reveal-card" role="button" tabindex="0" aria-label="Bring ${value.title} forward for a closer look" aria-pressed="false" data-preview-card="${value.id}" style="--i:${index};--stack-x:${offset * 0.6}px;--stack-y:${offset * -0.65}px;--stack-r:${offset * 0.25}deg;--fan-x:${offset * 58}px;--fan-x-tablet:${offset * 34}px;--fan-x-mobile:${offset * 7.5}%;--fan-y:${fanY}px;--fan-r:${fanRotation}deg;--fan-scale:${fanScale};--settle-y:${settleY}px;--settle-r:${settleRotation}deg;--layer:${index + 1}"><div aria-hidden="true">${cardMarkup(value, { compact: true, staticCard: true })}</div></div>`;
  }).join("");

  return `<section class="page deck-reveal-page${isLanding ? " merged-landing" : ""}">
    <div class="deck-reveal-copy"><p class="eyebrow">A quiet place to notice what matters</p><h1>Find the values that feel like home.</h1>
      <p class="lead">Meet the values slowly. Notice what feels familiar, what draws your attention, and let your own compass take shape.</p>
      <p class="deck-reveal-note">A first glimpse from the complete 45-card deck. Nothing is being chosen yet.</p>
      <div class="deck-reveal-actions"><button class="button" type="button" data-enter-deck hidden>Begin gently</button></div>
    </div>
    <div class="deck-reveal-stage">${previewCards}</div>
  </section>`;
}

function pageDeck() {
  return hasRevealedDeck() ? pageDeckGrid() : pageDeckReveal();
}

function revealDeck() {
  const page = app.querySelector(".deck-reveal-page");
  const button = app.querySelector("[data-enter-deck]");
  if (!page || !button || page.classList.contains("is-fanning")) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    page.classList.add("is-fanning", "is-exploring");
    button.hidden = false;
    return;
  }

  page.classList.add("is-fanning");
  window.setTimeout(() => {
    if (!page.isConnected) return;
    page.classList.add("is-exploring");
    button.hidden = false;
  }, 1800);
}

function enterDeck() {
  const page = app.querySelector(".deck-reveal-page");
  const button = app.querySelector("[data-enter-deck]");
  if (!page || !button || button.disabled) return;
  button.disabled = true;
  markDeckRevealed();
  page.classList.add("is-settling");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const delay = reducedMotion ? 90 : 360;
  window.setTimeout(() => {
    const route = routeFromHash();
    if (route !== "deck" && route !== "welcome") return;
    deckEntryMode = "reveal";
    if (route === "welcome") navigate("deck");
    else render();
    deckEntryMode = "";
  }, delay);
}

function startSorting() {
  const page = app.querySelector(".deck-page");
  const button = app.querySelector("[data-start-sort]");
  if (!page || !button || button.disabled) return;
  button.disabled = true;
  page.classList.add("is-gathering");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.setTimeout(() => {
    if (routeFromHash() !== "deck") return;
    sortEntryPending = true;
    navigate("sort");
    sortEntryPending = false;
  }, reducedMotion ? 70 : 560);
}

function togglePreviewCard(card) {
  const wasActive = card.classList.contains("is-active");
  app.querySelectorAll("[data-preview-card]").forEach(item => {
    item.classList.remove("is-active");
    item.setAttribute("aria-pressed", "false");
  });
  if (!wasActive) {
    card.classList.add("is-active");
    card.setAttribute("aria-pressed", "true");
  }
}

function nextUnsortedValue() {
  const sorted = new Set(Object.values(state.piles).flat());
  const balance = getValue("balance");
  if (balance && !sorted.has(balance.id)) return balance;
  return balancedDeckValues().find(value => value.id !== "balance" && !sorted.has(value.id)) || null;
}

function pageSort() {
  const sortedCount = Object.values(state.piles).flat().length;
  if (state.sortPauseAt === sortedCount) return pageSortPause(sortedCount);
  const value = nextUnsortedValue();
  if (!value) return pageSortComplete();
  state.sortIndex = sortedCount;
  const remaining = values.length - sortedCount;
  const chapterPosition = (sortedCount % SORT_CHAPTER_SIZE) + 1;
  return `<section class="page sort-layout${sortEntryPending ? " sort-entering" : ""}">
    <div class="sort-card-wrap">${cardMarkup(value, { compact: true, showFlipHint: !state.flipHintSeen })}</div>
    <div class="sort-copy"><div class="sort-intro"><p class="eyebrow">Sort the deck</p><h1>What place does <em>${value.title}</em> have in your life?</h1>
      <p class="sort-status">${remaining === 1 ? "This is the final card." : `Card ${chapterPosition} in this small group. ${remaining} values remaining to explore.`} Choose the option that feels most true today.</p></div>
      <div class="sort-choices" role="group" aria-label="Place ${value.title} into a group">
        <button class="sort-choice" data-pile="essential"><kbd>1</kbd><strong>Essential</strong><small>A value I need to feel true to myself.</small></button>
        <button class="sort-choice" data-pile="important"><kbd>2</kbd><strong>Important</strong><small>Meaningful, though not central right now.</small></button>
        <button class="sort-choice" data-pile="unsure"><kbd>3</kbd><strong>Not Important Right Now</strong><small>This does not need my attention at the moment.</small></button>
      </div>
      ${Object.values(state.piles).flat().length ? `<button class="text-button" style="margin-top:22px" data-undo-sort>Undo the last choice</button>` : ""}
    </div></section>`;
}

const sortPausePrompts = {
  15: "What have you been choosing instinctively?",
  30: "Has anything surprised you about what matters right now?",
  45: "As the final group approaches, what deserves your fullest attention?"
};

function pageSortPause(sortedCount) {
  const groupNumber = sortedCount / SORT_CHAPTER_SIZE;
  return `<section class="page narrow"><div class="reflection-panel"><p class="eyebrow">A quiet pause · group ${groupNumber}</p><blockquote>${sortPausePrompts[sortedCount]}</blockquote>
    <p class="lead">Let your earlier choices rest. There is nothing to review or correct before you continue.</p>
    <div class="intro-actions"><button class="button" data-continue-sort>Meet the next group</button><button class="text-button" data-undo-sort>Undo the last choice</button></div>
  </div></section>`;
}

function pageSortComplete() {
  const count = state.piles.essential.length;
  return `<section class="page narrow"><div class="reflection-panel"><p class="eyebrow">A pause</p><h2>You listened to the whole deck.</h2>
    <p class="lead">You placed ${count} ${count === 1 ? "value" : "values"} in Essential. Only these move forward. The rest are not lost; they have simply made room for what matters most now.</p>
    <button class="button" data-begin-narrowing ${count < 3 ? "disabled" : ""}>Continue with my essential values</button>
    ${count < 3 ? `<p class="note">Choose at least three Essential values to shape a compass. Undo a few choices and return values to Essential.</p><button class="text-button" data-revisit-sort>Revisit the sort</button>` : ""}
  </div></section>`;
}

const reductionPrompts = {
  10: "Which values would you regret losing?",
  5: "Which values consistently bring out the best in you?",
  3: "If life became difficult tomorrow, which three would still guide your choices?"
};

function nextTarget(count) {
  return [10, 5, 3].find(target => target < count) || null;
}

function routeForTarget(target) {
  if (target === 10) return "top-ten";
  if (target === 5) return "top-five";
  if (target === 3) return "top-three";
  return "reflection";
}

function beginNarrowing() {
  if (!state.candidates.length) state.candidates = [...state.piles.essential];
  const target = nextTarget(state.candidates.length);
  if (!target) return navigate(state.candidates.length === 3 ? "synthesis" : "north-star");
  state.pendingTarget = target;
  state.reflectionFrom = state.candidates.length;
  state.reductionSelection = [];
  navigate(routeForTarget(target));
}

function pageReflection() {
  const target = state.pendingTarget || nextTarget(state.candidates.length || state.piles.essential.length);
  if (!target) return pageNorthStar();
  return `<section class="page narrow"><div class="reflection-panel"><p class="eyebrow">From ${state.reflectionFrom || state.candidates.length} to ${target}</p>
    <blockquote>${reductionPrompts[target]}</blockquote>
    <p class="lead">There is no need to rush. Read the question once, breathe, then notice which cards ask to remain.</p>
    <button class="button" data-open-reduction="${target}">Sit with these values</button></div></section>`;
}

function progressItem(label, status = "upcoming") {
  const className = status === "complete" ? "is-complete" : status === "current" ? "is-current" : "";
  const current = status === "current" ? ' aria-current="step"' : "";
  return `<span role="listitem" class="${className}"${current} aria-label="${label}, ${status}">${label}</span>`;
}

function pageReduction(target) {
  const candidates = getValues(state.candidates);
  const selected = new Set(state.reductionSelection || []);
  const stages = [10, 5, 3];
  return `<section class="page reduction-page${selected.size ? " has-selection" : ""}${selected.size === target ? " is-complete" : ""}">
    <div class="journey-progress" role="list" aria-label="Your compass progress">${stages.map(stage => progressItem(String(stage), stage === target ? "current" : stage > target ? "complete" : "upcoming")).join("")}${progressItem("North Star")}</div>
    <div class="reduction-heading"><div><p class="eyebrow">Your values are taking shape</p><h2>Carry forward ${target}.</h2></div><div class="reduction-prompt"><small>Let this one question guide you</small><p>${reductionPrompts[target]}</p></div></div>
    <p class="reduction-instruction">Tap the values you want to keep. You can change your choices until the tray is full.</p>
    <div class="selection-grid">${candidates.map(v => `<button class="selectable" type="button" data-select-value="${v.id}" aria-pressed="${selected.has(v.id)}" aria-label="${selected.has(v.id) ? "Remove" : "Keep"} ${v.title}">${cardMarkup(v, { compact: true, staticCard: true })}<span class="choice-marker">${selected.has(v.id) ? "Carrying forward" : "Keep this value"}</span></button>`).join("")}</div>
    <div class="selection-bar${selected.size === target ? " is-ready" : ""}"><div><p><strong data-selection-count>${selected.size}</strong><span> / ${target}</span></p><small data-selection-message>${selected.size === target ? `Your ${target} are ready.` : `${target - selected.size} more to choose`}</small></div><button class="button" data-confirm-reduction="${target}" ${selected.size !== target ? "disabled" : ""}>Continue with my ${target}</button></div>
  </section>`;
}

function pageNorthStar() {
  const finalists = getValues(state.candidates);
  return `<section class="page north-star-page"><div class="journey-progress" role="list" aria-label="Your compass progress">${progressItem("10", "complete")}${progressItem("5", "complete")}${progressItem("3", "complete")}${progressItem("North Star", "current")}</div><div class="section-heading"><div><p class="eyebrow">One final choice</p><h2>Which value leads the way?</h2></div><p>Choose the value you most want people to experience through you. Your other two remain part of your compass.</p></div>
    <div class="north-grid">${finalists.map(v => `<button class="north-choice" type="button" data-north="${v.id}" aria-label="Choose ${v.title} as my North Star" aria-pressed="${state.northStar === v.id}">${cardMarkup(v, { compact: true, staticCard: true })}</button>`).join("")}</div>
    <div class="north-confirm"><button class="button" data-confirm-north ${state.northStar ? "" : "disabled"}>Make this my North Star</button></div>
  </section>`;
}

function pageSynthesis() {
  const finalists = getValues(state.candidates);
  if (finalists.length !== 3) return pageNorthStar();
  return `<section class="page narrow"><div class="reflection-panel"><p class="eyebrow">Your three guiding values</p><h2>${finalists.map(value => value.title).join(" · ")}</h2>
    <blockquote>Together, what kind of life do these values point toward?</blockquote>
    <p class="lead">One sentence is enough. This is not a promise or a permanent definition—only what you can see from where you are now.</p>
    <form class="synthesis-form" id="synthesisForm"><label for="synthesisText">In my own words</label><textarea id="synthesisText" name="synthesis" placeholder="Together, these values point towards…">${escapeHtml(state.synthesis)}</textarea><button class="button" type="submit">Choose my North Star</button></form>
  </div></section>`;
}

function pageCompass() {
  const north = getValue(state.northStar) || getValue(state.candidates[0]);
  const finalists = getValues(state.candidates);
  if (!north) return pageWelcome();
  const finalistIds = new Set(finalists.map(value => value.id));
  const stillMatter = getValues([
    ...state.piles.essential.filter(id => !finalistIds.has(id)),
    ...state.piles.important
  ]).slice(0, 12);
  const history = state.compassHistory.slice(-5).reverse();
  const pieceConnections = finalists.filter(value => value.back?.jigsaw).map(value => ({ value, piece: value.back.jigsaw }));
  return `<section class="page compass-layout"><div class="compass-visual"><div class="compass-centre"><small>North Star</small><strong>${north.title}</strong><div class="compass-values">${finalists.filter(v => v.id !== north.id).map(v => `<span>${v.title}</span>`).join("<span>·</span>")}</div></div></div>
    <div><p class="eyebrow">My Compass</p><h2>Bring ${north.title.toLowerCase()} into the life in front of you.</h2><p class="lead">A compass becomes useful when it meets a real day. Keep the actions small enough to live.</p>
      ${state.synthesis ? `<div class="compass-statement"><small>What these values point towards</small><p>${escapeHtml(state.synthesis)}</p></div>` : ""}
      <form class="action-form" id="actionForm"><label>What this value looks like for me<textarea name="looksLike" placeholder="In my life, this could look like…">${escapeHtml(state.actions.looksLike)}</textarea></label><label>This week<textarea name="thisWeek" placeholder="One gentle intention for this week…">${escapeHtml(state.actions.thisWeek)}</textarea></label><label>Tomorrow<textarea name="tomorrow" placeholder="One small action I can take tomorrow…">${escapeHtml(state.actions.tomorrow)}</textarea></label><div class="intro-actions"><button class="button" type="submit">Save my compass</button><button class="button secondary" type="button" data-go="next-steps">Continue the journey</button></div><p class="save-status" id="saveStatus">Your reflections are saved on this device as you write.</p></form>
      <div class="seasonal-values is-single"><section><p class="eyebrow">Values that still matter</p><p>${stillMatter.length ? stillMatter.map(value => `<span>${value.title}</span>`).join("") : "Other Essential and Important values will appear here."}</p></section></div>
      <div class="compass-tools"><button class="button secondary" type="button" data-export-save>Export my compass</button><label class="button secondary" for="importSave">Import a saved journey</label><input id="importSave" type="file" accept="application/json,.json" data-import-save hidden></div>
      ${history.length ? `<details class="compass-history"><summary>Earlier compass reflections</summary>${history.map(item => `<article><small>${new Date(item.createdAt).toLocaleDateString()}</small><h3>${item.values.map(value => escapeHtml(value.title)).join(" · ")}</h3><p>${escapeHtml(item.synthesis || "A compass saved for this season.")}</p></article>`).join("")}</details>` : ""}
    </div></section>`;
}

function pageNextSteps() {
  const north = getValue(state.northStar);
  return `<section class="page narrow"><p class="eyebrow">Continue your journey</p><h1>Let ${north ? north.title.toLowerCase() : "what matters"} become part of the wider picture.</h1><p class="lead">Your values can travel with you into either jigsaw. Choose the place that feels most useful now.</p>
    <div class="next-grid"><a class="journey-card" href="#build-my-jigsaw" data-integration="build"><p class="eyebrow">Create the picture</p><h3>Create My Jigsaw</h3><p>Bring your three guiding values into the life you are building, one meaningful piece at a time.</p><span>Continue with my values</span></a><a class="journey-card" href="#pain-management-jigsaw" data-integration="pain"><p class="eyebrow">Live well with pain</p><h3>Pain Management Jigsaw</h3><p>Explore the pieces that support living well and use your values to make them personally meaningful.</p><span>Continue with my values</span></a></div>
    <div class="reflection-panel" style="margin-top:25px"><p class="eyebrow">Return</p><blockquote>Your compass can change as life changes.</blockquote><p class="lead">Come back whenever you need to listen again.</p><button class="button secondary" data-go="my-compass">Return to My Compass</button></div>
  </section>`;
}

function pageSynthesisStreamlined() {
  return pageNorthStar();
}

function goalPieceOptions() {
  const grouped = new Map();
  getValues(state.candidates).forEach(value => {
    const piece = value.back?.jigsaw;
    if (!piece) return;
    if (!grouped.has(piece.id)) grouped.set(piece.id, { ...piece, values: [] });
    grouped.get(piece.id).values.push(value);
  });
  return [...grouped.values()];
}

function goalProgress(current) {
  const steps = ["Values", "Direction", "Jigsaw piece", "Goal", "Compass"];
  const currentIndex = steps.indexOf(current);
  return `<div class="goal-progress" role="list" aria-label="Values to goal progress">${steps.map((step, index) => progressItem(step, index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming")).join("")}</div>`;
}

function pageGoalArea() {
  const north = getValue(state.northStar);
  const options = goalPieceOptions();
  if (!north) return pageNorthStar();
  const hasSelectedPiece = options.some(piece => piece.id === state.goal.pieceId);
  return `<section class="page narrow goal-page goal-area-page">
    ${goalProgress("Jigsaw piece")}
    <header class="goal-page-header"><p class="eyebrow">From direction to a place to begin</p><h1>What would you like ${north.title} to guide right now?</h1><p class="lead">Your values point to parts of the Pain Management Jigsaw. Choose one area to shape into a personal goal. The other pieces will remain available later.</p></header>
    <div class="goal-piece-options">${options.map(piece => {
      const selected = state.goal.pieceId === piece.id;
      const valueNames = piece.values.map(value => value.title).join(" and ");
      return `<button class="goal-piece-option" type="button" data-goal-piece="${piece.id}" aria-pressed="${selected}"><span class="jigsaw-tab" aria-hidden="true"></span><small>${piece.values.length > 1 ? "Your values connect here" : `${valueNames} connects here`}</small><strong>${piece.title}</strong><p>${piece.connection}</p><span class="value-bridge">Guided by ${valueNames}</span><span class="choice-state">${selected ? "Chosen for my goal" : "Choose this piece"}</span></button>`;
    }).join("")}</div>
    <div class="goal-page-actions"><button class="button secondary" type="button" data-go="north-star">Back to my North Star</button><button class="button" type="button" data-confirm-goal-piece ${hasSelectedPiece ? "" : "disabled"}>Shape a goal with this piece</button></div>
  </section>`;
}

function pageGoalPlan() {
  const north = getValue(state.northStar);
  const piece = goalPieceOptions().find(option => option.id === state.goal.pieceId);
  if (!north) return pageNorthStar();
  if (!piece) return pageGoalArea();
  const guiding = getValues(state.candidates);
  const complete = Boolean(state.goal.picture.trim() && state.goal.statement.trim() && state.goal.firstStep.trim());
  return `<section class="page narrow goal-page goal-plan-page">
    ${goalProgress("Goal")}
    <header class="goal-page-header"><p class="eyebrow">Your chosen jigsaw piece</p><div class="chosen-piece-label"><small>Pain Management Jigsaw</small><strong>${piece.title}</strong></div><h1>Shape a goal around what matters.</h1><p class="lead">A useful goal keeps the wider picture in sight, respects changing capacity, and begins with a step small enough to place.</p></header>
    <aside class="goal-values-rail" aria-label="Values guiding this goal">${guiding.map(value => `<span class="${value.id === north.id ? "is-north" : ""}"><small>${value.id === north.id ? "North Star" : "Supporting value"}</small><strong>${value.title}</strong></span>`).join("")}</aside>
    <form class="goal-builder" id="goalForm">
      <label><span class="prompt-number">1</span><span><strong>The picture I want to create</strong><small>What would you like to do, experience or make more room for?</small></span><textarea name="picture" required placeholder="For example, I want to spend more time outside and feel connected to my neighbourhood...">${escapeHtml(state.goal.picture)}</textarea></label>
      <label><span class="prompt-number">2</span><span><strong>My goal for now</strong><small>Make it specific enough to try, rather than perfect.</small></span><div class="goal-timeframe"><span>Over the next</span><select name="timeframe" aria-label="Goal timeframe"><option value="one-week" ${state.goal.timeframe === "one-week" ? "selected" : ""}>week</option><option value="two-weeks" ${state.goal.timeframe === "two-weeks" ? "selected" : ""}>two weeks</option><option value="one-month" ${state.goal.timeframe === "one-month" ? "selected" : ""}>month</option></select></div><textarea name="statement" required placeholder="I would like to...">${escapeHtml(state.goal.statement)}</textarea></label>
      <label><span class="prompt-number">3</span><span><strong>A version that respects my capacity</strong><small>On a more difficult day, what smaller or adapted version could keep you connected to the goal?</small></span><textarea name="gentleVersion" placeholder="A smaller version could be...">${escapeHtml(state.goal.gentleVersion)}</textarea></label>
      <label><span class="prompt-number">4</span><span><strong>The first piece I can place</strong><small>Choose one manageable action, not the whole goal.</small></span><textarea name="firstStep" required placeholder="My first small step is...">${escapeHtml(state.goal.firstStep)}</textarea></label>
      <div class="goal-page-actions"><button class="button secondary" type="button" data-go="goal-area">Choose a different piece</button><button class="button" type="submit" ${complete ? "" : "disabled"}>Add this goal to my compass</button></div>
      <p class="goal-save-note" id="goalSaveStatus">Your draft is saved on this device as you write.</p>
    </form>
  </section>`;
}

function pageCompassElevated() {
  const north = getValue(state.northStar) || getValue(state.candidates[0]);
  const finalists = getValues(state.candidates);
  if (!north) return pageWelcome();
  const supporting = finalists.filter(value => value.id !== north.id);
  const pieceConnections = finalists.filter(value => value.back?.jigsaw).map(value => ({ value, piece: value.back.jigsaw }));
  const selectedPiece = goalPieceOptions().find(piece => piece.id === state.goal.pieceId);
  const hasGoal = Boolean(selectedPiece && state.goal.picture.trim() && state.goal.statement.trim() && state.goal.firstStep.trim());
  const finalistIds = new Set(finalists.map(value => value.id));
  const stillMatter = getValues([
    ...state.piles.essential.filter(id => !finalistIds.has(id)),
    ...state.piles.important
  ]).slice(0, 12);
  const history = state.compassHistory.slice(-5).reverse();
  return `<section class="page compass-page">
    ${goalProgress("Compass")}
    <header class="compass-page-header"><p class="eyebrow">Your goal-aligned compass is ready</p><h1>${north.title} leads the way.</h1><p class="lead">Your values show the direction. Your chosen jigsaw piece gives you a place to begin.</p></header>
    <div class="compass-hero">
      <div class="compass-visual"><img class="compass-rose-art" src="assets/svg/compass-rose.svg" alt=""><div class="compass-centre"><small>North Star</small><strong>${north.title}</strong><p>Also guiding me</p><div class="compass-values">${supporting.map(value => `<span>${value.title}</span>`).join("")}</div></div></div>
      <div class="compass-summary"><div class="guiding-value-list"><article class="is-north"><small>Leading value</small><strong>${north.title}</strong></article>${supporting.map(value => `<article><small>Supporting value</small><strong>${value.title}</strong></article>`).join("")}</div>
        ${state.synthesis ? `<div class="compass-statement"><small>The life these values point towards</small><p>${escapeHtml(state.synthesis)}</p></div>` : ""}
        ${hasGoal ? `<article class="compass-goal"><header><small>My chosen jigsaw piece</small><strong>${selectedPiece.title}</strong></header><div><small>The picture I want to create</small><p>${escapeHtml(state.goal.picture)}</p></div><div class="goal-statement"><small>My goal for the next ${state.goal.timeframe === "one-week" ? "week" : state.goal.timeframe === "one-month" ? "month" : "two weeks"}</small><p>${escapeHtml(state.goal.statement)}</p></div>${state.goal.gentleVersion ? `<div><small>When capacity is lower</small><p>${escapeHtml(state.goal.gentleVersion)}</p></div>` : ""}<div class="first-piece"><small>My first piece</small><p>${escapeHtml(state.goal.firstStep)}</p></div><footer><button class="text-button" type="button" data-go="goal-plan">Edit my goal</button><button class="button" type="button" data-save-compass>Save my compass</button></footer></article>` : `<div class="compass-goal-empty"><h3>Add a goal to this compass</h3><p>Choose a Pain Management Jigsaw piece and turn your values into a practical next step.</p><button class="button" type="button" data-go="goal-area">Choose where to begin</button></div>`}
      </div>
    </div>
    <section class="jigsaw-connections-panel"><header><p class="eyebrow">Your personal jigsaw bridge</p><h2>${hasGoal ? "One piece holds your goal. The others stay nearby." : "Where your three values connect."}</h2><p>${hasGoal ? `You chose ${selectedPiece.title}. Your other value connections remain available whenever the picture changes.` : "Each chosen value maps to a practical Pain Management Jigsaw piece. Choose one to give your values a place to act."}</p></header><div class="value-piece-map">${pieceConnections.map(({ value, piece }) => `<article class="value-piece-connection${value.id === north.id ? " is-north" : ""}${piece.id === state.goal.pieceId ? " is-goal-piece" : ""}"><div class="mapped-value"><small>${value.id === north.id ? "North Star" : "Supporting value"}</small><strong>${value.title}</strong></div><span class="mapping-arrow" aria-hidden="true">→</span><a href="#${piece.id}" data-integration="pain" data-piece="${piece.id}"><small>${piece.id === state.goal.pieceId ? "Chosen for my goal" : "Pain Management Jigsaw piece"}</small><strong>${piece.title}</strong><p>${piece.connection}</p><span>Explore this piece →</span></a></article>`).join("")}</div></section>
    <section class="compass-ecosystem"><div><p class="eyebrow">Part of your wider picture</p><h2>Carry the goal into the jigsaws.</h2><p>Your compass, chosen piece and first step can now travel together into the part of life you want to work with next.</p></div><div class="ecosystem-links"><a class="ecosystem-link" href="#build-my-jigsaw" data-integration="build"><small>Create the picture</small><strong>Create My Jigsaw</strong><span>Continue with my goal →</span></a><a class="ecosystem-link" href="#pain-management-jigsaw" data-integration="pain" ${state.goal.pieceId ? `data-piece="${state.goal.pieceId}"` : ""}><small>Live well with pain</small><strong>Pain Management Jigsaw</strong><span>Continue with my chosen piece →</span></a><a class="ecosystem-link" href="#plan-my-pace" data-integration="pace"><small>Plan around capacity</small><strong>Plan My Day</strong><span>Continue with my first step →</span></a></div></section>
    <details class="compass-supporting-values"><summary>Keep my other values nearby</summary><div class="seasonal-values is-single"><section><p class="eyebrow">Values that still matter</p><p>${stillMatter.length ? stillMatter.map(value => `<span>${value.title}</span>`).join("") : "Other Essential and Important values will appear here."}</p></section></div></details>
    <details class="compass-file-tools"><summary>Save file and earlier compasses</summary><div class="compass-tools"><button class="button secondary" type="button" data-export-save>Export my compass</button><label class="button secondary" for="importSave">Import a saved journey</label><input id="importSave" type="file" accept="application/json,.json" data-import-save hidden></div>${history.length ? `<div class="compass-history">${history.map(item => `<article><small>${new Date(item.createdAt).toLocaleDateString()}</small><h3>${item.values.map(value => escapeHtml(value.title)).join(" &middot; ")}</h3><p>${escapeHtml(item.synthesis || "A compass saved for this season.")}</p></article>`).join("")}</div>` : ""}</details>
  </section>`;
}

function fitCardCopy(scope = app) {
  scope.querySelectorAll(".card-front .card-title").forEach(title => {
    title.classList.remove("is-compact", "is-tight");
    if (title.scrollWidth > title.clientWidth + 1 || title.scrollHeight > title.clientHeight + 1) {
      title.classList.add("is-compact");
    }
    if (title.scrollWidth > title.clientWidth + 1 || title.scrollHeight > title.clientHeight + 1) {
      title.classList.add("is-tight");
    }
  });

  scope.querySelectorAll(".card-front .card-question").forEach(question => {
    question.classList.remove("is-compact", "is-tight");
    if (question.scrollHeight > question.clientHeight + 1 || question.scrollWidth > question.clientWidth + 1) {
      question.classList.add("is-compact");
    }
    if (question.scrollHeight > question.clientHeight + 1 || question.scrollWidth > question.clientWidth + 1) {
      question.classList.add("is-tight");
    }
  });
}

function fitCardQuestions(scope = app) {
  fitCardCopy(scope);
}

let cardQuestionResizeFrame;
function scheduleCardQuestionFit() {
  cancelAnimationFrame(cardQuestionResizeFrame);
  cardQuestionResizeFrame = requestAnimationFrame(() => {
    fitCardCopy();
    requestAnimationFrame(() => fitCardCopy());
  });
}

function render() {
  const route = routeFromHash();
  if (route === "welcome") resetDeckReveal();
  state.route = route;
  const views = {
    welcome: pageWelcome,
    discover: pageDiscover,
    deck: pageDeck,
    sort: pageSort,
    reflection: pageReflection,
    "top-ten": () => pageReduction(10),
    "top-five": () => pageReduction(5),
    "top-three": () => pageReduction(3),
    synthesis: pageSynthesisStreamlined,
    "north-star": pageNorthStar,
    "goal-area": pageGoalArea,
    "goal-plan": pageGoalPlan,
    "my-compass": pageCompassElevated,
    "next-steps": pageNextSteps
  };
  app.innerHTML = (views[route] || pageWelcome)();
  const main = document.querySelector("#main");
  const primaryHeading = app.querySelector("h1") || app.querySelector("h2");
  if (primaryHeading) {
    primaryHeading.id ||= "page-title";
    if (!app.querySelector("h1")) {
      primaryHeading.setAttribute("role", "heading");
      primaryHeading.setAttribute("aria-level", "1");
    }
    main?.setAttribute("aria-labelledby", primaryHeading.id);
  } else {
    main?.removeAttribute("aria-labelledby");
  }
  document.title = `${route === "welcome" ? "What Matters Most" : route.split("-").map(x => x[0].toUpperCase() + x.slice(1)).join(" ")} — What Matters Most`;
  bindPageEvents();
  fitCardQuestions();
  saveState();
  requestAnimationFrame(() => document.querySelector("#main")?.focus({ preventScroll: true }));
}

function setCardFlipped(card, flipped) {
  const button = card?.querySelector(".flip-control");
  if (!card) return;
  card.classList.toggle("flipped", flipped);
  card.querySelector(".card-front")?.setAttribute("aria-hidden", String(flipped));
  card.querySelector(".card-back")?.setAttribute("aria-hidden", String(!flipped));
  card.querySelector(".card-front")?.toggleAttribute("inert", flipped);
  card.querySelector(".card-back")?.toggleAttribute("inert", !flipped);
  if (button) {
    const title = card.querySelector(".card-title")?.textContent || "value";
    button.setAttribute("aria-pressed", String(flipped));
    button.setAttribute("aria-label", `${flipped ? "Turn to front of" : "Turn"} ${title} card${flipped ? "" : " over"}`);
  }
}

function bindPageEvents() {
  app.querySelectorAll("[data-go]").forEach(el => el.addEventListener("click", () => navigate(el.dataset.go)));
  app.querySelector("[data-resume]")?.addEventListener("click", () => navigate(state.lastRoute || "sort"));
  app.querySelector("[data-listen-again]")?.addEventListener("click", listenAgain);
  app.querySelector("[data-enter-deck]")?.addEventListener("click", enterDeck);
  if (app.querySelector(".deck-reveal-page")) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(revealDeck, reduced ? 80 : 650);
  }
  app.querySelectorAll("[data-preview-card]").forEach(card => {
    card.addEventListener("click", () => togglePreviewCard(card));
    card.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      togglePreviewCard(card);
    });
  });
  app.querySelector("[data-start-sort]")?.addEventListener("click", startSorting);
  if (routeFromHash() === "deck") {
    const revealInvitation = () => {
      const invitation = app.querySelector("[data-sort-invitation]");
      const button = app.querySelector("[data-start-sort]");
      if (!invitation || !button || !button.hidden) return;
      button.hidden = false;
      invitation.classList.add("is-ready");
      const hint = invitation.querySelector("span");
      if (hint) hint.textContent = "Ready to notice what matters most?";
    };
    app.querySelectorAll(".deck-grid .value-card").forEach(card => {
      const notice = () => {
        exploredDeckCards.add(card.dataset.cardId);
        card.classList.add("noticed");
        if (exploredDeckCards.size >= 6) revealInvitation();
      };
      card.addEventListener("mouseenter", notice, { once: true });
      card.addEventListener("focusin", notice, { once: true });
      card.addEventListener("click", notice, { once: true });
    });
    window.setTimeout(revealInvitation, 12000);
  }
  app.querySelector("[data-continue-sort]")?.addEventListener("click", () => { state.sortPauseAt = null; saveState(); render(); });
  app.querySelectorAll(".flip-control").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    const card = button.closest(".value-card");
    const flipped = !card.classList.contains("flipped");
    setCardFlipped(card, flipped);
    if (!state.flipHintSeen) {
      state.flipHintSeen = true;
      saveState();
    }
    card.classList.remove("flip-hint-active");
    card.querySelector(".flip-hint")?.remove();
  }));
  app.querySelectorAll("[data-pile]").forEach(button => button.addEventListener("click", () => sortCurrent(button.dataset.pile)));
  app.querySelector("[data-undo-sort]")?.addEventListener("click", undoSort);
  app.querySelector("[data-revisit-sort]")?.addEventListener("click", undoSort);
  app.querySelector("[data-begin-narrowing]")?.addEventListener("click", beginNarrowing);
  app.querySelector("[data-open-reduction]")?.addEventListener("click", event => {
    const target = Number(event.currentTarget.dataset.openReduction);
    state.reductionSelection = [];
    const route = routeForTarget(target);
    if (route === "reflection") {
      state.route = "reflection";
      saveState();
      app.innerHTML = pageReduction(target);
      bindPageEvents();
    } else navigate(route);
  });
  app.querySelectorAll("[data-select-value]").forEach(button => button.addEventListener("click", () => toggleReductionValue(button)));
  app.querySelector("[data-confirm-reduction]")?.addEventListener("click", confirmReduction);
  app.querySelectorAll("[data-north]").forEach(button => button.addEventListener("click", () => chooseNorth(button.dataset.north)));
  app.querySelector("[data-confirm-north]")?.addEventListener("click", () => navigate("goal-area"));
  app.querySelectorAll("[data-goal-piece]").forEach(button => button.addEventListener("click", () => chooseGoalPiece(button.dataset.goalPiece)));
  app.querySelector("[data-confirm-goal-piece]")?.addEventListener("click", () => navigate("goal-plan"));
  const goalForm = app.querySelector("#goalForm");
  goalForm?.addEventListener("input", () => saveGoalDraft(goalForm));
  goalForm?.addEventListener("change", () => saveGoalDraft(goalForm));
  goalForm?.addEventListener("submit", event => {
    event.preventDefault();
    saveGoalDraft(goalForm);
    if (!state.goal.picture.trim() || !state.goal.statement.trim() || !state.goal.firstStep.trim()) return;
    navigate("my-compass");
  });
  const synthesisForm = app.querySelector("#synthesisForm");
  synthesisForm?.addEventListener("input", event => { state.synthesis = event.currentTarget.elements.synthesis.value; saveState(); });
  synthesisForm?.addEventListener("submit", event => { event.preventDefault(); state.synthesis = event.currentTarget.elements.synthesis.value; saveState(); navigate("north-star"); });
  const actionForm = app.querySelector("#actionForm");
  actionForm?.addEventListener("input", saveActions);
  actionForm?.addEventListener("submit", event => {
    event.preventDefault();
    saveActions();
    archiveCurrentCompass();
    const button = actionForm.querySelector('button[type="submit"]');
    if (button) {
      button.textContent = "Compass saved ✓";
      button.classList.add("is-saved");
    }
    const status = app.querySelector("#saveStatus");
    if (status) status.textContent = "Your compass is safely saved on this device.";
    showToast("Your compass is saved.");
  });
  app.querySelector("[data-save-compass]")?.addEventListener("click", event => {
    archiveCurrentCompass();
    event.currentTarget.textContent = "Compass saved ✓";
    event.currentTarget.classList.add("is-saved");
    showToast("Your goal-aligned compass is saved.");
  });
  app.querySelector("[data-export-save]")?.addEventListener("click", exportSave);
  app.querySelector("[data-import-save]")?.addEventListener("change", importSave);
  app.querySelectorAll("[data-integration]").forEach(link => link.addEventListener("click", event => {
    event.preventDefault();
    continueToIntegration(link.dataset.integration, link.dataset.piece || "");
  }));
}

function sortCurrent(pile) {
  const currentCount = Object.values(state.piles).flat().length;
  if (state.sortPauseAt === currentCount) return;
  const value = nextUnsortedValue();
  if (!value) return;
  const id = value.id;
  Object.values(state.piles).forEach(items => { const i = items.indexOf(id); if (i >= 0) items.splice(i, 1); });
  state.piles[pile].push(id);
  state.sortHistory.push(id);
  const sortedCount = Object.values(state.piles).flat().length;
  state.sortIndex = sortedCount;
  if (sortedCount < values.length && sortedCount % SORT_CHAPTER_SIZE === 0) state.sortPauseAt = sortedCount;
  saveState();
  render();
}

function undoSort() {
  const id = state.sortHistory.pop() || Object.values(state.piles).flat().at(-1);
  if (!id) return;
  Object.values(state.piles).forEach(items => {
    const index = items.indexOf(id);
    if (index >= 0) items.splice(index, 1);
  });
  state.sortPauseAt = null;
  state.candidates = [];
  state.reductionSelection = [];
  saveState();
  navigate("sort", { replace: true });
}

function toggleReductionValue(button) {
  const target = Number(app.querySelector("[data-confirm-reduction]")?.dataset.confirmReduction);
  const id = button.dataset.selectValue;
  const selected = new Set(state.reductionSelection || []);
  if (selected.has(id)) selected.delete(id);
  else if (selected.size < target) selected.add(id);
  else return showToast(`Choose only ${target}. Remove one before adding another.`);
  state.reductionSelection = [...selected];
  button.setAttribute("aria-pressed", String(selected.has(id)));
  const marker = button.querySelector(".choice-marker");
  if (marker) marker.textContent = selected.has(id) ? "Carrying forward" : "Keep this value";
  app.querySelector("[data-selection-count]").textContent = selected.size;
  const confirmButton = app.querySelector("[data-confirm-reduction]");
  const message = app.querySelector("[data-selection-message]");
  const bar = app.querySelector(".selection-bar");
  const page = app.querySelector(".reduction-page");
  confirmButton.disabled = selected.size !== target;
  if (message) message.textContent = selected.size === target ? `Your ${target} are ready.` : `${target - selected.size} more to choose`;
  bar?.classList.toggle("is-ready", selected.size === target);
  page?.classList.toggle("has-selection", selected.size > 0);
  page?.classList.toggle("is-complete", selected.size === target);
  saveState();
}

function confirmReduction() {
  const selected = state.reductionSelection || [];
  const target = Number(app.querySelector("[data-confirm-reduction]")?.dataset.confirmReduction);
  if (selected.length !== target) return;
  state.candidates = [...selected];
  state.reductionSelection = [];
  const next = nextTarget(target);
  if (!next) return navigate("north-star");
  state.pendingTarget = next;
  state.reflectionFrom = target;
  navigate(routeForTarget(next));
}

function chooseNorth(id) {
  state.northStar = id;
  saveState();
  app.querySelectorAll("[data-north]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.north === id)));
  app.querySelector("[data-confirm-north]").disabled = false;
}

function chooseGoalPiece(id) {
  if (!goalPieceOptions().some(piece => piece.id === id)) return;
  state.goal.pieceId = id;
  saveState();
  app.querySelectorAll("[data-goal-piece]").forEach(button => {
    const selected = button.dataset.goalPiece === id;
    button.setAttribute("aria-pressed", String(selected));
    const choice = button.querySelector(".choice-state");
    if (choice) choice.textContent = selected ? "Chosen for my goal" : "Choose this piece";
  });
  const confirmButton = app.querySelector("[data-confirm-goal-piece]");
  if (confirmButton) confirmButton.disabled = false;
}

function saveGoalDraft(form) {
  const fields = Object.fromEntries(new FormData(form).entries());
  state.goal = { ...state.goal, ...fields };
  saveState();
  const complete = Boolean(state.goal.picture.trim() && state.goal.statement.trim() && state.goal.firstStep.trim());
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = !complete;
  const status = app.querySelector("#goalSaveStatus");
  if (status) status.textContent = complete ? "Your goal is ready to add to your compass." : "Your draft is saved on this device as you write.";
}

function saveActions() {
  const form = new FormData(app.querySelector("#actionForm"));
  state.actions = Object.fromEntries(form.entries());
  saveState();
  const status = app.querySelector("#saveStatus");
  if (status) status.textContent = "Saved on this device.";
}

function compassSnapshot() {
  const finalists = getValues(state.candidates);
  if (finalists.length !== 3 || !state.northStar) return null;
  const finalistIds = new Set(finalists.map(value => value.id));
  return {
    createdAt: new Date().toISOString(),
    values: finalists.map(value => ({ id: value.id, title: value.title, category: value.category })),
    northStar: state.northStar,
    synthesis: state.synthesis,
    actions: { ...state.actions },
    goal: { ...state.goal },
    stillMatter: [
      ...state.piles.essential.filter(id => !finalistIds.has(id)),
      ...state.piles.important
    ].slice(0, 12)
  };
}

function archiveCurrentCompass() {
  const snapshot = compassSnapshot();
  if (!snapshot) return;
  const signature = item => JSON.stringify({ values: item.values, northStar: item.northStar, synthesis: item.synthesis, actions: item.actions, goal: item.goal });
  const previous = state.compassHistory.at(-1);
  if (!previous || signature(previous) !== signature(snapshot)) state.compassHistory.push(snapshot);
  saveState();
}

function listenAgain() {
  archiveCurrentCompass();
  const history = [...state.compassHistory];
  state = freshState();
  state.compassHistory = history;
  browseOrderIds = [];
  resetDeckReveal();
  saveState();
  navigate("welcome", { replace: true });
}

function exportSave() {
  archiveCurrentCompass();
  const payload = { type: "life-compass-save", version: SAVE_VERSION, datasetId: DATASET_ID, exportedAt: new Date().toISOString(), state };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `what-matters-most-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Your What Matters Most file is ready.");
}

async function importSave(event) {
  const file = event.currentTarget.files?.[0];
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    if (payload.type !== "life-compass-save" || payload.datasetId !== DATASET_ID || !payload.state) throw new Error("This is not a compatible What Matters Most save.");
    state = migrateState(payload.state);
    saveState();
    showToast("Your saved journey has been restored.");
    navigate(routes.has(state.route) ? state.route : "my-compass", { replace: true });
  } catch (error) {
    showToast(error.message || "That save file could not be opened.");
  } finally {
    event.currentTarget.value = "";
  }
}

function continueToIntegration(key, pieceId = "") {
  const payload = compassSnapshot();
  if (!payload) return showToast("Choose your North Star before continuing.");
  try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload)); } catch { /* The event below still exposes the handoff in this page. */ }
  window.dispatchEvent(new CustomEvent("lifecompasshandoff", { detail: { product: key, pieceId, payload } }));
  const destination = INTEGRATIONS[key];
  if (destination) {
    const url = new URL(destination, window.location.href);
    url.searchParams.set("values", payload.values.map(value => value.id).join(","));
    url.searchParams.set("northStar", payload.northStar);
    if (payload.goal?.pieceId) url.searchParams.set("goalPiece", payload.goal.pieceId);
    if (key === "build" || key === "pace") url.searchParams.set("return", "values");
    if (key === "pain" && pieceId) {
      const piecePage = PAIN_JIGSAW_PAGES[pieceId];
      if (piecePage && url.pathname.endsWith("/")) url.pathname += piecePage;
      else url.hash = pieceId;
      url.searchParams.set("piece", pieceId);
      url.searchParams.set("return", "values");
    }
    window.location.assign(url.href);
  }
  else showToast(`${key === "build" ? "Create My Jigsaw" : key === "pace" ? "Plan My Day" : "Pain Management Jigsaw"} is prepared for its final website address.`);
}

document.addEventListener("click", event => {
  const link = event.target.closest("[data-link]");
  if (!link) return;
  event.preventDefault();
  navigate(link.hash.replace(/^#\//, ""));
});

document.addEventListener("keydown", event => {
  if (routeFromHash() !== "sort" || event.target.matches("input, textarea, select")) return;
  const pile = { "1": "essential", "2": "important", "3": "unsure" }[event.key];
  if (pile) sortCurrent(pile);
});

window.addEventListener("popstate", render);
window.addEventListener("hashchange", render);
resumeButton.addEventListener("click", () => navigate(state.lastRoute || "sort"));
document.querySelector("#startAgainButton").addEventListener("click", () => {
  if (!confirm("Start What Matters Most again? Your saved choices and reflections will be cleared.")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = freshState();
  browseOrderIds = [];
  resetDeckReveal();
  navigate("welcome", { replace: true });
  showToast("A fresh journey is ready.");
});


window.addEventListener("resize", scheduleCardQuestionFit);
if (document.fonts?.ready) document.fonts.ready.then(scheduleCardQuestionFit);
if ("ResizeObserver" in window) {
  const cardQuestionObserver = new ResizeObserver(scheduleCardQuestionFit);
  cardQuestionObserver.observe(app);
}

async function init() {
  try {
    if (Array.isArray(window.LIFE_COMPASS_VALUES)) {
      values = window.LIFE_COMPASS_VALUES;
    } else {
      const response = await fetch("data/values-45.json");
      if (!response.ok) throw new Error(`Could not load values (${response.status})`);
      values = await response.json();
    }
    if (typeof window.LIFE_COMPASS_ENRICH_COPY === "function") values = values.map(window.LIFE_COMPASS_ENRICH_COPY);
    if (typeof window.LIFE_COMPASS_ENRICH_JIGSAW === "function") values = values.map(window.LIFE_COMPASS_ENRICH_JIGSAW);
    valueMap = new Map(values.map(value => [value.id, value]));
    if (new URLSearchParams(location.search).get("demo") === "family") {
      state = freshState();
      state.candidates = ["family", "balance", "perseverance"];
      state.northStar = "family";
      state.synthesis = "I want to stay connected to family life while caring for my health and energy.";
      state.goal = {
        pieceId: "reconnect-to-life",
        picture: "To feel more involved in ordinary family moments.",
        statement: "Share one relaxed activity with my family twice this week.",
        timeframe: "two-weeks",
        gentleVersion: "Sit with everyone for ten minutes or send a message if I need more rest.",
        firstStep: "Ask what simple activity we could enjoy together this weekend."
      };
      state.lastRoute = "goal-plan";
      saveState();
    }
    const requested = routeFromHash();
    if (!location.hash) history.replaceState(null, "", `#/welcome`);
    state.route = requested;
    render();
  } catch (error) {
    app.innerHTML = `<section class="error-panel"><h1>What Matters Most could not open.</h1><p>${error.message}. Check that the project files are still together in their original folders.</p></section>`;
    console.error(error);
  }
}

init();
