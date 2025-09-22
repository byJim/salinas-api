import { Router } from "express";
import { authRoutes } from "@/modules/auth/routes/auth.routes";

export const apiRoutes = Router();

// -- Auth
 apiRoutes.use(authRoutes);

