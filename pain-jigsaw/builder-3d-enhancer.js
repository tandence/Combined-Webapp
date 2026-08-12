(() => {
  'use strict';

  const svg = document.getElementById('builderSvg');
  if (!svg) return;

  const NS = 'http://www.w3.org/2000/svg';
  let scheduled = false;

  function ensureDefinitions() {
    if (svg.querySelector('#prototype-piece-sheen')) return;

    const defs = document.createElementNS(NS, 'defs');
    defs.setAttribute('data-prototype-defs', '');

    const gradient = document.createElementNS(NS, 'linearGradient');
    gradient.id = 'prototype-piece-sheen';
    gradient.setAttribute('x1', '0');
    gradient.setAttribute('y1', '0');
    gradient.setAttribute('x2', '1');
    gradient.setAttribute('y2', '1');

    const stops = [
      ['0%', '#ffffff', '.58'],
      ['24%', '#ffffff', '.18'],
      ['58%', '#ffffff', '0'],
      ['100%', '#0b2b36', '.22']
    ];

    for (const [offset, color, opacity] of stops) {
      const stop = document.createElementNS(NS, 'stop');
      stop.setAttribute('offset', offset);
      stop.setAttribute('stop-color', color);
      stop.setAttribute('stop-opacity', opacity);
      gradient.appendChild(stop);
    }

    defs.appendChild(gradient);
    svg.prepend(defs);
  }

  function cloneLayer(face, className) {
    const layer = face.cloneNode(false);
    layer.removeAttribute('style');
    layer.classList.remove('piece-shape');
    layer.classList.add(className);
    layer.removeAttribute('tabindex');
    layer.setAttribute('aria-hidden', 'true');
    return layer;
  }

  function enhancePieces() {
    scheduled = false;
    ensureDefinitions();

    for (const group of svg.querySelectorAll('.builder-piece:not([data-three-d])')) {
      group.setAttribute('data-three-d', 'true');
      const face = group.querySelector('.piece-shape');
      if (!face) continue;

      const shadow = cloneLayer(face, 'piece-shadow-3d');
      const depth = cloneLayer(face, 'piece-depth-3d');
      const sheen = cloneLayer(face, 'piece-sheen-3d');
      const highlight = cloneLayer(face, 'piece-highlight-3d');

      group.insertBefore(shadow, face);
      group.insertBefore(depth, face);
      face.insertAdjacentElement('afterend', sheen);
      sheen.insertAdjacentElement('afterend', highlight);
    }
  }

  function scheduleEnhancement() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(enhancePieces);
  }

  new MutationObserver(scheduleEnhancement).observe(svg, { childList: true, subtree: true });
  scheduleEnhancement();
})();
