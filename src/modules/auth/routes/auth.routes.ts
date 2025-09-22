import { strictThrottler } from "@/common/throttlers/strict.throttler";
import { Router } from "express";
import { authController } from "../controllers/auth.controller";

export const authRoutes = Router();

authRoutes.post("/auth/register", strictThrottler, authController.register);

authRoutes.post("/auth/login", strictThrottler, authController.signIn);

authRoutes.post("/auth/refresh", authController.refreshToken);
