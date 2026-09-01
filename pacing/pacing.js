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
function dateKey(offset = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
const freshState = () => ({ planDate: dateKey(), capacity: 12, activities: [], meaningfulActivity: "", recoveryChoice: "", lowerVersion: "", pattern: "boom" });
let state = load();

function isTomorrowPlan() { return state.planDate === dateKey(1); }
function dayName() { return isTomorrowPlan() ? "tomorrow" : "today"; }
function dayPossessive() { return isTomorrowPlan() ? "tomorrow’s" : "today’s"; }
function formattedDate(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return new Intl.DateTimeFormat(undefined, { weekday:"long", day:"numeric", month:"long" }).format(date);
}

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
      <label>Effort ${dayName()}<select data-field="effort">${optionMarkup([["light","Light — 2 units"],["medium","Moderate — 4 units"],["high","Higher — 6 units"]],row.effort)}</select></label>
      <label>Amount ${dayName()}<select data-field="version">${optionMarkup([["full","Usual amount"],["smaller","Smaller amount"],["minimum","Minimum amount"]],row.version)}</select></label>
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
      : `This is ${Math.abs(remaining)} ${Math.abs(remaining) === 1 ? "unit" : "units"} above ${dayPossessive()} estimate. Try a smaller amount, reduce an effort estimate or move something.`;
  const restorativeText = restorative ? ` − ${restored} restored` : "";
  summary.className = `energy-summary ${remaining < 0 ? "is-over" : remaining === 0 ? "is-full" : "is-within"}`;
  summary.innerHTML = `<strong>${used} of ${state.capacity} net energy units used</strong><span>${detail}</span><span class="energy-summary__math">${consuming} consuming${restorativeText} = ${used} net used. Restorative estimates cannot take the display above ${dayPossessive()} starting energy.</span>`;
  const tray = document.querySelector("#energyTray");
  if (tray) tray.innerHTML = `<strong>Energy ${dayName()}</strong><div class="energy-token-line" aria-label="${Math.max(0,remaining)} of ${state.capacity} energy units available">${Array.from({length:state.capacity},(_,index) => `<i class="${index < used ? "is-placed" : ""}"></i>`).join("")}</div><small>${Math.max(0,remaining)} available${restored ? ` · ${restored} restored` : ""}</small>`;
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

function renderDayCopy() {
  const day = dayName();
  const possessive = dayPossessive();
  document.querySelectorAll('[name="planningDay"]').forEach(input => { input.checked = input.value === (isTomorrowPlan() ? "tomorrow" : "today"); });
  document.querySelector("#todayDateLabel").textContent = `${formattedDate(0)} · plan around how things feel now`;
  document.querySelector("#tomorrowDateLabel").textContent = `${formattedDate(1)} · prepare gently the evening before`;
  document.querySelector("#capacityHeading").textContent = `How much energy feels available ${day}?`;
  document.querySelector("#capacityLegend").textContent = `Capacity available ${day}`;
  document.querySelector("#customCapacityCopy").textContent = `Use a number that makes more sense for you ${day}.`;
  document.querySelector("#customCapacityLabel").textContent = `Custom energy units available ${day}`;
  document.querySelector("#chooseActivitiesButton").textContent = `Choose ${possessive} activities`;
  document.querySelector("#activitiesHeading").textContent = `What needs and deserves space ${day}?`;
  document.querySelector("#activitiesIntro").textContent = `Mix necessary, meaningful and restorative activity. Energy-consuming activities use units; restorative activities can add units back, up to ${possessive} starting estimate.`;
  document.querySelector("#meaningfulActivityLabel").textContent = `One activity that would make ${day} feel worthwhile`;
  document.querySelector("#activityPlannerHeading").textContent = `Place what matters into ${day}`;
  document.querySelector("#activityRows").setAttribute("aria-label", `Activities placed into ${day}`);
  document.querySelector("#planHeading").textContent = `Choose the amount that fits ${day}.`;
  document.querySelector("#savePlanButton").textContent = `Save ${possessive} plan`;
  document.querySelector("#finishEyebrow").textContent = `A compassionate plan for ${day}`;
  renderEnergySummary();
}
document.querySelectorAll('[name="planningDay"]').forEach(input => input.addEventListener("change", () => {
  state.planDate = dateKey(input.value === "tomorrow" ? 1 : 0);
  save();
  renderDayCopy();
}));

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
renderDayCopy();
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
  if (id === "compare") renderComparison();
  if (id === "plan") renderPlan();
  document.querySelector(`[data-step="${id}"] h2`)?.focus({preventScroll:true});
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-next]").forEach(button => button.addEventListener("click", () => {
  if (button.dataset.next === "compare" && !state.activities.some(row => row.activity)) return alert("Choose at least one activity to compare.");
  showStep(button.dataset.next);
}));
document.querySelectorAll("[data-back]").forEach(button => button.addEventListener("click", () => showStep(button.dataset.back)));

