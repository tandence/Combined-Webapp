# Accessibility review

Review date: 30 July 2026

Target: WCAG 2.2 level AA, with NHS patient-facing service expectations.

This is a code and browser review of the static handoff. It is not a formal
statement of conformance or a substitute for an independent accessibility
audit and testing with patients who have access needs.

The subpage videos and external resource links are unfinished draft content.
Nothing in this review should be read as approval of their destinations,
captions, transcripts, accessibility or clinical suitability.

## Improvements included in this handoff

- Added a skip link and focusable main-content target to every page.
- Restored native link semantics to the interactive landing-page pieces.
- Kept all 14 landing pieces and placed builder pieces keyboard operable.
- Added a strong, consistent visible focus treatment.
- Increased primary control targets to at least 44 CSS pixels high.
- Ensured each page has one `h1`, one `main`, a page title and a declared
  English page language.
- Confirmed every image has an `alt` attribute and every video iframe has a
  descriptive title.
- Changed embeds to YouTube's privacy-enhanced domain and enabled lazy loading.
- Added reduced-motion handling for decorative transitions.
- Added social-image alternative text.
- Added `noopener noreferrer` and an announced new-tab warning to links that
  open a new tab.
- Converted 114 dead draft links into non-interactive text. See
  `LINK-REVIEW.md`.
- Corrected invalid nested paragraph and iframe markup and removed one
  accidentally duplicated video.

## Browser checks completed

- All 16 HTML pages rendered with one main landmark, one primary heading and
  no missing image alternatives or iframe titles.
- The landing page rendered all 14 pieces with no JavaScript console errors.
- The builder accepted a keyboard selection, placed a focusable SVG piece and
  updated its selected count with no JavaScript console errors.
- The skip link received first keyboard focus and moved focus to main content.
- All pages reflowed at 320 CSS pixels without horizontal page scrolling.
- All pages tolerated WCAG text-spacing overrides without horizontal page
  scrolling.
- Reduced-motion mode reduced animations and transitions to effectively zero.
- Key colour pairs checked in code were above 4.5:1; primary blue on white was
  6.94:1 and body grey on white was 7.07:1.

## Required before patient launch

1. Complete an independent WCAG 2.2 AA audit across every distinct template
   and the interactive builder.
2. Test with current assistive technologies, including keyboard-only use,
   screen readers, browser zoom, Windows High Contrast Mode and speech input.
3. Include people with access needs, older people and people with lower digital
   confidence in usability research.
4. Finalise and approve every video and external resource link. Verify video
   captions, transcripts and audio description requirements; these cannot be
   established from the embed code.
5. Replace or remove every item in `LINK-REVIEW.md`, then check all final
   external destinations for accessibility, ownership and clinical currency.
6. Have the clinical and content teams review reading level, terminology,
   medicine safety wording and all calls to action.
7. Publish an accessibility statement with known issues, contact details,
   response times and an alternative-format route.
8. Re-test after the web team integrates NHS headers, cookie controls,
   analytics, consent tooling or other production components.

## Reference guidance

- NHS digital service accessibility requirements:
  https://service-manual.nhs.uk/accessibility/what-all-nhs-services-need-to-do
- NHS accessibility testing guidance:
  https://service-manual.nhs.uk/accessibility/testing
- NHS accessibility statement guidance:
  https://service-manual.nhs.uk/accessibility-statement
- WCAG 2.2:
  https://www.w3.org/TR/WCAG22/
