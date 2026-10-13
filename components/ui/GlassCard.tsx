import { type ElementType, type ComponentPropsWithoutRef } from "react";

type GlassCardProps<T extends ElementType = "div"> = {
  as?: T;
  strong?: boolean;
  sheen?: boolean;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "strong" | "sheen" | "className">;

export function GlassCard<T extends ElementType = "div">({
  as,
  strong = false,
  sheen = true,
  className = "",
  ...rest
}: GlassCardProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  const classes = [
    "glass",
    strong ? "glass-strong" : "",
    sheen  ? "glass-sheen"  : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <Tag className={classes} {...rest} />;
}
