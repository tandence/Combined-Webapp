(function () {
  const path = location.pathname.replace(/\\/g, "/");
  const inValues = path.includes("/values/");
  const inPacing = path.includes("/pacing/");
  const inPain = path.includes("/pain-jigsaw/");
  if (!inValues && !inPacing && !inPain) return;
  const root = inValues || inPacing || inPain ? "../" : "./";
  if (!document.querySelector('link[href*="journey-bridge.css"]')) {
    const sharedStyles = document.createElement("link");
    sharedStyles.rel = "stylesheet";
    sharedStyles.href = `${root}shared/journey-bridge.css`;
    document.head.append(sharedStyles);
  }
  const current = inPain ? (path.endsWith("builder.html") ? "personalise" : "learn") : inValues ? "choose" : "try";
  const labels = [["learn", "Learn", `${root}pain-jigsaw/index.html`], ["personalise", "Build", `${root}pain-jigsaw/builder.html`], ["choose", "Choose", `${root}values/index.html#/welcome`], ["try", "Try", `${root}pacing/index.html`]];
  const bar = document.createElement("nav");
  bar.className = "vision-bridge";
  bar.setAttribute("aria-label", "Pain Jigsaw journey");
  bar.innerHTML = `<a class="vision-bridge__brand" href="${root}index.html"><img src="${root}pain-jigsaw/assets/app-icons/app-icon-192.png" alt=""><span><strong>Pain Jigsaw</strong><small>Understand your pain. Discover what matters. Find your way forward.</small></span></a><div class="vision-bridge__steps">${labels.map(([id,label,href]) => `<a href="${href}" ${id === current ? 'aria-current="step"' : ""}>${label}</a>`).join("<span aria-hidden=\"true\">→</span>")}</div><a class="vision-bridge__home" href="${root}index.html">Demo home</a>`;
  document.body.prepend(bar);

  const params = new URLSearchParams(location.search);
  if (inPain) {
    const returnRoutes = {
      pacing: [`${root}pacing/index.html?resume=capacity`, "\u2190 Return to Plan My Day"],
      builder: ["builder.html", "\u2190 Return to Create My Jigsaw"],
      values: [`${root}values/index.html#/my-compass`, "\u2190 Return to my values and goal"]
    };
    const route = returnRoutes[params.get("return")];
    const backLink = document.querySelector(".back-link");
    if (route && backLink) {
      backLink.href = route[0];
      backLink.textContent = route[1];
    }
  }
  if (inPacing && params.get("return") === "values") {
    const returnLink = document.createElement("a");
    returnLink.className = "vision-context-return";
    returnLink.href = `${root}values/index.html#/my-compass`;
    returnLink.textContent = "\u2190 Return to my values and goal";
    bar.insertAdjacentElement("afterend", returnLink);
  }
  if (!inPacing && (params.has("journey") || params.has("demo"))) {
    const flag = document.createElement("div");
    flag.className = "vision-demo-flag";
    flag.textContent = "Prepared demonstration";
    document.body.append(flag);
  }

  if (path.endsWith("builder.html")) {
    const panel = document.createElement("section");
    panel.className = "vision-next vision-next--optional";
    panel.innerHTML = `<div><p class="vision-next__eyebrow">Optional next step</p><h2>Would you like to explore what sits behind your choices?</h2><p>Discover the values that may connect these pieces and help guide your next step.</p></div><a href="${root}values/index.html${params.has("journey") ? "?demo=family#/goal-area" : "#/welcome"}">Explore what matters to me &rarr;</a>`;
    const nextSteps = document.querySelector("#nextStepsPanel");
    const target = nextSteps || document.querySelector("main");
    target.insertAdjacentElement("afterend", panel);

    const syncValuesPrompt = () => {
      panel.hidden = !nextSteps || nextSteps.hidden;
    };

    syncValuesPrompt();
    if (nextSteps) {
      new MutationObserver(syncValuesPrompt).observe(nextSteps, {
        attributes: true,
        attributeFilter: ["hidden"]
      });
    }
  }

  const file = path.split("/").pop();
  const topicPages = new Set([
    "acceptance.html", "activity.html", "communication.html", "flare-ups.html",
    "medication.html", "movement.html", "nutrition.html", "reconnect.html",
    "relaxation.html", "setting-goals.html", "sleep.html", "thoughts.html",
    "toolbox.html", "understand.html"
  ]);
  if (inPain && topicPages.has(file)) {
    const backLink = document.querySelector(".back-link");
    const href = backLink?.getAttribute("href") || "index.html";
    const label = (backLink?.textContent || "Return to Pain Jigsaw").replace(/^\s*[^A-Za-z]+\s*/, "").trim();
    const panel = document.createElement("section");
    panel.className = "vision-next vision-return";
    panel.innerHTML = `<h2>Finished here for now?</h2><p>You can return whenever you are ready.</p><a href="${href}">&larr; ${label}</a>`;
    const main = document.querySelector("main");
    const layout = main?.closest(".layout");
    if (layout) layout.insertAdjacentElement("afterend", panel);
    else main?.append(panel);
  }
}());
