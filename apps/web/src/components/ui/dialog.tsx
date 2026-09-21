"use client";

import type { ComponentPropsWithoutRef } from "react";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;

type DialogPortalProps = Readonly<DialogPrimitive.DialogPortalProps>;

function DialogPortal({ children }: DialogPortalProps) {
  return <DialogPrimitive.Portal>{children}</DialogPrimitive.Portal>;
}

type DialogOverlayProps = Readonly<ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>;

function DialogOverlay({ className, ...props }: DialogOverlayProps) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:fade-in",
        className
      )}
      {...props}
    />
  );
}

type DialogContentProps = Readonly<ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>;

function DialogContent({ className, children, ...props }: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 shadow-xl focus:outline-none",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-md p-1 text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--interactive)]"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

type DialogHeaderProps = Readonly<ComponentPropsWithoutRef<"div">>;

function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1.5 text-center sm:text-left", className)} {...props} />
  );
}

type DialogTitleProps = Readonly<ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>;

function DialogTitle({ className, ...props }: DialogTitleProps) {
  return <DialogPrimitive.Title className={cn("text-lg font-semibold", className)} {...props} />;
}

type DialogDescriptionProps = Readonly<
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>;

function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-[var(--text-secondary)]", className)}
      {...props}
    />
  );
}

export { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger };
