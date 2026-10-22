---
name: OpenFiber
description: Open-source prospecting UI on Fiber AI's APIs, in Fiber's brand
colors:
  fiber-violet: "#6A48E3"
  fiber-lilac: "#9D78F0"
  deep-violet: "#5235CC"
  lavender-canvas: "#FAF8FE"
  paper: "#FFFFFF"
  violet-wash: "#F3EEFD"
  quiet-wash: "#F4F2F8"
  ink: "#1E1E1E"
  slate-violet: "#6B6578"
  hairline: "#E8E8E8"
  field-line: "#D6D1E3"
  signal-red: "#D92D20"
  ledger-green: "#15803D"
  amber-ink: "#B45309"
  link-blue: "#1D4ED8"
typography:
  headline:
    fontFamily: "Hanken Grotesk Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Hanken Grotesk Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Hanken Grotesk Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Hanken Grotesk Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.06em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.fiber-violet}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-outline-hover:
    backgroundColor: "{colors.violet-wash}"
    textColor: "{colors.deep-violet}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "40px"
  nav-item-active:
    backgroundColor: "{colors.violet-wash}"
    textColor: "{colors.deep-violet}"
    rounded: "{rounded.md}"
    padding: "6px 8px"
  badge-success:
    backgroundColor: "#ECFDF3"
    textColor: "{colors.ledger-green}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
---

# Design System: OpenFiber

## Overview

**Creative North Star: "The Prospector's Bench"**

OpenFiber is a working tool: filter, search, enrich, export, repeat. The interface is a quiet bench where data does the talking. Surfaces are white paper laid on a faint lavender canvas, text is near-black ink, and Fiber violet appears only where the operator acts, is located or is focused. Everything else stays still.

It is equally reference code. Every colour, radius and typeface resolves to a CSS variable in `src/styles/globals.css`, so a fork re-brands by editing one block. Components never name a raw palette colour.

The brand comes from Fiber AI's Figma palette. Fiber's product face (TWK Lausanne) is licensed and cannot ship open source, so OpenFiber uses Hanken Grotesk, an OFL grotesk of similar temperament, behind `--font-sans`.

**Key Characteristics:**
- Lavender canvas, white working surfaces, hairline borders
- One violet for action, selection and focus; nothing decorative
- Status colour through semantic tokens (success / warning / info / destructive)
- Dense but legible: 14px body, tabular numerals in tables
- Desktop rail navigation, off-canvas drawer below 768px

## Colors

A near-neutral system tinted toward Fiber's violet, with one saturated accent.

