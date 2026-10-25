---
name: OpenFiber
description: Plain, neutral prospecting UI on Fiber AI's APIs, with a swappable brand layer
colors:
  brand-primary: "#6A48E3"
  brand-ring: "#9D78F0"
  background: "#FFFFFF"
  foreground: "#0A0A0A"
  muted: "#F5F5F5"
  muted-foreground: "#666666"
  border: "#E5E5E5"
  destructive: "#DC2626"
  success: "#15803D"
  warning: "#B45309"
  info: "#1D4ED8"
typography:
  headline:
    fontFamily: "system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.06em"
  micro:
    fontFamily: "system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "40px"
  nav-item-active:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "6px 8px"
  card:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
---

# Design System: OpenFiber

## Overview

**Creative North Star: "The Vanilla Starter"**

OpenFiber is a starting point, not a finished brand. Customers drop it into their own apps or build on it, so the UI is deliberately plain: the stock shadcn/ui look, neutral greys on white, system fonts, no decoration. It should feel like a clean template someone can make their own in minutes.

Brand lives in one thin, swappable layer:

- `src/styles/brand.css`: accent colour, focus-ring tint, font stack, corner radius
- `src/config/brand.ts`: product name and logo (image in `public/brand/`)

Today that layer carries a light Fiber touch: Fiber purple for primary actions and the Fiber "F" mark. Swap those two files and the app is yours.

**Key Characteristics:**
- Neutral shadcn/ui base: white surfaces, grey borders and muted text
- One accent colour, used only for primary buttons, links, focus and the active nav icon
- System font stack, so there's no web font to load
- Every colour is a token, so components never use raw palette classes or hex
- Desktop sidebar rail; below 768px, a top bar opens the nav in an accessible drawer

## Colors

### Brand (from `brand.css`, swap freely)
- **Brand primary** (#6A48E3, `--brand-primary` → `--primary`): primary buttons, links, caret, active nav icon. Must stay ≥ 4.5:1 against its foreground.
- **Brand ring** (#9D78F0, `--brand-ring` → `--ring`): focus rings and the text-selection tint.

### Neutral (shadcn defaults, in `globals.css`)
- **Background / card** (#FFFFFF), **foreground** (#0A0A0A), **muted / accent** (#F5F5F5), **muted foreground** (#666666, ≥ 4.5:1 on muted), **border / input** (#E5E5E5).

### Status
- **Success** (#15803D), **warning** (#B45309), **info** (#1D4ED8), **destructive** (#DC2626), each with a `-muted` background for badges and callouts.
- **Rating** (`--rating`): star ratings only.
- **Chart series** (`--chart-1` … `--chart-10`): categorical data. `--chart-1` follows the brand.

### Named Rules
**The Two-File Rule.** Rebranding touches `brand.css` and `config/brand.ts` only. If a change needs a third file, the token is missing: add it to the brand layer.

**The Token-Only Rule.** No `bg-green-100`, `text-amber-600` or hex values in components.

## Typography

**Font:** the system stack (`--font-sans` in `brand.css`). Forks can point it at their own font.

### Hierarchy
- **Headline** (600, 24px desktop / 20px mobile): page title in `Header`, one `h1` per page.
- **Title** (600, 18px): empty/error state headings (`h2`), detail-sheet names.
- **Body** (400, 14px): everything else; descriptions in muted foreground.
- **Label** (600, 11px, uppercase, +0.06em): sidebar group labels only.
- **Micro** (500, 10px): compact meta inside dense badges and chips only.

## Layout

Full-height app shell: a 256px sidebar rail (collapsible to 64px), then the page. Below 768px a 56px top bar opens the sidebar in a Radix Dialog drawer (focus trapped, Escape and backdrop close it, focus returns to the menu button). Search pages put a 320px filter panel beside results on desktop and stack it above results on mobile. Spacing follows Tailwind's 4px scale.

## Elevation & Depth

Flat. Depth comes from borders. Shadows only on things that float: dialogs, sheets, the mobile drawer, toasts.

## Shapes

`--radius` 0.5rem (shadcn default): 8px cards, 6px buttons and inputs, pill badges. Lucide icons at 16px.

## Components

- **Buttons:** shadcn variants. Primary uses the brand colour. Every icon-only button has an `aria-label`.
- **Badges:** `default`, `secondary`, `success`, `warning`, `info`, `destructive`, `outline`.
- **Inputs, selects, textareas:** every control has a programmatic label: a `<Label htmlFor>` (with `useId()` in shared components), a wrapping `<label>`, or an `aria-label` when there's no visible label.
- **Navigation:** exactly one item is active, the longest nav href matching the real URL (`asPath`). It gets `aria-current="page"`.
- **Empty & error states:** centred muted icon, `h2` title, muted description, optional action.

## Do's and Don'ts

### Do:
- **Do** keep new UI plain: neutral greys, the brand colour only for the primary action.
- **Do** add a token before using a new colour.
- **Do** label every control, including ones that only render after data loads.
- **Do** check new pages at 390px wide.

### Don't:
- **Don't** add brand styling outside `brand.css` / `config/brand.ts`.
- **Don't** add gradients, glows, tinted canvases or decorative shadows.
- **Don't** hard-code ids in shared components; use `useId()`.
