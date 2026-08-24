const STORAGE_KEY = "living-well-pacing-v4";
const HANDOFF_KEY = "life-compass-handoff-values-45-v1";
const activityOptions = [
  ["", "Choose an activity"],
  ["personal-care", "Necessary — personal care"],
  ["meal", "Necessary — prepare a meal"],
  ["household", "Necessary — household task"],
  ["appointment", "Necessary — appointment or errand"],
  ["connection", "Meaningful — time with someone"],
  ["outside", "Meaningful — time outside"],
  ["movement", "Meaningful — comfortable movement"],
  ["hobby", "Meaningful — hobby or interest"],
  ["pause", "Restorative — quiet recovery pause"],
  ["relax", "Restorative — relaxation or mindfulness"],
  ["custom", "Something else…"]
];
const labels = Object.fromEntries(activityOptions);
const effortPoints = { light: 2, medium: 4, high: 6 };
const restorativePoints = { light: 1, medium: 2, high: 3 };
const versionFactors = { full: 1, smaller: .67, minimum: .33 };
const makeId = () => globalThis.crypto?.randomUUID?.() || `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const exampleRows = () => [
  { id: makeId(), activity: "household", custom: "", effort: "high", version: "full", timing: "morning", recovery: "short" },
  { id: makeId(), activity: "connection", custom: "", effort: "medium", version: "full", timing: "midday", recovery: "short" },
  { id: makeId(), activity: "relax", custom: "", effort: "light", version: "minimum", timing: "afternoon", recovery: "none" }
];
const freshState = () => ({ capacity: 12, activities: [], meaningfulActivity: "", recoveryChoice: "", lowerVersion: "", pattern: "boom" });
let state = load();

document.querySelectorAll(".capacity-token-set").forEach(set => {
  const units = Number(set.dataset.units) || 0;
  set.innerHTML = Array.from({length:units},() => '<i aria-hidden="true"></i>').join("");
});

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return saved && Array.isArray(saved.activities) ? { ...freshState(), ...saved } : freshState();
  } catch { return freshState(); }
}
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} }
function escapeHtml(value = "") { return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c])); }
function handoff() { try { return JSON.parse(sessionStorage.getItem(HANDOFF_KEY) || "null"); } catch { return null; } }
function rowLabel(row) { return row.activity === "custom" ? row.custom.trim() || "My activity" : labels[row.activity] || "Activity"; }
function isRestorative(row) { return ["pause","relax"].includes(row.activity) || (row.activity === "custom" && row.nature === "restorative"); }
function rowEnergy(row, adapted = true) {
  const effort = (isRestorative(row) ? restorativePoints : effortPoints)[row.effort] || 1;
  const factor = adapted ? versionFactors[row.version] || 1 : 1;
  return Math.max(1, Math.round(effort * factor));
}
function energyTotals() {
  const rows = state.activities.filter(row => row.activity);
  const consuming = rows.filter(row => !isRestorative(row)).reduce((sum,row) => sum + rowEnergy(row),0);
  const restorative = rows.filter(isRestorative).reduce((sum,row) => sum + rowEnergy(row),0);
  const restored = Math.min(restorative, consuming);
  const used = Math.max(0, consuming - restored);
  return { consuming, restorative, restored, used, remaining: state.capacity - used };
}
function optionMarkup(options, current) { return options.map(([value,label]) => `<option value="${value}" ${value === current ? "selected" : ""}>${label}</option>`).join(""); }

const incoming = handoff();
if (new URLSearchParams(location.search).get("demo") === "family") {
  state = { ...freshState(), activities:exampleRows(), meaningfulActivity:"Spend a little time gardening and still have energy for family", recoveryChoice:"Sit somewhere comfortable with a drink between activities", lowerVersion:"Tend one pot for ten minutes, or sit outside and notice the garden" };
}
if (incoming?.goal) {
  const summary = document.querySelector("#handoffSummary");
  const north = incoming.values?.find(value => value.id === incoming.northStar)?.title || "what matters";
  summary.hidden = false;
  summary.innerHTML = `<strong>Carried from your compass: ${escapeHtml(north)}</strong><br>${escapeHtml(incoming.goal.statement || incoming.goal.firstStep || "Your meaningful next step")}`;
  if (!state.meaningfulActivity) state.meaningfulActivity = incoming.goal.firstStep || incoming.goal.statement || "";
}

const rowsHost = document.querySelector("#activityRows");
function renderRowsLegacy() {
  rowsHost.innerHTML = state.activities.map((row,index) => `<article class="activity-row" data-row="${row.id}">
    <header><span>${index + 1}</span><strong>${escapeHtml(rowLabel(row))}</strong><b class="row-energy">${row.activity ? `${rowEnergy(row)} energy ${rowEnergy(row) === 1 ? "unit" : "units"}` : "Choose an activity"}</b><button type="button" data-remove-row aria-label="Remove ${escapeHtml(rowLabel(row))}">Remove</button></header>
    <div class="activity-fields">
      <label>Activity<select data-field="activity">${optionMarkup(activityOptions,row.activity)}</select></label>
      <label class="custom-name" ${row.activity === "custom" ? "" : "hidden"}>Name it<input data-field="custom" value="${escapeHtml(row.custom)}" placeholder="Name this activity"></label>
      <label>Effort today<select data-field="effort">${optionMarkup([["light","Light — 2 units"],["medium","Moderate — 4 units"],["high","Higher — 6 units"]],row.effort)}</select></label>
      <label>Amount today<select data-field="version">${optionMarkup([["full","Usual amount"],["smaller","Smaller amount"],["minimum","Minimum amount"]],row.version)}</select></label>
      <label>Timing<select data-field="timing">${optionMarkup([["morning","Morning"],["midday","Midday"],["afternoon","Afternoon"],["evening","Evening"]],row.timing)}</select></label>
      <label>Recovery after<select data-field="recovery">${optionMarkup([["none","No planned pause"],["short","Short pause"],["long","Longer recovery"]],row.recovery)}</select></label>
    </div>
  </article>`).join("");
  rowsHost.querySelectorAll("select,input").forEach(control => control.addEventListener("change", updateRow));
  rowsHost.querySelectorAll("input").forEach(control => control.addEventListener("input", updateRow));
  rowsHost.querySelectorAll("[data-remove-row]").forEach(button => button.addEventListener("click", () => {
    if (state.activities.length === 1) return;
    state.activities = state.activities.filter(row => row.id !== button.closest("[data-row]").dataset.row); save(); renderRows();
  }));
  renderEnergySummary();
}
function renderEnergySummary() {
  const { consuming, restorative, restored, used, remaining } = energyTotals();
  const summary = document.querySelector("#energySummary");
  if (!summary) return;
  const detail = remaining > 0
    ? `${remaining} ${remaining === 1 ? "unit is" : "units are"} left available, giving the day more flexibility.`
    : remaining === 0
      ? "The estimate uses all the energy you selected, leaving no flexibility for change."
      : `This is ${Math.abs(remaining)} ${Math.abs(remaining) === 1 ? "unit" : "units"} above today’s estimate. Try a smaller amount, reduce an effort estimate or move something.`;
  const restorativeText = restorative ? ` − ${restored} restored` : "";
  summary.className = `energy-summary ${remaining < 0 ? "is-over" : remaining === 0 ? "is-full" : "is-within"}`;
  summary.innerHTML = `<strong>${used} of ${state.capacity} net energy units used</strong><span>${detail}</span><span class="energy-summary__math">${consuming} consuming${restorativeText} = ${used} net used. Restorative estimates cannot take the display above today’s starting energy.</span>`;
  const tray = document.querySelector("#energyTray");
  if (tray) tray.innerHTML = `<strong>Energy today</strong><div class="energy-token-line" aria-label="${Math.max(0,remaining)} of ${state.capacity} energy units available">${Array.from({length:state.capacity},(_,index) => `<i class="${index < used ? "is-placed" : ""}"></i>`).join("")}</div><small>${Math.max(0,remaining)} available${restored ? ` · ${restored} restored` : ""}</small>`;
}
function updateRow(event) {
  const article = event.target.closest("[data-row]");
  const row = state.activities.find(item => item.id === article.dataset.row);
  row[event.target.dataset.field] = event.target.value;
  const wasOpen = article.querySelector("details")?.open;
  save(); renderRows();
  if (wasOpen) rowsHost.querySelector(`[data-row="${row.id}"] details`)?.setAttribute("open", "");
}
const timingOptions = [["morning","Morning"],["midday","Midday"],["afternoon","Later"],["evening","Evening"]];
const activityType = row => ["personal-care","meal","household","appointment"].includes(row.activity) ? "necessary" : isRestorative(row) ? "restorative" : row.activity === "custom" ? "personal" : "meaningful";
const energyDots = count => Array.from({length:count},() => "<i></i>").join("");
function renderRows() {
  rowsHost.innerHTML = timingOptions.map(([timing,title]) => {
    const cards = state.activities.filter(row => row.activity && row.timing === timing).map(row => {
      const type = activityType(row);
      const restorative = isRestorative(row);
      const effortOptions = restorative ? [["light","A little · +1"],["medium","Some · +2"],["high","More · +3"]] : [["light","Light · 2"],["medium","Moderate · 4"],["high","Higher · 6"]];
      return `<article class="day-card-tile is-${type}" data-row="${row.id}">
      <div class="day-card-tile__face"><span class="tile-symbol" aria-hidden="true">${type === "necessary" ? "◆" : type === "restorative" ? "○" : type === "personal" ? "+" : "●"}</span><div><small>${type === "personal" ? "energy-consuming · my own" : type}</small><strong>${escapeHtml(rowLabel(row))}</strong></div><div class="tile-energy" aria-label="${restorative ? "Adds" : "Uses"} ${rowEnergy(row)} energy units">${energyDots(rowEnergy(row))}</div></div>
      <details><summary>Adjust card</summary><div class="tile-controls">
        <label class="custom-name" ${row.activity === "custom" ? "" : "hidden"}>Name it<input data-field="custom" value="${escapeHtml(row.custom)}" placeholder="Name this activity"></label>
        <label class="custom-nature" ${row.activity === "custom" ? "" : "hidden"}>Energy effect<select data-field="nature">${optionMarkup([["consuming","Uses energy"],["restorative","Restorative · adds energy"]],row.nature || "consuming")}</select></label>
        <label>${restorative ? "Restorative effect" : "Effort"}<select data-field="effort">${optionMarkup(effortOptions,row.effort)}</select></label>
        <label>Amount<select data-field="version">${optionMarkup([["full","Usual"],["smaller","Smaller"],["minimum","Minimum"]],row.version)}</select></label>
        <label>Recovery<select data-field="recovery">${optionMarkup([["none","No planned pause"],["short","Short pause"],["long","Longer recovery"]],row.recovery)}</select></label>
        <div class="tile-moves"><button type="button" data-move="earlier">Earlier</button><button type="button" data-move="later">Later</button><button type="button" data-remove-row>Remove</button></div>
      </div></details>
    </article>`;
    }).join("");
    return `<section class="day-zone" data-zone="${timing}"><header><span aria-hidden="true">${timing === "morning" ? "☼" : timing === "midday" ? "◒" : timing === "afternoon" ? "◐" : "☾"}</span><h4>${title}</h4></header><div class="day-zone__cards">${cards || `<p class="empty-zone">Room left open</p>`}</div></section>`;
  }).join("");
  rowsHost.querySelectorAll("select,input").forEach(control => control.addEventListener("change", updateRow));
  rowsHost.querySelectorAll("input").forEach(control => control.addEventListener("input", updateRow));
  rowsHost.querySelectorAll("[data-remove-row]").forEach(button => button.addEventListener("click", () => { state.activities = state.activities.filter(row => row.id !== button.closest("[data-row]").dataset.row); save(); renderRows(); }));
  rowsHost.querySelectorAll("[data-move]").forEach(button => button.addEventListener("click", () => { const row = state.activities.find(item => item.id === button.closest("[data-row]").dataset.row); const index = timingOptions.findIndex(([value]) => value === row.timing); row.timing = timingOptions[button.dataset.move === "earlier" ? Math.max(0,index - 1) : Math.min(timingOptions.length - 1,index + 1)][0]; save(); renderRows(); }));
  renderEnergySummary();
}
document.querySelectorAll("[data-add-activity]").forEach(button => button.addEventListener("click", () => {
  const activity = button.dataset.addActivity;
  const restorative = ["pause","relax"].includes(activity);
  state.activities.push({ id:makeId(), activity, custom:"", nature:"consuming", effort:"medium", version:"full", timing:"afternoon", recovery:restorative ? "none" : "short" }); save(); renderRows();
  const addedCard = rowsHost.querySelector(`[data-row="${state.activities.at(-1).id}"]`);
  if (activity === "custom") addedCard?.querySelector("details")?.setAttribute("open", "");
  addedCard?.scrollIntoView({behavior:"smooth",block:"center"});
}));
renderRows();

const presetCapacities = [4,8,12,16,22];
const customCapacityInput = document.querySelector("#customCapacity");
const customCapacityChoice = document.querySelector("#capacityCustomChoice");
function syncCapacityControls() {
  const isPreset = presetCapacities.includes(state.capacity);
  document.querySelectorAll('[name="capacity"]').forEach(input => { input.checked = input.value === "custom" ? !isPreset : Number(input.value) === state.capacity; });
  customCapacityInput.value = state.capacity;
}
document.querySelectorAll('[name="capacity"]').forEach(input => input.addEventListener("change", () => {
  const next = input.value === "custom" ? Number(customCapacityInput.value) : Number(input.value);
  state.capacity = Math.min(40,Math.max(1,Number.isFinite(next) ? next : 12));
  save(); renderEnergySummary();
}));
customCapacityInput.addEventListener("input", () => {
  const next = Number(customCapacityInput.value);
  if (!Number.isFinite(next) || next < 1) return;
  customCapacityChoice.checked = true;
  state.capacity = Math.min(40,Math.round(next));
  save(); renderEnergySummary();
});
syncCapacityControls();
document.querySelector("#meaningfulActivity").value = state.meaningfulActivity;
document.querySelector("#recoveryChoice").value = state.recoveryChoice;
document.querySelector("#lowerVersion").value = state.lowerVersion;
document.querySelector("#meaningfulActivity").addEventListener("input", event => { state.meaningfulActivity = event.target.value; save(); });
document.querySelector("#recoveryChoice").addEventListener("input", event => { state.recoveryChoice = event.target.value; save(); document.querySelector("#saveStatus").textContent = "Saved in this browser."; });
document.querySelector("#lowerVersion").addEventListener("input", event => { state.lowerVersion = event.target.value; save(); document.querySelector("#saveStatus").textContent = "Saved in this browser."; });

const steps = ["capacity","activities","compare","plan"];
function showStep(id) {
  document.body.classList.toggle("pace-is-beyond-intro", id !== "capacity");
  document.querySelectorAll(".pace-step").forEach(section => { const active = section.dataset.step === id; section.hidden = !active; section.classList.toggle("is-active",active); });
  document.querySelectorAll(".pace-progress span").forEach((item,index) => { const current = steps.indexOf(id); item.classList.toggle("is-current",index === current); item.classList.toggle("is-complete",index < current); if (index === current) item.setAttribute("aria-current","step"); else item.removeAttribute("aria-current"); });
  if (id === "compare") renderComparison(state.pattern);
  if (id === "plan") renderPlan();
  document.querySelector(`[data-step="${id}"] h2`)?.focus({preventScroll:true});
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-next]").forEach(button => button.addEventListener("click", () => {
  if (button.dataset.next === "compare" && !state.activities.some(row => row.activity)) return alert("Choose at least one activity to compare.");
  showStep(button.dataset.next);
}));
document.querySelectorAll("[data-back]").forEach(button => button.addEventListener("click", () => showStep(button.dataset.back)));

function comparisonTotals(rows, adapted) {
  const consuming = rows.filter(row => !isRestorative(row)).reduce((sum,row) => sum + rowEnergy(row,adapted),0);
  const restorative = rows.filter(isRestorative).reduce((sum,row) => sum + rowEnergy(row,adapted),0);
  const restored = Math.min(restorative,consuming);
  const used = Math.max(0,consuming-restored);
  return { consuming,restorative,restored,used,remaining:state.capacity-used };
}
function comparisonTokens(totals) {
  const usedWithin = Math.min(state.capacity,totals.used);
  const over = Math.min(10,Math.max(0,totals.used-state.capacity));
  const label = totals.remaining >= 0 ? `${totals.remaining} of ${state.capacity} energy units remain available` : `${Math.abs(totals.remaining)} energy units beyond today’s estimate`;
  return `<div class="compare-token-strip" role="img" aria-label="${label}">${Array.from({length:state.capacity},(_,index) => `<i class="${index < usedWithin ? "is-used" : "is-available"}"></i>`).join("")}${Array.from({length:over},() => '<i class="is-over"></i>').join("")}</div>`;
}
function comparisonActivity(row,adapted) {
  const restorative = isRestorative(row);
  const energy = rowEnergy(row,adapted);
  const amount = adapted ? row.version === "smaller" ? "Smaller amount" : row.version === "minimum" ? "Minimum amount" : "Usual amount" : "Usual amount";
  return `<div class="compare-activity is-${restorative ? "restorative" : activityType(row)}"><span class="compare-activity__symbol" aria-hidden="true">${restorative ? "○" : activityType(row) === "necessary" ? "◆" : "●"}</span><div><strong>${escapeHtml(rowLabel(row))}</strong><small>${restorative ? "Restorative" : amount}</small></div><b aria-label="${restorative ? "adds" : "uses"} ${energy} energy units">${restorative ? "+" : "−"}${energy}</b></div>`;
}
function recoverySpace(row) {
  if (isRestorative(row) || row.recovery === "none") return "";
  return `<div class="compare-recovery"><span aria-hidden="true">◇</span><small>${row.recovery === "long" ? "Longer recovery space" : "Short pause"}</small></div>`;
}
function comparisonTimeBlock(title,rows,adapted,showRecovery) {
  return `<section class="compare-time${rows.length ? "" : " is-empty"}"><header><span aria-hidden="true">${title === "Morning" ? "☼" : title === "Evening" ? "☾" : "◐"}</span><strong>${title}</strong></header><div>${rows.length ? rows.map(row => comparisonActivity(row,adapted) + (showRecovery ? recoverySpace(row) : "")).join("") : '<small>Room left open</small>'}</div></section>`;
}
function comparisonOutcome(totals,kind) {
  const result = totals.remaining > 0 ? `${totals.remaining} left available` : totals.remaining === 0 ? "No flexibility left" : `${Math.abs(totals.remaining)} beyond the estimate`;
  const math = `${totals.consuming} used${totals.restored ? ` − ${totals.restored} restored` : ""} = ${totals.used} net`;
  return `${comparisonTokens(totals)}<div><strong>${result}</strong><small>${math}. ${kind === "all" ? "Clustering activity leaves less room if the day changes." : "This plan keeps the chosen priorities visible while making room to respond."}</small></div>`;
}
function changeCard(icon,title,copy) { return `<article><span aria-hidden="true">${icon}</span><div><strong>${title}</strong><small>${copy}</small></div></article>`; }
function renderComparison() {
  const rows = state.activities.filter(row => row.activity);
  const allTotals = comparisonTotals(rows,false);
  const pacedTotals = comparisonTotals(rows,true);
  document.querySelector("#allAtOnceBoard").innerHTML = comparisonTimeBlock("Morning",rows,false,false);
  document.querySelector("#pacedBoard").innerHTML = timingOptions.map(([timing,title]) => comparisonTimeBlock(title,rows.filter(row => row.timing === timing),true,true)).join("");
  document.querySelector("#allAtOnceOutcome").innerHTML = comparisonOutcome(allTotals,"all");
  document.querySelector("#pacedOutcome").innerHTML = comparisonOutcome(pacedTotals,"paced");
  const resized = rows.filter(row => !isRestorative(row) && row.version !== "full").length;
  const periods = new Set(rows.map(row => row.timing)).size;
  const restorative = rows.filter(isRestorative).length;
  const pauses = rows.filter(row => !isRestorative(row) && row.recovery !== "none").length;
  const flexibility = pacedTotals.remaining > 0 ? `${pacedTotals.remaining} energy ${pacedTotals.remaining === 1 ? "unit" : "units"} remain available.` : pacedTotals.remaining === 0 ? "The plan uses today’s full estimate." : `The plan remains ${Math.abs(pacedTotals.remaining)} ${Math.abs(pacedTotals.remaining) === 1 ? "unit" : "units"} beyond today’s estimate.`;
  document.querySelector("#comparisonChanges").innerHTML = [
    changeCard("↔",periods > 1 ? `Spread across ${periods} parts of the day` : "Kept in one part of the day",periods > 1 ? "The activities are no longer all clustered together." : "Moving one activity could create more space."),
    changeCard("↘",resized ? `${resized} ${resized === 1 ? "activity has" : "activities have"} a smaller amount` : "Usual amounts are still selected",resized ? "The priority remains, with a more flexible version." : "A smaller or minimum amount remains available to try."),
    changeCard("＋",`${restorative} restorative ${restorative === 1 ? "activity" : "activities"} and ${pauses} planned ${pauses === 1 ? "pause" : "pauses"}`,"Restorative activities add planning energy; pauses protect space."),
    changeCard("●",flexibility,"This is a planning illustration, not a prediction of symptoms.")
  ].join("");
}

function renderPlan() {
  document.querySelector("#planList").innerHTML = state.activities.filter(row => row.activity).map(row => `<article class="plan-row"><div><strong>${escapeHtml(rowLabel(row))}</strong><small>${isRestorative(row) ? "+" : "−"}${rowEnergy(row)} energy ${rowEnergy(row) === 1 ? "unit" : "units"} · ${row.timing} · ${isRestorative(row) ? "restorative" : `${row.effort === "medium" ? "moderate" : row.effort} effort`} · ${row.recovery === "none" ? "no planned pause" : row.recovery + " recovery"}</small></div><select data-version="${row.id}" aria-label="Amount today for ${escapeHtml(rowLabel(row))}">${optionMarkup([["full","Usual amount"],["smaller","Smaller amount"],["minimum","Minimum amount"],["move","Move to another day"],["help","Ask for help"]],row.version)}</select></article>`).join("");
}
document.querySelector("#paceForm").addEventListener("submit", event => {
  event.preventDefault(); document.querySelectorAll("[data-version]").forEach(select => { const row=state.activities.find(item=>item.id===select.dataset.version); if(row) row.version=select.value; }); save();
  document.querySelectorAll(".pace-step").forEach(section => section.hidden=true); document.querySelector(".pace-progress").hidden=true;
  const meaningful=state.meaningfulActivity || state.activities.find(row=>row.activity)?.custom || rowLabel(state.activities.find(row=>row.activity));
  document.querySelector("#finishSummary").textContent=`You have made space for ${meaningful.toLowerCase()}, with amounts and recovery choices that can change with the day.`;
  const panel=document.querySelector("#finishPanel"); panel.hidden=false; panel.focus(); window.scrollTo({top:0,behavior:"smooth"});
});
document.querySelector("#editPlan").addEventListener("click",()=>{ document.querySelector("#finishPanel").hidden=true; document.querySelector(".pace-progress").hidden=false; showStep("plan"); });
document.querySelector("#startPacingAgain").addEventListener("click", () => {
  if (!window.confirm("Clear this pacing draft and start again?")) return;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  state = freshState();
  document.querySelector("#finishPanel").hidden = true;
  document.querySelector(".pace-progress").hidden = false;
  document.querySelector("#meaningfulActivity").value = "";
  document.querySelector("#recoveryChoice").value = "";
  document.querySelector("#lowerVersion").value = "";
  syncCapacityControls();
  renderRows();
  document.querySelector("#saveStatus").textContent = "Fresh pacing plan started. Nothing from the previous draft remains.";
  history.replaceState(null, "", location.pathname);
  showStep("capacity");
});
if(steps.includes(location.hash.slice(1))) showStep(location.hash.slice(1));