### Primary
- **Fiber Violet** (#6A48E3, `--primary`): primary buttons, active nav icon, links, caret. 5.8:1 against white.
- **Fiber Lilac** (#9D78F0, `--brand`, `--ring`): focus rings and text-selection tint. The brand's signature hue, too light for text on white (3.3:1), so it never carries text.
- **Deep Violet** (#5235CC, `--accent-foreground`): text on violet washes (active nav item, hovered rows, info chips).

### Neutral
- **Lavender Canvas** (#FAF8FE, `--background`): app background behind panels.
- **Paper** (#FFFFFF, `--card`): cards, sidebars, headers, inputs, dialogs, sheets.
- **Violet Wash** (#F3EEFD, `--accent`): hover and selected states.
- **Quiet Wash** (#F4F2F8, `--muted`): neutral fills, skeletons, credit badge.
- **Ink** (#1E1E1E, `--foreground`): body and heading text.
- **Slate Violet** (#6B6578, `--muted-foreground`): secondary text; ≥4.9:1 on every surface above.
- **Hairline** (#E8E8E8, `--border`): dividers and card borders.
- **Field Line** (#D6D1E3, `--input`): input borders, a touch stronger than hairlines.

### Status
- **Ledger Green** (#15803D, `--success`) on #ECFDF3 (`--success-muted`): valid, verified, open-to-work.
- **Amber Ink** (#B45309, `--warning`) on #FFFAEB: risky, low credits, slow operations.
- **Link Blue** (#1D4ED8, `--info`) on #EFF6FF: hiring, informational chips.
- **Signal Red** (#D92D20, `--destructive`) and #B42318 on #FEF3F2: errors, invalid, delete.

### Named Rules
**The One Violet Rule.** Violet marks action, location and focus only. If an element is violet and you can't click it, it shouldn't be violet.

**The Token-Only Rule.** No `bg-green-100`, `text-amber-600` or hex values in components. Add a token first.

## Typography

**Body Font:** Hanken Grotesk Variable (self-hosted via `@fontsource-variable/hanken-grotesk`), falling back to `system-ui`

**Character:** A plain, slightly warm grotesk, quiet at 14px and firm at 600 weight. It stands in for Fiber's TWK Lausanne.

### Hierarchy
- **Headline** (600, 24px desktop / 20px mobile, -0.025em): page title in `Header`, one `h1` per page.
- **Title** (600, 18px): empty and error state headings (`h2`), detail-sheet names.
- **Body** (400, 14px, 1.43): everything else; descriptions in Slate Violet.
- **Label** (600, 11px, +0.06em, uppercase): sidebar group labels only.

### Named Rules
**The One H1 Rule.** Each page has exactly one `h1` (from `Header`). Sections below it start at `h2`.

## Layout

App shell is a full-height flex row: a 256px sidebar rail (collapsible to 64px), then the page. Below 768px the rail is replaced by a 56px top bar whose menu button opens the sidebar as a 288px drawer (Escape or backdrop closes it). Search pages put a 320px filter panel beside results on desktop and stack it above results on mobile. Pages pad 16px on mobile and 24px from `md` up. Spacing follows Tailwind's 4px scale; groups use 8–12px, sections 16–24px.

## Elevation & Depth

Flat by default: depth comes from paper-on-canvas tonal layering and hairline borders. Shadows appear only on overlays (dialogs, sheets, the mobile drawer, toasts) using Tailwind's `shadow-lg` / `shadow-xl`, over a `black/20–30` scrim.

### Named Rules
**The Flat-At-Rest Rule.** Cards and panels never carry shadows; only things that float above the page do.

## Shapes

Radius `--radius` is 10px (cards), with 8px for buttons, inputs and nav items and 6px for small controls. Badges are pills. Icons are Lucide at 16px, 1.5–2px stroke; no emoji or Unicode glyphs as icons.

## Components

### Buttons
- **Primary:** Fiber Violet fill, white text, 8px radius, 40px tall; hover at 90% opacity; disabled at 50%.
- **Outline:** Paper fill, Field Line border; hover Violet Wash with Deep Violet text.
- **Ghost / icon:** transparent, Slate Violet icon; every icon-only button carries an `aria-label`.

### Badges
Variants `default`, `secondary`, `success`, `warning`, `info`, `destructive`, `outline`. Status badges use the muted wash with the strong status colour as text.

### Cards / Containers
Paper on Lavender Canvas, Hairline border, 10px radius, no shadow.

### Inputs / Fields
Paper fill, Field Line border, 40px tall, Lilac focus ring (2px). Placeholders in Slate Violet.

### Navigation
Sidebar on Paper. Group labels in uppercase Label style. Items are 14px Slate Violet; hover and active use Violet Wash with Deep Violet text, and the active icon turns Fiber Violet. The active item sets `aria-current="page"` and matches sub-routes (`/audiences/123` highlights Audiences).

### Empty & Error States
Centred: a violet-wash circle with a Fiber Violet icon, an `h2` title, a Slate Violet description, and an optional action.

## Do's and Don'ts

### Do:
- **Do** add a semantic token before using a new colour anywhere.
- **Do** label every icon-only control and keep visible focus rings.
- **Do** check new pages at 390px wide.
- **Do** use `Badge` variants for status instead of inline colour classes.

### Don't:
- **Don't** use Fiber Lilac (#9D78F0) for text or button fills; it fails contrast.
- **Don't** add gradients, glows, coloured side-stripe borders or decorative shadows.
- **Don't** load web fonts from third-party CDNs; self-host through `@fontsource`.
- **Don't** reintroduce Inter or the stock shadcn grayscale theme.
