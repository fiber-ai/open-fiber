import { useEffect, useState } from "react";
import { Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reusable avatar component with fallback handling.
 *
 * Renders an image if `src` is provided and loads successfully.
 * Falls back to an icon (company building or person silhouette).
 *
 * If the Fiber proxy endpoints (/v1/company-logo/:id, /v1/profile-picture/:id)
 * are wired in the future, simply pass their URLs as `src` — no other changes needed.
 */

interface FiberAvatarProps {
  src?: string | null;
  alt?: string;
  type: "company" | "person";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-12 w-12",
} as const;

const iconSizeMap = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const;

export function FiberAvatar({
  src,
  alt,
  type,
  size = "md",
  className,
}: FiberAvatarProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const dimensions = sizeMap[size];
  const iconDimensions = iconSizeMap[size];
  const isRound = type === "person";
  const Icon = type === "company" ? Building2 : User;
  const objectFitClass = type === "company" ? "object-contain" : "object-cover";

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt ?? ""}
        className={cn(
          dimensions,
          "border",
          objectFitClass,
          isRound ? "rounded-full" : "rounded",
          className
        )}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center border bg-muted",
        dimensions,
        isRound ? "rounded-full" : "rounded",
        className
      )}
    >
      <Icon className={cn(iconDimensions, "text-muted-foreground")} />
    </div>
  );
}
