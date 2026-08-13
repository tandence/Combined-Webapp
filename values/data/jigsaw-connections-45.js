/* Pain Management Jigsaw connections for the active 45-value deck. */
(function () {
  const pieces = [
  {
    "id": "understand-your-condition",
    "title": "Understand your condition",
    "connection": "Build knowledge and understanding of persistent pain and the choices available to you.",
    "values": [
      "curiosity",
      "wisdom"
    ]
  },
  {
    "id": "reconnect-to-life",
    "title": "Get involved and reconnect to life",
    "connection": "Notice what helps you participate, connect and make room for a meaningful life.",
    "values": [
      "belonging",
      "family",
      "friendship",
      "generosity",
      "joy",
      "love",
      "service"
    ]
  },
  {
    "id": "activity-management",
    "title": "Activity management",
    "connection": "Explore a steadier balance of activity, rest and the things that matter to you.",
    "values": [
      "balance",
      "focus",
      "freedom",
      "simplicity"
    ]
  },
  {
    "id": "movement",
    "title": "Movement",
    "connection": "Explore movement in ways that are flexible, meaningful and appropriate for you.",
    "values": [
      "adventure",
      "growth"
    ]
  },
  {
    "id": "nutrition-and-lifestyle",
    "title": "Nutrition and lifestyle",
    "connection": "Consider everyday nourishment, hydration and lifestyle choices that support you.",
    "values": [
      "health"
    ]
  },
  {
    "id": "managing-thoughts-and-emotions",
    "title": "Managing thoughts and emotions",
    "connection": "Make space for difficult thoughts and feelings with care, perspective and support.",
    "values": [
      "authenticity",
      "compassion",
      "courage",
      "hope",
      "imagination",
      "patience"
    ]
  },
  {
    "id": "sleep",
    "title": "Sleep",
    "connection": "Explore gentle approaches that may support rest, sleep and your wider wellbeing.",
    "values": [
      "calm"
    ]
  },
  {
    "id": "relaxation-and-mindfulness",
    "title": "Relaxation and mindfulness",
    "connection": "Create moments of attention, calm and restoration without demanding perfection.",
    "values": [
      "beauty",
      "faith",
      "mindfulness",
      "nature",
      "peace"
    ]
  },
  {
    "id": "setting-goals",
    "title": "Setting goals important to you",
    "connection": "Shape realistic, personally meaningful steps towards what matters in your life.",
    "values": [
      "commitment",
      "discipline",
      "excellence",
      "purpose",
      "vision"
    ]
  },
  {
    "id": "communication",
    "title": "Communication",
    "connection": "Explore honest conversations and ways to ask for, offer and receive support.",
    "values": [
      "empathy",
      "honesty",
      "justice",
      "kindness",
      "respect",
      "self-expression",
      "trust"
    ]
  },
  {
    "id": "self-management-toolbox",
    "title": "Self management toolbox",
    "connection": "Gather practical strategies you can adapt to your needs, context and capacity.",
    "values": [
      "consistency",
      "creativity"
    ]
  },
  {
    "id": "flare-ups",
    "title": "Flare ups",
    "connection": "Prepare a compassionate plan for more difficult days and changing capacity.",
    "values": [
      "perseverance",
      "resilience"
    ]
  },
  {
    "id": "acceptance",
    "title": "Acceptance",
    "connection": "Explore acceptance without giving up on the choices and experiences that matter.",
    "values": [
      "acceptance"
    ]
  }
];
  const byValue = new Map();
  pieces.forEach(piece => piece.values.forEach(valueId => byValue.set(valueId, piece)));
  window.LIFE_COMPASS_JIGSAW_PIECES = pieces;
  window.LIFE_COMPASS_ENRICH_JIGSAW = value => {
    const piece = byValue.get(value.id);
    if (!piece) return value;
    return { ...value, back: { ...value.back, jigsaw: { id: piece.id, title: piece.title, connection: piece.connection } } };
  };
}());
