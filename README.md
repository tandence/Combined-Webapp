# Pain Jigsaw — connected vision demo

**Understand your pain. Discover what matters. Find your way forward.**

This is a separate, static desktop-style demonstration shell. The original Pain Management Jigsaw and What Matters Most folders are not changed. The shell shows how four independently usable elements can also form one prompted journey:

1. Learn — Pain Management Jigsaw
2. Personalise — Create My Jigsaw
3. Choose — What Matters Most values and goal
4. Try — Plan My Day

## Open the demo

Serve this folder from a local web server and open `index.html`. Do not open the files directly with a `file://` address because browser storage, downloads and page-to-page handoffs behave more reliably over HTTP.

For example, from this folder:

```powershell
npx serve .
```

The home page includes an **Open presenter journey** button with the prepared 12-part demonstration. The prepared story is also documented in `DEMO-SCRIPT.md`.

## Standalone routes

- `pain-jigsaw/index.html` — learning hub
- `pain-jigsaw/builder.html` — personal Jigsaw Builder
- `values/index.html#/welcome` — values deck and goal journey
- `pacing/index.html` — capacity and pacing planner

Each route works without completing the earlier modules. The connected header and contextual prompts provide optional movement between them.

## Prototype and governance status

This folder is for internal direction-setting, usability discussion and clinical/content review. It is not a deployed patient product.

- No sign-in, analytics, server or patient record is included.
- Entries are stored only in the current browser. Shared-device visibility and browser-data loss are explained on the home page.
- The public-entry copy welcomes self-directed use while stating that the tool does not diagnose, monitor symptoms or replace individual medical advice.
- Pain learning content remains marked as draft in the supplied Pain Jigsaw package.
- Pacing copy and logic are demonstrative and need clinical, accessibility, information-governance and NHS digital review before release.
- Links, videos, emergency/signposting content and copyright permissions should be reviewed before any public pilot.

## Folder map

```text
combined-desktop-demo/
  index.html             connected home and desktop shell
  site.webmanifest       installable-shell metadata using the Jigsaw icon
  shared/                shell and optional cross-module navigation
  pain-jigsaw/           self-contained copy of the existing learning/builder tool
  values/                self-contained copy of the existing values/goal tool
  pacing/                new standalone pacing demonstration
  DEMO-SCRIPT.md         prepared 12-part presenter route
  ARCHITECTURE.md        boundaries, storage and handoff notes
```

## Suggested web-team conversation

Treat the modules as separately approvable products sharing a design system and optional handoff contract. This lets the Pain Jigsaw learning hub progress first if it is easiest to approve, while preserving the combined product direction.
