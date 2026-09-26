import type { ComponentPropsWithoutRef } from "react";

import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    defaultVariants: { size: "md", variant: "secondary" },
    variants: {
      size: {
        icon: "size-9",
        lg: "h-11 px-5 text-[15px]",
        md: "h-9 px-3.5",
        sm: "h-8 px-2.5 text-[13px]",
      },
      variant: {
        danger: "bg-danger text-white hover:opacity-90",
        ghost: "text-fg-muted hover:bg-surface-hover hover:text-fg",
        primary: "bg-action text-action-fg shadow-sm hover:opacity-90",
        secondary: "border border-line-strong bg-surface text-fg hover:bg-surface-hover",
      },
    },
  }
);

type ButtonProps = Readonly<
  ComponentPropsWithoutRef<"button"> &
    VariantProps<typeof buttonVariants> & {
      /** Renders the child element, such as a link, with button styling. */
      asChild?: boolean;
    }
>;

function Button({ asChild = false, className, size, type, variant, ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ size, variant }), className);
  if (asChild) {
    return <Slot.Root className={classes} {...props} />;
  }
  return <button className={classes} type={type ?? "button"} {...props} />;
}

export { Button };
