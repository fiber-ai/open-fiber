/**
 * X (formerly Twitter) logo, served from public/x-logo.png.
 * Rendered as an <img> so it can slot into the icon (React.ElementType)
 * props used by the sidebar nav and page Header, which pass a `className`
 * for sizing.
 */
export function XLogo({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/x-logo.png" alt="X" className={className} />;
}
