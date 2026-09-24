"use client";

import type { ComponentPropsWithoutRef } from "react";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;

type DialogContentProps = Readonly<ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>;

function DialogContent({ className, children, ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px] data-[state=open]:animate-overlay-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-5 rounded-xl border border-line bg-surface p-6 shadow-2xl outline-none data-[state=open]:animate-dialog-in",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Close"
          className="absolute top-4 right-4 rounded-md p-1 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

type DialogHeaderProps = Readonly<ComponentPropsWithoutRef<"div">>;

function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return <div className={cn("flex flex-col gap-1.5 pr-6", className)} {...props} />;
}

type DialogTitleProps = Readonly<ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>;

function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <DialogPrimitive.Title
      className={cn("text-lg font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

type DialogDescriptionProps = Readonly<
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>;

function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm leading-6 text-fg-muted", className)}
      {...props}
    />
  );
}

export { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger };
