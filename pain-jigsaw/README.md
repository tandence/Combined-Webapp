# Pain Management Jigsaw — web-team handoff

> **STATUS: PRE-DEPLOYMENT CONTENT DRAFT — DO NOT PUBLISH**
>
> The subpage video embeds and external resource links are still being
> developed. They are not complete, clinically approved or ready for patient
> use. This package is suitable for web-team integration and review only.

This is a self-contained static website. It has no build step, package
dependencies, database, server-side code, or required environment variables.

The visual design, page structure and accessibility improvements are included,
but the content-link workstream remains open. See `CONTENT-STATUS.md` and
`LINK-REVIEW.md`.

## Deploy

1. Publish the complete contents of this folder at the intended web root.
2. Serve `index.html` as the default document.
3. Preserve the existing relative paths and filename casing.
4. Serve the site over HTTPS.

Standard MIME types are required for HTML, CSS, JavaScript, PNG, ICO, and
`site.webmanifest`.

Recommended caching:

- HTML and `site.webmanifest`: no-cache or a short cache lifetime.
- CSS, JavaScript, icons, and PNG artwork: long-lived caching is suitable.

## Main entry points

- `index.html` — interactive topic explorer.
- `builder.html` — personal jigsaw builder.
- The remaining HTML files are individual topic pages.

### Optional 3D builder prototype

`builder-3d-prototype.html` is a separate review version of the builder with a
layered, joined 3D output. It uses separate CSS, JavaScript and browser storage,
so it remains available as a comparison page. The approved layered 3D treatment
is now also enabled in the main `builder.html` experience. New custom pieces are
assigned a stable colour at creation from an accessible five-colour palette.

## Data and privacy

The builder saves progress only in the visitor's browser storage. No personal
data is sent by the builder, and the site contains no analytics code.

Topic pages currently contain third-party video embeds and external links.
Their privacy, consent, cookie and information-governance implications have not
been approved in this draft and must be reviewed before publication.

Clearing browser storage or choosing **Start Again** removes saved progress on
that device. Progress does not synchronise between devices.

## Functional notes

- The site is responsive and supports keyboard navigation.
- Printing/PDF export uses the browser's native print dialog.
- All topic pages and the builder use the same current 3D puzzle-piece artwork.
- Topic-page artwork has an enhanced 3D presentation and restrained entrance
  motion. Motion is removed when the visitor requests reduced motion.
- Open Graph and large-card social metadata are included on every page. The
  social card is at `assets/social/pain-management-jigsaw-social.png`.
- The web-app manifest and app icons are included, but there is no service
  worker or offline mode.

## Accessibility work completed

The handoff includes a practical WCAG 2.2 AA-oriented pass:

- skip links and programmatic main-content targets on every page;
- high-visibility keyboard focus indicators;
- native navigation/link semantics on the interactive topic explorer;
- keyboard support for the SVG jigsaw builder;
- 44px minimum targets for primary controls;
- descriptive video titles, lazy loading, and privacy-enhanced YouTube embeds;
- reduced-motion handling for decorative transitions;
- descriptive image alternatives and one primary heading per page;
- dead placeholder links converted to non-interactive text.

This code review does not replace testing with disabled people or the
organisation's formal accessibility assurance process. Before publication,
test keyboard-only operation, screen-reader operation, browser zoom to 200% and
400%, reflow at 320 CSS pixels, and Windows High Contrast Mode.

## Content still requiring decisions

`LINK-REVIEW.md` lists draft resource labels that had no destination. They are
plain text in this handoff so patients do not encounter dead links. Replace
each with an approved URL or remove the item before publication.

Existing video URLs and external URLs must also be treated as unapproved draft
content. They have only received technical accessibility treatment; that does
not confirm that the destination, title, clinical content, captions or
ownership is correct.

## Pre-launch checks

- Confirm the final production URL and hosting ownership.
- Obtain written content-owner approval for every video and external resource.
- Replace the relative `og:image` and `twitter:image` values with an absolute
  HTTPS production URL if required by the organisation's sharing platform.
- Review all clinical copy and external resource links with the content owner.
- Confirm that the generated social card and all imagery are approved for use
  under the organisation's brand governance.
- Run the organisation's accessibility, privacy, security-header, and browser
  compatibility checks.
- Publish an accessibility statement and provide a clearly signposted route
  for patients to request the information in another format.
- Add analytics or consent management only if approved by the organisation.
