import { z } from "zod";

export const createUserValidator = z.object({
  body: z.object({
    nombre: z.string().min(1),
    apellido: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters long"),
  }),
});

export const updateUserValidator = z.object({
  body: z.object({
    nombre: z.string().min(1).optional(),
    apellido: z.string().min(1).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6, "Password must be at least 6 characters long").optional(),
    estado: z.boolean().optional(),
  }),
  params: z.object({
      id: z.string().uuid(),
  })
});

export const userIdValidator = z.object({
    params: z.object({
        id: z.string().uuid(),
    })
})
