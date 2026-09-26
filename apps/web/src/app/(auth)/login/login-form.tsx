"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { SignInSchema, type SignInValues } from "@/lib/schemas";

import { signIn } from "./actions";

type LoginFormProps = Readonly<{ returnTo?: string }>;

export function LoginForm({ returnTo }: LoginFormProps) {
  const [pending, startTransition] = useTransition();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const {
    formState: { errors },
    handleSubmit,
    register,
    setError,
    setFocus,
  } = useForm<SignInValues>({
    defaultValues: { password: "", returnTo },
    resolver: zodResolver(SignInSchema),
  });

  const submit = handleSubmit((values) =>
    startTransition(async () => {
      // A successful sign-in redirects, so only failures come back here.
      const result = await signIn(values);
      setError("password", { message: result.error });
      setFocus("password");
    })
  );

  return (
    <form className="grid gap-5" noValidate onSubmit={submit}>
      <div className="grid gap-2">
        <Label htmlFor="password">Team password</Label>
        <div className="relative">
          <Input
            aria-describedby={errors.password ? "password-error" : undefined}
            aria-invalid={errors.password ? true : undefined}
            autoComplete="current-password"
            autoFocus
            className="pr-10"
            id="password"
            type={passwordVisible ? "text" : "password"}
            {...register("password")}
          />
          <button
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-subtle-foreground transition-colors hover:text-foreground"
            onClick={() => setPasswordVisible((visible) => !visible)}
            type="button"
          >
            {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive" id="password-error" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>
      <Button disabled={pending} size="lg" type="submit">
        {pending ? <Spinner /> : null}
        {pending ? "Signing in" : "Continue"}
        {!pending && <ArrowRight />}
      </Button>
    </form>
  );
}
