/* Editorial copy for the active 45-value production deck. */
(function () {
  const questions = {
  "acceptance": "Where would more acceptance help me feel peaceful this week?",
  "adventure": "Where is adventure inviting me beyond what is familiar?",
  "authenticity": "When does authenticity help my choices feel true?",
  "balance": "What helps me feel grounded and well?",
  "beauty": "What becomes possible when I give beauty room?",
  "belonging": "How do I want people to experience belonging with me?",
  "calm": "Where would more calm help me feel steady and safe?",
  "commitment": "When does commitment help my choices feel aligned?",
  "compassion": "How do I want people to experience compassion from me?",
  "consistency": "What deserves my patient practice of consistency?",
  "courage": "What feels worth doing, even if it scares me?",
  "creativity": "What becomes possible when I give creativity room?",
  "curiosity": "What am I becoming curious about?",
  "discipline": "What deserves my patient practice of discipline?",
  "empathy": "How do I want people to experience empathy from me?",
  "excellence": "What deserves my patient practice of excellence?",
  "faith": "What helps faith connect my life to something larger?",
  "family": "How do I want people to experience family with me?",
  "focus": "What deserves my patient practice of focus?",
  "freedom": "Where do I feel most free to be myself?",
  "friendship": "How do I want people to experience friendship with me?",
  "generosity": "Where could my generosity make life easier for someone?",
  "growth": "What is growth asking of me now?",
  "health": "What helps me feel most alive?",
  "honesty": "When does honesty help my choices feel true and whole?",
  "hope": "What helps hope connect my life to something larger?",
  "imagination": "What becomes possible when I give imagination room?",
  "joy": "What brings me quietly to life?",
  "justice": "Where could fairness make the biggest difference?",
  "kindness": "How do I want people to experience kindness from me?",
  "love": "How do I want people to experience love through me?",
  "mindfulness": "When do I notice life most clearly?",
  "nature": "When do I feel most restored by the natural world?",
  "patience": "Where would more patience help me feel calm and steady?",
  "peace": "Where am I longing for more peace?",
  "perseverance": "What is worth continuing, even when it's difficult?",
  "purpose": "What helps purpose connect my life to something larger?",
  "resilience": "Where is resilience inviting me beyond what is familiar?",
  "respect": "How do I want people to experience respect from me?",
  "self-expression": "What becomes possible when I give self-expression room?",
  "service": "How do I want to be of service in the world?",
  "simplicity": "Where would more simplicity help me feel steady and calm?",
  "trust": "How do I want people to experience trust through me?",
  "vision": "What kind of future do I want to create?",
  "wisdom": "What helps wisdom connect my life to something larger?"
};
  const patterns = {
    Wellbeing: value => [`Making room for ${value} in ways that support your body, mind and everyday capacity.`, `What could help ${value} feel more available this week?`, `What small caring choice could express ${value} tomorrow?`],
    Growth: value => [`Letting ${value} expand how you understand, respond and become through experience.`, `What manageable edge of ${value} could you approach this week?`, `What small experiment could practise ${value} tomorrow?`],
    Integrity: value => [`Allowing ${value} to align what you believe, say and do with care for others.`, `Where could ${value} guide a more honest choice this week?`, `What action could make ${value} visible tomorrow?`],
    Creativity: value => [`Using ${value} to notice, imagine and give form to possibilities beyond the obvious.`, `What could you explore or make through ${value} this week?`, `What could you try without over-editing tomorrow?`],
    Relationships: value => [`Bringing ${value} into relationships through presence, honesty, mutual care and respect.`, `Which relationship could benefit from ${value} this week?`, `What small gesture could communicate ${value} tomorrow?`],
    Direction: value => [`Using ${value} to distinguish what matters from what is merely urgent or expected.`, `Which decision could benefit from ${value} this week?`, `What could you name or set aside tomorrow?`],
    Mastery: value => [`Developing ${value} through attentive effort, useful feedback and respect for real limits.`, `Where could you practise ${value} with care this week?`, `What one detail could you tend tomorrow?`],
    Contribution: value => [`Offering ${value} in ways that strengthen people, communities or the wider world.`, `Where would ${value} be genuinely useful this week?`, `What proportionate act could express ${value} tomorrow?`],
    Meaning: value => [`Letting ${value} shape how you understand purpose, belonging and what makes effort worthwhile.`, `What practice could reconnect you with ${value} this week?`, `What quiet choice could honour ${value} tomorrow?`],
    Achievement: value => [`Using ${value} to hold a meaningful direction without losing sight of the life around you.`, `Which possibility deserves attention through ${value} this week?`, `What realistic step could you take tomorrow?`]
  };
  window.LIFE_COMPASS_ENRICH_COPY = value => {
    const pattern = patterns[value.category] || patterns.Growth;
    const [looksLike, thisWeek, tomorrow] = pattern(value.title.toLowerCase());
    return { ...value, front: { ...value.front, question: questions[value.id] || value.front.question }, back: { ...value.back, looksLike, thisWeek, tomorrow } };
  };
}());
