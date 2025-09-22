import { Router } from "express";
import { authRoutes } from "@/modules/auth/routes/auth.routes";
import { userRoutes } from "@/modules/user/routes/user.routes"

export const apiRoutes = Router();

// Autenticacion
 apiRoutes.use(authRoutes);

// User
 apiRoutes.use(userRoutes);

