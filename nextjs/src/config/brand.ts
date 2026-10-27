/**
 * Product name and logo shown in the app shell.
 *
 * To rebrand a fork: drop your logo in /public/brand/ and update the values
 * here. Colours, font and radius live in src/styles/brand.css.
 */
export const brand = {
  name: "OpenFiber",
  /** Square mark shown next to the name in the sidebar and mobile top bar. */
  logo: {
    src: "/brand/logo.png",
    /** Decorative next to the visible name, so empty alt by default. */
    alt: "",
  },
} as const;
