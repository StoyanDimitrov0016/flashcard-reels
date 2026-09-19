import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--interactive)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--action-primary)] text-[var(--action-primary-text)] hover:opacity-90",
        outline:
          "border border-[var(--border-strong)] bg-transparent hover:bg-[var(--surface-hover)]",
      },
      size: { default: "h-10 px-4 py-2", lg: "h-11 px-8" },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

type ButtonProps = Readonly<
  ComponentPropsWithoutRef<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }
>;

function Button({ asChild, className, variant, size, ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, className }));
  if (asChild) {
    return <Slot className={classes} {...props} />;
  }
  return <button className={classes} {...props} />;
}

export { Button };