const timingLabels = { morning:"Morning", midday:"Midday", afternoon:"Later", evening:"Evening" };
const versionLabels = { full:"Usual amount", smaller:"Smaller amount", minimum:"Minimum amount", move:"Move to another day", help:"Ask for help" };
const recoveryLabels = { none:"No planned pause", short:"Short pause", long:"Longer recovery" };
function baselineTotals() {
  const rows = state.activities.filter(row => row.activity);
  const consuming = rows.filter(row => !isRestorative(row)).reduce((sum,row) => sum + rowEnergy(row,false),0);
  const restorative = rows.filter(isRestorative).reduce((sum,row) => sum + rowEnergy(row,false),0);
  const restored = Math.min(restorative,consuming);
  const used = Math.max(0,consuming - restored);
  return { consuming,restorative,restored,used,remaining:state.capacity - used };
}
function comparisonRow(row, paced) {
  const restorative = isRestorative(row);
  const energy = rowEnergy(row,paced);
  const amount = paced ? versionLabels[row.version] || "Usual amount" : "Usual amount";
  const when = paced ? timingLabels[row.timing] || "Later" : "Close together";
  const pause = restorative ? "Restorative" : paced ? recoveryLabels[row.recovery] || "No planned pause" : "Not protected";
  return `<tr><th scope="row"><strong>${escapeHtml(rowLabel(row))}</strong><small>${amount}</small></th><td>${when}</td><td><span class="comparison-energy ${restorative ? "is-restorative" : ""}">${restorative ? "+" : "−"}${energy}</span></td><td>${pause}</td></tr>`;
}
function comparisonResult(totals, paced) {
  const over = totals.remaining < 0;
  const exact = totals.remaining === 0;
  const width = Math.min(100,Math.round((totals.used / Math.max(1,state.capacity)) * 100));
  const status = over
    ? `${Math.abs(totals.remaining)} ${Math.abs(totals.remaining) === 1 ? "unit" : "units"} above ${dayPossessive()} estimate`
    : exact
      ? `Uses all ${state.capacity} available units`
      : `${totals.remaining} ${totals.remaining === 1 ? "unit" : "units"} left available`;
  const note = paced ? "Protected pauses and flexible amounts leave more room to respond." : "Clustering usual amounts can leave less flexibility if the day changes.";
  return `<strong>${totals.used} of ${state.capacity} net energy units used</strong><div class="energy-meter ${over ? "is-over" : ""}" role="img" aria-label="${totals.used} of ${state.capacity} energy units used"><i style="width:${width}%"></i></div><b>${status}</b><p>${note}</p>`;
}
function renderComparison() {
  const rows = state.activities.filter(row => row.activity);
  document.querySelector("#usualPlanRows").innerHTML = rows.map(row => comparisonRow(row,false)).join("");
  document.querySelector("#pacedPlanRows").innerHTML = rows.map(row => comparisonRow(row,true)).join("");
  document.querySelector("#usualPlanResult").innerHTML = comparisonResult(baselineTotals(),false);
  document.querySelector("#pacedPlanResult").innerHTML = comparisonResult(energyTotals(),true);
}

function renderPlan() {
  document.querySelector("#planList").innerHTML = state.activities.filter(row => row.activity).map(row => `<article class="plan-row"><div><strong>${escapeHtml(rowLabel(row))}</strong><small>${isRestorative(row) ? "+" : "−"}${rowEnergy(row)} energy ${rowEnergy(row) === 1 ? "unit" : "units"} · ${row.timing} · ${isRestorative(row) ? "restorative" : `${row.effort === "medium" ? "moderate" : row.effort} effort`} · ${row.recovery === "none" ? "no planned pause" : row.recovery + " recovery"}</small></div><select data-version="${row.id}" aria-label="Amount ${dayName()} for ${escapeHtml(rowLabel(row))}">${optionMarkup([["full","Usual amount"],["smaller","Smaller amount"],["minimum","Minimum amount"],["move","Move to another day"],["help","Ask for help"]],row.version)}</select></article>`).join("");
}
document.querySelector("#paceForm").addEventListener("submit", event => {
  event.preventDefault(); document.querySelectorAll("[data-version]").forEach(select => { const row=state.activities.find(item=>item.id===select.dataset.version); if(row) row.version=select.value; }); save();
  document.querySelectorAll(".pace-step").forEach(section => section.hidden=true); document.querySelector(".pace-progress").hidden=true;
  const meaningful=state.meaningfulActivity || state.activities.find(row=>row.activity)?.custom || rowLabel(state.activities.find(row=>row.activity));
  document.querySelector("#finishSummary").textContent=`You have made space for ${meaningful.toLowerCase()}, with amounts and recovery choices that can change if ${dayName()} changes.`;
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
  renderDayCopy();
  document.querySelector("#saveStatus").textContent = "Fresh pacing plan started. Nothing from the previous draft remains.";
  history.replaceState(null, "", location.pathname);
  showStep("capacity");
});
if(steps.includes(location.hash.slice(1))) showStep(location.hash.slice(1));
