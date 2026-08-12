# Architecture and handoff notes

## Product boundary

The combined shell is deliberately an orchestration layer, not a rewrite. `pain-jigsaw`, `values` and `pacing` can be hosted at separate paths or separated into different release packages. Relative links are the only deployment assumption that would need updating if they move to different domains.

## Client-side storage

| Element | Storage | Purpose |
| --- | --- | --- |
| Pain Jigsaw Builder | `localStorage` | Personal pieces, layout and focus areas |
| What Matters Most | `localStorage` | Value choices, reflection and goal draft |
| Values-to-module handoff | `sessionStorage` | Current compass snapshot for the same browser tab/session |
| Plan My Day | `localStorage` | Capacity choice, activities and adaptations |

There is no account, server sync or clinical record. The demo provides a clear-progress control. Before deployment, storage duration, shared-device risks, consent language, privacy notice and any analytics must be agreed through NHS Scotland information-governance processes.

## Connected handoff

The Values tool writes a small snapshot to `sessionStorage` before linking to the Builder, Pain Jigsaw or Pacing. It also sends non-sensitive identifiers in the URL so routing can still work if session storage is unavailable. Pacing reads the snapshot to display the chosen North Star and goal; it remains fully usable when no snapshot exists.

## Prepared data

`?demo=family` loads a clearly marked fictional example for internal presentation. It should not be treated as real patient data. The home-page clear control removes all demo storage keys from the current browser.

## Recommended next technical stage

1. Confirm the service content model and clinical owner for every learning/pacing statement.
2. Test the four standalone routes and the prompted route with patients and clinicians.
3. Complete WCAG 2.2 AA review with keyboard, screen-reader, zoom/reflow and cognitive-accessibility testing.
4. Agree NHS hosting, privacy, analytics, retention and support arrangements.
5. Replace the lightweight browser handoff with an approved shared state pattern only if user research shows a need.
