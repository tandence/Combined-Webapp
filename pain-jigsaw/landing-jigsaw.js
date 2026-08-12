(() => {
  'use strict';

  const pieces = {
    toolbox: { title: 'Self Management Toolbox', description: 'Explore practical tools that can support day-to-day self-management.', href: 'toolbox.html' },
    acceptance: { title: 'Acceptance', description: 'Explore what acceptance can mean when living with persistent pain.', href: 'acceptance.html' },
    understand: { title: 'Understand Your Condition', description: 'Learn more about persistent pain and the factors that can influence it.', href: 'understand.html' },
    reconnect: { title: 'Get Involved & Re-connect to Life', description: 'Explore ways to reconnect with activities, roles and relationships that matter.', href: 'reconnect.html' },
    activity: { title: 'Activity Management', description: 'Find a steadier balance between activity, rest and recovery.', href: 'activity.html' },
    movement: { title: 'Movement', description: 'Explore safe, gradual ways to build confidence in movement.', href: 'movement.html' },
    nutrition: { title: 'Nutrition & Lifestyle Choices', description: 'Consider everyday choices that may support health and wellbeing.', href: 'nutrition.html' },
    thoughts: { title: 'Managing Thoughts & Emotions', description: 'Explore approaches for responding to difficult thoughts and emotions.', href: 'thoughts.html' },
    sleep: { title: 'Sleep', description: 'Find information and practical approaches that may support sleep.', href: 'sleep.html' },
    relaxation: { title: 'Relaxation & Mindfulness', description: 'Use calming and present-focused practices to support your nervous system.', href: 'relaxation.html' },
    goals: { title: 'Setting Goals Important to You', description: 'Choose meaningful and manageable steps towards what matters to you.', href: 'setting-goals.html' },
    medication: { title: 'Medication', description: 'Explore information about using medication safely as part of a wider plan.', href: 'medication.html' },
    communication: { title: 'Communication', description: 'Explore ways to communicate your needs and stay connected with others.', href: 'communication.html' },
    flare: { title: 'Flare-ups', description: 'Plan for difficult periods and identify what may help you respond.', href: 'flare-ups.html' }
  };

  const title = document.getElementById('piecePreviewTitle');
  const description = document.getElementById('piecePreviewDescription');
  const link = document.getElementById('piecePreviewLink');
  const anchors = Array.from(document.querySelectorAll('#landingPieces .landing-piece'));

  link.addEventListener('click', event => {
    if (link.getAttribute('aria-disabled') === 'true') event.preventDefault();
  });

  function selectPiece(anchor) {
    const piece = pieces[anchor.dataset.id];
    if (!piece) return;

    anchors.forEach(item => item.classList.toggle('is-selected', item === anchor));
    title.textContent = piece.title;
    description.textContent = piece.description;
    link.href = piece.href;
    link.classList.remove('is-disabled');
    link.removeAttribute('aria-disabled');
    link.removeAttribute('tabindex');
  }

  anchors.forEach(anchor => {
    anchor.addEventListener('mouseenter', () => selectPiece(anchor));
    anchor.addEventListener('focus', () => selectPiece(anchor));
    anchor.addEventListener('touchstart', event => {
      if (!anchor.classList.contains('is-selected')) {
        event.preventDefault();
        selectPiece(anchor);
      }
    }, { passive: false });
  });
})();
