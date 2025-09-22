import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { sessionsGuard } from "@/common/guards/sessions.guard";

export const userRoutes = Router();

userRoutes.get("/users", sessionsGuard, userController.findAll);

userRoutes.get("/users/:id", sessionsGuard, userController.findOne);

userRoutes.post("/users", sessionsGuard, userController.create);

userRoutes.put("/users/:id", sessionsGuard, userController.update);

userRoutes.delete("/users/:id", sessionsGuard, userController.delete);
