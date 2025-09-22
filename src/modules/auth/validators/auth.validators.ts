import { z } from "zod";

export const authSigninValidator = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const authRegisterValidator = z.object({
  body: z.object({
    nombre: z.string().min(1),
    apellido: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters long"),
  }),
});

export const authRefreshTokenValidator = z.object({
  body: z.object({
    refreshToken: z.string().min(1).optional(),
  }),
});
