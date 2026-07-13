import Image from "next/image";
import { cn } from "@/lib/cn";

const markBySurface = {
  dark: "/logo.png",
  light: "/logo-light.png",
} as const;

type BrandMarkProps = {
  alt?: string;
  className?: string;
  priority?: boolean;
  surface?: keyof typeof markBySurface;
};

export function BrandMark({
  alt = "",
  className,
  priority = false,
  surface = "dark",
}: BrandMarkProps) {
  return (
    <Image
      src={markBySurface[surface]}
      alt={alt}
      width={1080}
      height={1080}
      className={cn("shrink-0 object-contain", className)}
      sizes="40px"
      priority={priority}
    />
  );
}
