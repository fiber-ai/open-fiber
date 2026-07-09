/**
 * Reddit logo, served from public/reddit-logo.png.
 * Rendered as an <img> so it can slot into the icon (React.ElementType)
 * props used by the sidebar nav and page Header, which pass a `className`
 * for sizing.
 */
export function RedditLogo({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/reddit-logo.png" alt="Reddit" className={className} />;
}
