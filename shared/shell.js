const demoSteps = [
  ["Open the Pain Jigsaw", "Begin with the learning hub.", "pain-jigsaw/index.html?journey=guided"],
  ["Explore Activity Management", "Show information before asking for behaviour change.", "pain-jigsaw/activity.html?journey=guided"],
  ["Return to the Jigsaw", "The clinical Jigsaw remains the familiar home.", "pain-jigsaw/index.html?journey=guided"],
  ["Open Create My Jigsaw", "Move from available support to what feels personally relevant.", "pain-jigsaw/builder.html?journey=guided"],
  ["Add clinical and personal pieces", "Use Activity Management, Reconnecting to Life and Gardening as the story.", "pain-jigsaw/builder.html?journey=guided"],
  ["Choose focus areas", "The personal picture narrows attention without losing other pieces.", "pain-jigsaw/builder.html?journey=guided"],
  ["Create the connected picture", "Save or print remains available in the original Builder.", "pain-jigsaw/builder.html?journey=guided"],
  ["Explore what matters", "Launch a prepared example at the goal bridge rather than sorting all 45 cards.", "values/index.html?demo=family#/goal-area"],
  ["Shape a meaningful goal", "Connect Family to Reconnecting to Life.", "values/index.html?demo=family#/goal-plan"],
  ["Carry the goal into pacing", "Use the first meaningful activity as the pacing starting point.", "pacing/index.html?demo=family"],
  ["Compare overload and balance", "Show how the same intention can be organised differently.", "pacing/index.html?demo=family#compare"],
  ["Return to the personal picture", "End with one connected service story and several standalone entry points.", "pain-jigsaw/builder.html?journey=return"]
];

const drawer = document.querySelector("#demoDrawer");
const scrim = document.querySelector("#drawerScrim");
const openButton = document.querySelector("#demoButton");
const closeButton = document.querySelector("#closeDemo");
const privacyDialog = document.querySelector("#privacyDialog");
document.querySelector("#demoSteps").innerHTML = demoSteps.map(([title, note, href]) => `<li><div><a href="${href}">${title} →</a><small>${note}</small></div></li>`).join("");

function setDrawer(open) {
  drawer.hidden = !open;
  scrim.hidden = !open;
  document.body.style.overflow = open ? "hidden" : "";
  if (open) closeButton.focus(); else openButton.focus();
}

openButton.addEventListener("click", () => setDrawer(true));
closeButton.addEventListener("click", () => setDrawer(false));
scrim.addEventListener("click", () => setDrawer(false));
document.addEventListener("keydown", event => { if (event.key === "Escape" && !drawer.hidden) setDrawer(false); });
document.querySelector("#privacyButton").addEventListener("click", () => privacyDialog.showModal());
document.querySelector("#clearButton").addEventListener("click", () => {
  if (!confirm("Clear progress saved by all three demo elements in this browser?")) return;
  Object.keys(localStorage).filter(key => key.startsWith("life-compass") || key.startsWith("pain-jigsaw") || key.startsWith("living-well-pacing")).forEach(key => localStorage.removeItem(key));
  sessionStorage.removeItem("life-compass-handoff-values-45-v1");
  alert("Demo progress has been cleared.");
});
