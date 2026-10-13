import { forwardRef } from "react";

type Variant = "primary" | "glass" | "ghost";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: false;
}

interface AnchorProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant;
  size?: Size;
  asChild: true;
  href: string;
}

type Props = ButtonProps | AnchorProps;

const sizeClass: Record<Size, string> = {
  sm: "h-9  px-4  text-sm",
  md: "h-11 px-5  text-sm",
  lg: "h-12 px-6  text-base",
};

const variantClass: Record<Variant, string> = {
  primary: [
    "text-[--text] font-semibold",
    "bg-gradient-to-r from-[--blue] to-[--violet]",
    "border border-transparent",
    "shadow-[0_0_24px_rgba(76,125,255,.30)]",
    "hover:brightness-110 active:brightness-95 active:scale-[0.98]",
    "disabled:opacity-50 disabled:pointer-events-none",
    "transition-[filter,transform] duration-150",
  ].join(" "),

  glass: [
    "text-[--text] font-medium",
    "glass glass-strong",
    "hover:brightness-125 active:brightness-90 active:scale-[0.98]",
    "disabled:opacity-40 disabled:pointer-events-none",
    "transition-[filter,transform] duration-150",
  ].join(" "),

  ghost: [
    "text-[--text-2] font-medium",
    "bg-transparent border border-[--glass-border]",
    "hover:bg-white/5 active:bg-white/10 active:scale-[0.98]",
    "disabled:opacity-40 disabled:pointer-events-none",
    "transition-[background,transform] duration-150",
  ].join(" "),
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full whitespace-nowrap " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[--aqua] focus-visible:outline-offset-2 " +
  "cursor-pointer select-none";

function buildClasses(variant: Variant, size: Size, className: string) {
  return [base, sizeClass[size], variantClass[variant], className].join(" ");
}

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, Props>(
  (props, ref) => {
    const { variant = "primary", size = "md", className = "" } = props;
    const classes = buildClasses(variant, size, className);

    if ("asChild" in props && props.asChild) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { asChild: _a, variant: _v, size: _s, className: _c, ...anchorRest } = props as AnchorProps & { className?: string };
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={classes}
          {...anchorRest}
        />
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { asChild: _a, variant: _v, size: _s, className: _c, ...btnRest } = props as ButtonProps & { className?: string };
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={classes}
        {...btnRest}
      />
    );
  },
);

Button.displayName = "Button";
