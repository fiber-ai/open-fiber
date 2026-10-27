import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/** Logo mark from src/config/brand.ts. Swap the image there, not here. */
export function BrandLogo({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={brand.logo.src} alt={brand.logo.alt} className={cn("h-6 w-6 object-contain", className)} />;
}
