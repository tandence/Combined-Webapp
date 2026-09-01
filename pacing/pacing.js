const STORAGE_KEY = "living-well-pacing-v6";
const SUMMARY_KEY = "pain-jigsaw-my-summary-pacing-v1";
const HANDOFF_KEY = "life-compass-handoff-values-45-v1";

const activityMeta = {
  "personal-care": { label:"Personal care",type:"necessary",demand:"physical" }, meal:{ label:"Prepare a meal",type:"necessary",demand:"physical" },
  household:{ label:"Household task",type:"necessary",demand:"physical" }, appointment:{ label:"Appointment or errand",type:"necessary",demand:"cognitive" },
  connection:{ label:"Time with someone",type:"meaningful",demand:"emotional" }, outside:{ label:"Time outside",type:"meaningful",demand:"physical" },
  movement:{ label:"Comfortable movement",type:"meaningful",demand:"physical" }, hobby:{ label:"Hobby or interest",type:"meaningful",demand:"cognitive" },
  pause:{ label:"Quiet pause",type:"break",demand:"none" }, relax:{ label:"Relaxation",type:"break",demand:"none" }, custom:{ label:"My activity",type:"meaningful",demand:"general" }
};
const timingOptions = [["morning","Morning"],["midday","Midday"],["afternoon","Later"],["evening","Evening"]];
const timingLabels = Object.fromEntries(timingOptions);
const effortLabels = { light:"Light",medium:"Moderate",high:"Higher" };
const versionLabels = { full:"Usual amount",smaller:"Smaller amount",minimum:"Minimum version",help:"Ask for help",move:"Move to another day" };
const recoveryLabels = { none:"No break planned yet",short:"Short planned break",long:"Longer planned break" };
const capacityCopy = {
  "very-limited":{ title:"Very limited",detail:"Keep the plan especially gentle. A small amount can still be meaningful." },
  lower:{ title:"Lower than usual",detail:"Choose less, make tasks smaller and protect breaks." },
  usual:{ title:"About usual",detail:"Aim for a steady rhythm rather than filling every space." },
  more:{ title:"More available",detail:"Notice the pull to do everything. Leave some room for change." }
};
const makeId = () => crypto.randomUUID?.() || `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const cloneRows = rows => rows.map(row => ({...row}));

function dateKey(offset = 0) { const date = new Date(); date.setHours(12,0,0,0); date.setDate(date.getDate() + offset); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
const freshState = () => ({ planDate:dateKey(),capacity:"usual",activities:[],usualActivities:[],meaningfulActivity:"",recoveryChoice:"",lowerVersion:"" });
function normaliseCapacity(value) { if (capacityCopy[value]) return value; if (typeof value === "number") return value <= 4 ? "very-limited" : value <= 8 ? "lower" : value <= 16 ? "usual" : "more"; return "usual"; }
function normaliseRow(row) { const meta = activityMeta[row.activity] || activityMeta.custom; return { id:row.id || makeId(),activity:row.activity || "custom",custom:row.custom || "",category:row.category || (row.nature === "restorative" ? "break" : meta.type),effort:row.effort || "medium",version:versionLabels[row.version] ? row.version : "full",timing:timingLabels[row.timing] ? row.timing : "afternoon",recovery:recoveryLabels[row.recovery] ? row.recovery : "none" }; }
function load() { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem("living-well-pacing-v5") || "null"); if (!saved || !Array.isArray(saved.activities)) return freshState(); return {...freshState(),...saved,capacity:normaliseCapacity(saved.capacity),activities:saved.activities.map(normaliseRow),usualActivities:Array.isArray(saved.usualActivities) ? saved.usualActivities.map(normaliseRow) : []}; } catch { return freshState(); } }
let state = load();

function save() { try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); } catch {} }
function escapeHtml(value="") { return String(value).replace(/[&<>"']/g,c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
function handoff() { try { return JSON.parse(sessionStorage.getItem(HANDOFF_KEY) || "null"); } catch { return null; } }
function isTomorrowPlan() { return state.planDate === dateKey(1); }
function dayName() { return isTomorrowPlan() ? "tomorrow" : "today"; }
function dayPossessive() { return isTomorrowPlan() ? "tomorrow’s" : "today’s"; }
function formattedDate(offset) { const date = new Date(); date.setDate(date.getDate()+offset); return new Intl.DateTimeFormat(undefined,{weekday:"long",day:"numeric",month:"long"}).format(date); }
function rowLabel(row) { return row.activity === "custom" ? row.custom.trim() || "My activity" : activityMeta[row.activity]?.label || "Activity"; }
function activityType(row) { return row.activity === "custom" ? row.category : activityMeta[row.activity]?.type || "meaningful"; }
function isBreak(row) { return activityType(row) === "break"; }
function optionMarkup(options,current) { return options.map(([value,label]) => `<option value="${value}" ${value===current?"selected":""}>${label}</option>`).join(""); }

function demoUsualRows() {
  return [
    { id:"demo-household",activity:"household",custom:"",category:"necessary",effort:"high",version:"full",timing:"afternoon",recovery:"none" },
    { id:"demo-connection",activity:"connection",custom:"",category:"meaningful",effort:"medium",version:"full",timing:"afternoon",recovery:"none" },
    { id:"demo-relax",activity:"relax",custom:"",category:"break",effort:"light",version:"full",timing:"evening",recovery:"none" }
  ];
}
function demoPacedRows() { const rows=cloneRows(demoUsualRows()); rows[0].timing="morning"; rows[0].version="smaller"; rows[0].recovery="short"; rows[1].timing="midday"; rows[1].recovery="short"; rows[2].timing="afternoon"; return rows; }
const isDemo = new URLSearchParams(location.search).get("demo") === "family";
if (isDemo) state = {...freshState(),activities:demoUsualRows(),meaningfulActivity:"Spend a little time gardening and still have room for family",recoveryChoice:"Pause after lunch before starting the next activity",lowerVersion:"Tend one pot for ten minutes, ask for help with the household task, or sit outside for a short while"};
const incoming = handoff();
if (incoming?.goal) { const summary=document.querySelector("#handoffSummary"); const north=incoming.values?.find(value=>value.id===incoming.northStar)?.title||"what matters"; summary.hidden=false; summary.innerHTML=`<strong>Carried from your compass: ${escapeHtml(north)}</strong><br>${escapeHtml(incoming.goal.statement||incoming.goal.firstStep||"Your meaningful next step")}`; if(!state.meaningfulActivity) state.meaningfulActivity=incoming.goal.firstStep||incoming.goal.statement||""; }

function patternDetails(rows) {
  const active=rows.filter(row=>row.activity&&row.version!=="move"&&!isBreak(row));
  const dedicatedBreaks=rows.filter(row=>row.activity&&isBreak(row)).length;
  const protectedBreaks=active.filter(row=>row.recovery!=="none").length+dedicatedBreaks;
  const counts=Object.fromEntries(timingOptions.map(([timing])=>[timing,active.filter(row=>row.timing===timing).length]));
  const [clusterTiming,clusterCount]=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]||["afternoon",0];
  const adapted=rows.filter(row=>row.activity&&!isBreak(row)&&["smaller","minimum","help","move"].includes(row.version)).length;
  return {active,dedicatedBreaks,protectedBreaks,clusterTiming,clusterCount,adapted,occupied:Object.values(counts).filter(Boolean).length};
}

function demandFor(row) { return activityMeta[row.activity]?.demand || "general"; }
function patternSignals(rows) {
  const details=patternDetails(rows); const active=details.active; const meaningful=active.filter(row=>activityType(row)==="meaningful");
  const demanding=active.filter(row=>row.effort==="high"); const demandingByTime=timingOptions.map(([timing])=>({timing,rows:demanding.filter(row=>row.timing===timing)})).sort((a,b)=>b.rows.length-a.rows.length)[0];
  const demandCounts=active.reduce((counts,row)=>{const demand=demandFor(row);if(demand!=="general"&&demand!=="none")counts[demand]=(counts[demand]||0)+1;return counts;},{}); const repeatedDemand=Object.entries(demandCounts).sort((a,b)=>b[1]-a[1])[0];
  const hasProtectedBreak=details.protectedBreaks>0; const isSpread=active.length>=2&&details.occupied>=Math.min(3,active.length)&&details.clusterCount<3;
  const balanced=active.length>=2&&isSpread&&hasProtectedBreak&&meaningful.length>0&&(!demandingByTime||demandingByTime.rows.length<2);
  return {details,active,meaningful,demandingByTime,repeatedDemand,hasProtectedBreak,isSpread,balanced};
}
function baselineStrengths(rows) {
  const signals=patternSignals(rows); const strengths=[];
  if(signals.isSpread)strengths.push("Activity is already spread across the day.");
  if(signals.hasProtectedBreak)strengths.push(`${signals.details.protectedBreaks} planned ${signals.details.protectedBreaks===1?"break is":"breaks are"} already protected.`);
  if(signals.meaningful.length)strengths.push(`${rowLabel(signals.meaningful[0])} keeps something meaningful in view.`);
  if(!strengths.length&&signals.active.length)strengths.push("You have made the day visible, including what needs to be done.");
  return strengths;
}
function patternObservations(rows) {
  const signals=patternSignals(rows); const observations=[];
  if(signals.demandingByTime?.rows.length>=2)observations.push(`${signals.demandingByTime.rows.length} higher-effort activities sit ${timingLabels[signals.demandingByTime.timing].toLowerCase()}.`);
  else if(signals.details.clusterCount>=2)observations.push(`${signals.details.clusterCount} activities share the ${timingLabels[signals.details.clusterTiming].toLowerCase()} part of the day.`);
  if(!signals.hasProtectedBreak&&signals.active.length>=2)observations.push("There is a long stretch of activity without a planned break.");
  if(signals.repeatedDemand?.[1]>=3)observations.push(`Several activities may draw on similar ${signals.repeatedDemand[0]} effort.`);
  if(!signals.meaningful.length&&signals.active.length)observations.push("Necessary activity currently fills the board without a named meaningful activity.");
  else if(signals.meaningful.length&&signals.details.clusterCount>=3&&signals.meaningful.some(row=>row.timing===signals.details.clusterTiming))observations.push("Meaningful activity shares the busiest part of the day and could be crowded out.");
  if(signals.balanced)observations.push("The day already looks reasonably balanced, with variety, space and a planned break.");
  return observations;
}

const usualHost=document.querySelector("#activityRows");
const pacedHost=document.querySelector("#pacedActivityRows");
function renderBoard(host,rows,phase) {
  const editableUsual=phase==="usual";
  host.innerHTML=timingOptions.map(([timing,title])=>{
    const cards=rows.filter(row=>row.activity&&row.timing===timing).map(row=>{
      const type=activityType(row); const breakCard=isBreak(row); const symbol=type==="necessary"?"◆":type==="break"?"○":"●";
      const usualStatus=[`${effortLabels[row.effort]} effort`,row.version!=="full"?versionLabels[row.version]:"",row.recovery!=="none"?recoveryLabels[row.recovery]:""].filter(Boolean).join(" · ");
      const pacedStatus=[`${effortLabels[row.effort]} effort`,versionLabels[row.version],row.recovery!=="none"?recoveryLabels[row.recovery]:""].filter(Boolean).join(" · ");
      const status=breakCard?"Planned break":editableUsual?usualStatus:pacedStatus;
      const meaningfulGuidance=!editableUsual&&type==="meaningful"?`<p class="tile-guidance"><strong>Protect what matters.</strong> You can still adapt this activity, but first consider whether a necessary or more demanding task could change instead.</p>`:"";
      const shaping=editableUsual?`
        <label class="custom-name" ${row.activity==="custom"?"":"hidden"}>Name it<input data-field="custom" value="${escapeHtml(row.custom)}" placeholder="Name this activity"></label>
        <label class="custom-category" ${row.activity==="custom"?"":"hidden"}>What kind of activity?<select data-field="category">${optionMarkup([["necessary","Necessary"],["meaningful","Meaningful"],["break","Planned break"]],row.category)}</select></label>
        <label ${breakCard?"hidden":""}>How demanding might it feel?<select data-field="effort">${optionMarkup([["light","Light"],["medium","Moderate"],["high","Higher"]],row.effort)}</select></label>`:`
        ${meaningfulGuidance}<label ${breakCard?"hidden":""}>Choose a version<select data-field="version">${optionMarkup([["full","Usual amount"],["smaller","Smaller amount"],["minimum","Minimum version"],["help","Ask for help"],["move","Move to another day"]],row.version)}</select></label>
        <label ${breakCard?"hidden":""}>Break afterwards<select data-field="recovery">${optionMarkup([["none","No break planned yet"],["short","Short planned break"],["long","Longer planned break"]],row.recovery)}</select></label>`;
      return `<article class="day-card-tile is-${type}" data-row="${row.id}"><div class="day-card-tile__face"><span class="tile-symbol" aria-hidden="true">${symbol}</span><div><small>${type==="break"?"planned break":type}</small><strong>${escapeHtml(rowLabel(row))}</strong></div><span class="tile-status">${status}</span></div><details><summary>${editableUsual?"Describe my usual pattern":"Try a pacing change"}</summary><div class="tile-controls">${shaping}<div class="tile-moves"><button type="button" data-move="earlier">Move earlier</button><button type="button" data-move="later">Move later</button>${editableUsual?'<button type="button" data-remove-row>Remove</button>':""}</div></div></details></article>`;
    }).join("");
    return `<section class="day-zone" data-zone="${timing}"><header><span aria-hidden="true">${timing==="morning"?"☼":timing==="midday"?"◒":timing==="afternoon"?"◐":"☾"}</span><h4>${title}</h4></header><div class="day-zone__cards">${cards||'<p class="empty-zone">Room left open</p>'}</div></section>`;
  }).join("");
  host.querySelectorAll("select,input").forEach(control=>control.addEventListener("change",event=>{
    const row=rows.find(item=>item.id===event.target.closest("[data-row]").dataset.row); row[event.target.dataset.field]=event.target.value; const openId=row.id; save(); phase==="usual"?renderUsualBoard():renderPaceWorkshop(); host.querySelector(`[data-row="${openId}"] details`)?.setAttribute("open","");
  }));
  host.querySelectorAll("input").forEach(control=>control.addEventListener("input",event=>{ const row=rows.find(item=>item.id===event.target.closest("[data-row]").dataset.row); row[event.target.dataset.field]=event.target.value; save(); }));
  host.querySelectorAll("[data-move]").forEach(button=>button.addEventListener("click",()=>{ const row=rows.find(item=>item.id===button.closest("[data-row]").dataset.row); const index=timingOptions.findIndex(([value])=>value===row.timing); row.timing=timingOptions[button.dataset.move==="earlier"?Math.max(0,index-1):Math.min(timingOptions.length-1,index+1)][0]; save(); phase==="usual"?renderUsualBoard():renderPaceWorkshop(); }));
  host.querySelectorAll("[data-remove-row]").forEach(button=>button.addEventListener("click",()=>{ const id=button.closest("[data-row]").dataset.row; state.activities=state.activities.filter(row=>row.id!==id); save(); renderUsualBoard(); }));
}

function renderUsualPatternSummary() {
  const host=document.querySelector("#patternSummary"); const guide=document.querySelector("#capacityGuide"); const capacity=capacityCopy[state.capacity]||capacityCopy.usual; const signals=patternSignals(state.activities); const details=signals.details; const observations=patternObservations(state.activities);
  guide.innerHTML=`<strong>${capacity.title}</strong><span>${capacity.detail}</span><small>Energy is a personal guide, not something you need to calculate.</small>`;
  if(!details.active.length&&!details.dedicatedBreaks){host.className="pattern-summary is-empty";host.innerHTML="<strong>Build the day one choice at a time.</strong><span>Add something necessary, something meaningful and a planned break.</span>";return;}
  const headline=signals.balanced?"This day already looks reasonably balanced.":observations[0]||"The board gives you a useful view of the day.";
  const supporting=signals.balanced?"You may only need one small adjustment—or none at all.":observations[1]||"This is a pattern to notice, not something you have done wrong.";
  host.className=`pattern-summary ${signals.balanced||signals.isSpread?"is-steady":"is-clustered"}`; host.innerHTML=`<strong>${headline}</strong><span>${supporting}</span><small>${details.dedicatedBreaks?`${details.dedicatedBreaks} planned ${details.dedicatedBreaks===1?"break":"breaks"} already included.`:"No dedicated break has been placed yet."}</small>`;
}
function renderUsualBoard(){renderBoard(usualHost,state.activities,"usual");renderUsualPatternSummary();}
const duplicateNotice=document.querySelector("#duplicateNotice"); let pendingDuplicate="";
function hideDuplicateNotice(){pendingDuplicate="";duplicateNotice.hidden=true;}
function addActivity(activity){const type=activityMeta[activity]?.type||"meaningful";state.activities.push({id:makeId(),activity,custom:"",category:type,effort:"medium",version:"full",timing:"afternoon",recovery:"none"});save();renderUsualBoard();hideDuplicateNotice();const card=usualHost.querySelector(`[data-row="${state.activities.at(-1).id}"]`);if(activity==="custom")card?.querySelector("details")?.setAttribute("open","");card?.scrollIntoView({behavior:"smooth",block:"center"});}
document.querySelectorAll("[data-add-activity]").forEach(button=>button.addEventListener("click",()=>{const activity=button.dataset.addActivity;if(activity!=="custom"&&state.activities.some(row=>row.activity===activity)){pendingDuplicate=activity;document.querySelector("#duplicateMessage").textContent=`${activityMeta[activity].label} is already on the day. Add it again if this is intentional.`;document.querySelector("#confirmDuplicate").textContent=`Add another ${activityMeta[activity].label}`;duplicateNotice.hidden=false;duplicateNotice.scrollIntoView({behavior:"smooth",block:"nearest"});return;}addActivity(activity);}));
document.querySelector("#confirmDuplicate").addEventListener("click",()=>{if(pendingDuplicate)addActivity(pendingDuplicate);});document.querySelector("#dismissDuplicate").addEventListener("click",hideDuplicateNotice);

function missionState(){
  const usual=state.usualActivities; const paced=state.activities; const usualDetails=patternDetails(usual);
  const timingChanged=paced.some(row=>!isBreak(row)&&usual.find(item=>item.id===row.id)?.timing!==row.timing);
  const spreadPresent=patternSignals(usual).isSpread;
  const breakPresent=patternSignals(usual).hasProtectedBreak;
  const spreadDone=timingChanged;
  const adaptDone=paced.some(row=>!isBreak(row)&&row.version!==usual.find(item=>item.id===row.id)?.version);
  const breakDone=paced.some(row=>!isBreak(row)&&row.recovery!==usual.find(item=>item.id===row.id)?.recovery);
  const changes=[spreadDone,adaptDone,breakDone].filter(Boolean).length; const strengths=[spreadPresent,breakPresent].filter(Boolean).length;
  return {spreadDone,adaptDone,breakDone,spreadPresent,breakPresent,changes,strengths,usualDetails};
}
function renderPaceWorkshop(){
  renderBoard(pacedHost,state.activities,"paced"); const missions=missionState();
  const states={spread:{changed:missions.spreadDone,present:missions.spreadPresent},adapt:{changed:missions.adaptDone,present:false},break:{changed:missions.breakDone,present:missions.breakPresent}};
  document.querySelectorAll("[data-mission]").forEach(item=>{const status=states[item.dataset.mission];item.classList.toggle("is-complete",status.changed);item.classList.toggle("is-strength",!status.changed&&status.present);item.querySelector("b").textContent=status.changed?"Change made":status.present?"Already helping":"Optional to try";});
  const achievement=document.querySelector("#paceAchievement"); achievement.className=`pace-achievement ${missions.changes>=1?"is-complete":""}`;
  if(missions.changes>=1)achievement.innerHTML=`<strong>${missions.changes===1?"One appropriate change may be enough.":`${missions.changes} useful changes made.`}</strong><span>Your comparison is ready. You can reveal it now or keep exploring.</span>`;
  else if(missions.strengths)achievement.innerHTML=`<strong>${missions.strengths} pacing ${missions.strengths===1?"strength was":"strengths were"} already present.</strong><span>Try one further change, while protecting what matters most.</span>`;
  else achievement.innerHTML=`<strong>Try one change that fits this day.</strong><span>Spread something, adapt a task or protect a break.</span>`;
  document.querySelector("#revealComparison").disabled=missions.changes<1;
}
function beginPacing(){state.usualActivities=cloneRows(state.activities);state.activities=cloneRows(state.activities);save();renderPaceWorkshop();}

function changeTags(row){const usual=state.usualActivities.find(item=>item.id===row.id);if(!usual)return[];const tags=[];if(row.timing!==usual.timing)tags.push("Moved");if(row.version!==usual.version)tags.push(versionLabels[row.version]);if(row.recovery!==usual.recovery)tags.push(row.recovery==="none"?"Break removed":"Break protected");return tags;}
function comparisonRow(row,paced){const breakCard=isBreak(row);const tags=paced?changeTags(row):[];const amount=breakCard?"—":`${effortLabels[row.effort]} effort · ${versionLabels[row.version]}`;const when=row.version==="move"&&paced?"Another day":timingLabels[row.timing];const breakText=breakCard?"Planned break":recoveryLabels[row.recovery];return `<tr class="${tags.length?"is-changed":""}"><th scope="row"><strong>${escapeHtml(rowLabel(row))}</strong><small>${breakCard?"Planned break":activityType(row)}</small>${tags.length?`<span class="change-tags" aria-label="Changes made">${tags.map(tag=>`<i>${tag}</i>`).join("")}</span>`:""}</th><td data-label="When">${when}</td><td data-label="Effort and version">${amount}</td><td data-label="Break">${breakText}</td></tr>`;}
function pairedComparisonRow(usual,paced){const row=paced||usual;const breakCard=isBreak(row);const tags=paced?changeTags(paced):[];const side=(item,isPaced)=>`<div class="paired-comparison__side"><strong>${isPaced?"Paced version":"As first planned"}</strong><dl><div><dt>When</dt><dd>${item.version==="move"&&isPaced?"Another day":timingLabels[item.timing]}</dd></div>${breakCard?"":`<div><dt>Effort and version</dt><dd>${effortLabels[item.effort]} effort · ${versionLabels[item.version]}</dd></div>`}<div><dt>Break</dt><dd>${breakCard?"Planned break":recoveryLabels[item.recovery]}</dd></div></dl></div>`;return `<article class="paired-comparison__activity ${tags.length?"is-changed":""}"><header><div><small>${breakCard?"Planned break":activityType(row)}</small><h3>${escapeHtml(rowLabel(row))}</h3></div>${tags.length?`<span class="change-tags" aria-label="Changes made">${tags.map(tag=>`<i>${tag}</i>`).join("")}</span>`:`<span class="unchanged-label">No change</span>`}</header><div class="paired-comparison__sides">${side(usual,false)}${side(paced,true)}</div></article>`;}
function listMarkup(items){return `<ul>${items.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ul>`;}
function comparisonInsights(usual,paced){
  const before=patternSignals(usual); const after=patternSignals(paced); const already=baselineStrengths(usual); const observations=patternObservations(usual); const changed=[]; const next=[];
  const moved=paced.filter(row=>!isBreak(row)&&changeTags(row).includes("Moved")); const movedBreaks=paced.filter(row=>isBreak(row)&&changeTags(row).includes("Moved")); const adapted=paced.filter(row=>!isBreak(row)&&row.version!==usual.find(item=>item.id===row.id)?.version); const changedBreaks=paced.filter(row=>!isBreak(row)&&row.recovery!==usual.find(item=>item.id===row.id)?.recovery); const protectedRows=changedBreaks.filter(row=>row.recovery!=="none"); const removedBreaks=changedBreaks.filter(row=>row.recovery==="none");
  if(moved.length)changed.push(`${moved.length} ${moved.length===1?"activity was":"activities were"} moved to another part of the day.`);
  if(movedBreaks.length)changed.push(`${movedBreaks.length} planned ${movedBreaks.length===1?"break was":"breaks were"} repositioned.`);
  if(adapted.length)changed.push(`${adapted.length} ${adapted.length===1?"activity now has":"activities now have"} a smaller, shared or moved version.`);
  if(protectedRows.length)changed.push(`${protectedRows.length} new planned ${protectedRows.length===1?"break was":"breaks were"} protected.`);
  if(removedBreaks.length)changed.push(`${removedBreaks.length} planned ${removedBreaks.length===1?"break was":"breaks were"} removed from an activity.`);
  const meaningfulAdapted=adapted.some(row=>activityType(row)==="meaningful"); const adaptableNecessary=paced.some(row=>activityType(row)==="necessary"&&row.version==="full"&&(row.effort==="high"||before.details.clusterCount>=2));
  if(after.demandingByTime?.rows.length>=2)next.push(`Consider separating the ${after.demandingByTime.rows.length} higher-effort activities that still sit ${timingLabels[after.demandingByTime.timing].toLowerCase()}.`);
  if(!after.hasProtectedBreak&&after.active.length>=2)next.push("Consider protecting one break before a long stretch of activity.");
  if(after.repeatedDemand?.[1]>=3)next.push(`Several activities still draw on similar ${after.repeatedDemand[0]} effort; alternating the type of demand may feel steadier.`);
  if(!after.meaningful.length&&after.active.length)next.push("Consider making room for one enjoyable or meaningful activity, even in a small form.");
  if(meaningfulAdapted&&adaptableNecessary)next.push("Check whether a necessary or higher-effort task could become more manageable before reducing what matters most.");
  if(!next.length&&after.balanced)next.push("This day already looks reasonably balanced. You may not need another change.");
  if(!next.length)next.push("Try this version gently and notice whether one further adjustment would help; there is no need to use every pacing move.");
  return {already,observations,changed:changed.length?changed:["You kept the day as first planned."],next};
}
function renderComparison(){
  const usual=state.usualActivities.length?state.usualActivities:cloneRows(state.activities);const paced=state.activities;const insights=comparisonInsights(usual,paced);
  document.querySelector("#usualPlanRows").innerHTML=usual.map(row=>comparisonRow(row,false)).join("");document.querySelector("#pacedPlanRows").innerHTML=paced.map(row=>comparisonRow(row,true)).join("");
  document.querySelector("#pairedComparison").innerHTML=usual.map(row=>pairedComparisonRow(row,paced.find(item=>item.id===row.id)||row)).join("");
  document.querySelector("#usualPlanHeading").textContent="The day as first planned";
  document.querySelector("#usualPlanResult").innerHTML=`<strong>What was already helping</strong>${listMarkup(insights.already)}${insights.observations.length?`<p><b>The board also noticed:</b> ${insights.observations.join(" ")}</p>`:""}`;
  document.querySelector("#pacedPlanResult").innerHTML=`<strong>What you changed</strong>${listMarkup(insights.changed)}<p>One appropriate change may be enough.</p>`;
  document.querySelector("#comparisonCalloutTitle").textContent="What you could try next";
  document.querySelector("#comparisonText").innerHTML=insights.next.map(item=>`<span>${item}</span>`).join("");
}

function currentFocus(){const meaningfulRow=state.activities.find(row=>activityType(row)==="meaningful");const firstRow=state.activities.find(row=>!isBreak(row));return state.meaningfulActivity.trim()||(meaningfulRow?rowLabel(meaningfulRow):firstRow?rowLabel(firstRow):"what matters today");}
function renderPlanContext(){const usual=state.usualActivities.length?state.usualActivities:cloneRows(state.activities);const insights=comparisonInsights(usual,state.activities);const breakCount=patternDetails(state.activities).protectedBreaks;const breakCopy=state.recoveryChoice.trim()||`${breakCount} planned ${breakCount===1?"break":"breaks"} in the day`;document.querySelector("#planContext").innerHTML=`<article><small>What matters ${dayName()}</small><strong>${escapeHtml(currentFocus())}</strong></article><article><small>Small pacing choices</small><strong>${escapeHtml(insights.changed.join(" "))}</strong></article><article><small>Planned breaks</small><strong>${escapeHtml(breakCopy)}</strong></article><article class="is-reminder"><small>A gentle reminder</small><strong>The plan can change. Adjusting it is not a failure.</strong></article>`;}
function renderPlan(){renderPlanContext();document.querySelector("#planList").innerHTML=state.activities.filter(row=>row.activity).map(row=>isBreak(row)?`<article class="plan-row is-break"><div><strong>${escapeHtml(rowLabel(row))}</strong><small>${timingLabels[row.timing]} · planned break</small></div><span>Protected</span></article>`:`<article class="plan-row"><div><strong>${escapeHtml(rowLabel(row))}</strong><small>${row.version==="move"?"Another day":timingLabels[row.timing]} · ${effortLabels[row.effort].toLowerCase()} effort · ${recoveryLabels[row.recovery].toLowerCase()}</small></div><select data-version="${row.id}" aria-label="Version ${dayName()} for ${escapeHtml(rowLabel(row))}">${optionMarkup([["full","Usual amount"],["smaller","Smaller amount"],["minimum","Minimum version"],["help","Ask for help"],["move","Move to another day"]],row.version)}</select></article>`).join("");document.querySelectorAll("[data-version]").forEach(select=>select.addEventListener("change",event=>{const row=state.activities.find(item=>item.id===event.target.dataset.version);if(row){row.version=event.target.value;save();renderPlanContext();}}));}
function buildSummary(){const focus=currentFocus();const usual=state.usualActivities.length?state.usualActivities:cloneRows(state.activities);const insights=comparisonInsights(usual,state.activities);const breakCount=patternDetails(state.activities).protectedBreaks;const plannedBreak=state.recoveryChoice.trim()||`${breakCount} planned ${breakCount===1?"break":"breaks"} in the day`;return{planDate:state.planDate,day:dayName(),capacity:capacityCopy[state.capacity].title,focus,activities:state.activities.filter(row=>row.activity).map(row=>({name:rowLabel(row),type:activityType(row),when:row.version==="move"?"Another day":timingLabels[row.timing],version:isBreak(row)?"Planned break":versionLabels[row.version],break:isBreak(row)?"Protected":recoveryLabels[row.recovery]})),insights:{alreadyHelping:insights.already,changed:insights.changed,tryNext:insights.next},plannedBreak,difficultDay:state.lowerVersion.trim(),reminder:"Plans can change. Adjusting the day is not a failure."};}
function renderFinishedSummary(summary){const activities=summary.activities.map(item=>`<li><strong>${escapeHtml(item.name)}</strong><span>${item.when} · ${item.version}${item.type==="break"?"":` · ${item.break}`}</span></li>`).join("");const difficult=summary.difficultDay||"Choose a smaller version, ask for help or move one activity while keeping one gentle, meaningful step.";const planned=summary.plannedBreak||"Use the protected breaks already placed in the day.";const choices=summary.insights?.changed?.join(" ")||"You made a plan that can respond to the day.";document.querySelector("#finishSummary").textContent=`Your focus—${summary.focus}—stays in view, with room for the plan to change.`;document.querySelector("#summaryPlan").innerHTML=`<div class="summary-plan__header"><span>Day guide · ${escapeHtml(summary.capacity)}</span><strong>What matters: ${escapeHtml(summary.focus)}</strong></div><div class="summary-plan__insights"><article><small>Small pacing choices</small><p>${escapeHtml(choices)}</p></article><article><small>Planned breaks</small><p>${escapeHtml(planned)}</p></article><article><small>A gentle reminder</small><p>Plans can change. Adjusting the day is not a failure.</p></article></div><ul>${activities}</ul><div class="summary-plan__alternatives"><div><small>My planned break</small><p>${escapeHtml(planned)}</p></div><div><small>For a more difficult day</small><p>${escapeHtml(difficult)}</p></div></div>`;}

function renderDayCopy(){const day=dayName();document.querySelectorAll('[name="planningDay"]').forEach(input=>input.checked=input.value===(isTomorrowPlan()?"tomorrow":"today"));document.querySelector("#todayDateLabel").textContent=`${formattedDate(0)} · plan around how things feel now`;document.querySelector("#tomorrowDateLabel").textContent=`${formattedDate(1)} · prepare gently the evening before`;document.querySelector("#chooseActivitiesButton").textContent=`Choose what matters ${day}`;document.querySelector("#activitiesHeading").textContent=`What needs and deserves space ${day}?`;document.querySelector("#activitiesIntro").textContent=`Start with what is necessary and what is meaningful. Add a planned break before ${day} fills up.`;document.querySelector("#meaningfulActivityLabel").textContent=`One activity that would make ${day} feel worthwhile`;document.querySelector("#activityPlannerHeading").textContent=`Place what matters into ${day}`;document.querySelector("#planHeading").textContent=`Choose a manageable version for ${day}.`;document.querySelector("#savePlanButton").textContent=`Save ${dayPossessive()} plan`;document.querySelector("#finishEyebrow").textContent=`A flexible plan for ${day}`;renderUsualPatternSummary();}

document.querySelectorAll('[name="planningDay"]').forEach(input=>input.addEventListener("change",()=>{state.planDate=dateKey(input.value==="tomorrow"?1:0);save();renderDayCopy();}));document.querySelectorAll('[name="capacity"]').forEach(input=>input.addEventListener("change",()=>{state.capacity=input.value;save();renderUsualPatternSummary();}));
function syncCapacityControls(){document.querySelectorAll('[name="capacity"]').forEach(input=>input.checked=input.value===state.capacity);}
document.querySelector("#meaningfulActivity").value=state.meaningfulActivity;document.querySelector("#recoveryChoice").value=state.recoveryChoice;document.querySelector("#lowerVersion").value=state.lowerVersion;
document.querySelector("#meaningfulActivity").addEventListener("input",event=>{state.meaningfulActivity=event.target.value;save();});document.querySelector("#recoveryChoice").addEventListener("input",event=>{state.recoveryChoice=event.target.value;save();if(!document.querySelector('[data-step="plan"]').hidden)renderPlanContext();});document.querySelector("#lowerVersion").addEventListener("input",event=>{state.lowerVersion=event.target.value;save();});

const steps=["capacity","activities","pace","compare","plan"];
function showStep(id){document.body.classList.toggle("pace-is-beyond-intro",id!=="capacity");document.querySelectorAll(".pace-step").forEach(section=>{const active=section.dataset.step===id;section.hidden=!active;section.classList.toggle("is-active",active);});document.querySelectorAll(".pace-progress span").forEach((item,index)=>{const current=steps.indexOf(id);item.classList.toggle("is-current",index===current);item.classList.toggle("is-complete",index<current);if(index===current)item.setAttribute("aria-current","step");else item.removeAttribute("aria-current");});if(id==="pace")renderPaceWorkshop();if(id==="compare")renderComparison();if(id==="plan")renderPlan();const heading=document.querySelector(`[data-step="${id}"] h2`);if(heading){heading.setAttribute("tabindex","-1");heading.focus({preventScroll:true});}window.scrollTo({top:0,behavior:"smooth"});}
document.querySelectorAll("[data-next]").forEach(button=>button.addEventListener("click",()=>{if(button.dataset.next==="pace"){if(!state.activities.some(row=>row.activity&&!isBreak(row)))return alert("Choose at least one necessary or meaningful activity first.");beginPacing();}if(button.dataset.next==="compare"&&missionState().changes<1)return;showStep(button.dataset.next);}));
document.querySelectorAll("[data-back]").forEach(button=>button.addEventListener("click",()=>{if(button.dataset.back==="activities"&&state.usualActivities.length){state.activities=cloneRows(state.usualActivities);state.usualActivities=[];save();renderUsualBoard();}showStep(button.dataset.back);}));
document.querySelector("#paceForm").addEventListener("submit",event=>{event.preventDefault();document.querySelectorAll("[data-version]").forEach(select=>{const row=state.activities.find(item=>item.id===select.dataset.version);if(row)row.version=select.value;});save();const summary=buildSummary();try{localStorage.setItem(SUMMARY_KEY,JSON.stringify(summary));}catch{}document.querySelectorAll(".pace-step").forEach(section=>section.hidden=true);document.querySelector(".pace-progress").hidden=true;renderFinishedSummary(summary);const panel=document.querySelector("#finishPanel");panel.hidden=false;panel.focus();window.scrollTo({top:0,behavior:"smooth"});});
document.querySelector("#editPlan").addEventListener("click",()=>{document.querySelector("#finishPanel").hidden=true;document.querySelector(".pace-progress").hidden=false;showStep("plan");});
document.querySelector("#startPacingAgain").addEventListener("click",()=>{if(!window.confirm("Clear this pacing draft and start again?"))return;try{localStorage.removeItem(STORAGE_KEY);}catch{}state=freshState();document.querySelector("#finishPanel").hidden=true;document.querySelector(".pace-progress").hidden=false;document.querySelector("#meaningfulActivity").value="";document.querySelector("#recoveryChoice").value="";document.querySelector("#lowerVersion").value="";syncCapacityControls();renderUsualBoard();renderDayCopy();history.replaceState(null,"",location.pathname);showStep("capacity");});

syncCapacityControls();renderUsualBoard();renderDayCopy();
const requestedStep=location.hash.slice(1);
if(isDemo&&requestedStep==="compare"){state.usualActivities=demoUsualRows();state.activities=demoPacedRows();}
if(steps.includes(requestedStep))showStep(requestedStep);
