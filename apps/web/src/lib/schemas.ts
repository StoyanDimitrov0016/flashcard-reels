import * as z from "zod";

export const SignInSchema = z.object({
  password: z.string().min(1, "Enter the team password.").max(256, "That password is too long."),
  returnTo: z.string().max(2048).optional(),
});

export type SignInValues = z.infer<typeof SignInSchema>;
