import { NextFunction, Request, Response } from "express";
import { prisma } from "@/common/database/prisma";
import { HttpException } from "@/common/exceptions/http-exception";
import { authService } from "@/common/services/auth.service";
import { validateData } from "@/common/utils/validation";
import {
  authRefreshTokenValidator,
  authRegisterValidator,
  authSigninValidator,
} from "../validators/auth.validators";
import { authConfig } from "../auth.config";

export class AuthController {
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = await validateData(authRegisterValidator, {
        body: req.body,
      });

      const { user, accessToken, refreshToken } = await authService.register({
        createUserInput: body,
      });

      res.cookie("salinas_access_token", accessToken, {
        secure: process.env.NODE_ENV === "production",
        maxAge: authConfig.accessTokenExpirationMinutes * 60 * 1000, // Convert minutes to milliseconds
      });

      res.cookie("salinas_refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: authConfig.refreshTokenExpirationMinutes * 60 * 1000, // Convert minutes to milliseconds
      });

      const { password, ...userWithoutPassword } = user;

      return res.status(201).json({
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  };

  signIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = await validateData(authSigninValidator, {
        body: req.body,
      });

      // Verificar si el usuario existe
      const user = await prisma.user.findUnique({
        where: {
          email: body.email,
        },
      });

      if (!user || !user.password) {
        throw HttpException.badRequest({
          message: "Contraseña o correo incorrecto.",
        });
      }

      // Comparamos la contraseña
      const validPassword = await authService.comparePassword({
        password: body.password,
        hashedPassword: user.password,
      });

      if (!validPassword) {
        throw HttpException.badRequest({
          message: "Contraseña o correo incorrecto.",
        });
      }

      // Generamos el token
      const { accessToken, refreshToken } =
        await authService.generateAuthenticationTokens({
          accountId: user.id,
        });

      res.cookie("salinas_access_token", accessToken, {
        secure: process.env.NODE_ENV === "production",
        maxAge: authConfig.accessTokenExpirationMinutes * 60 * 1000,
      });

      res.cookie("salinas_refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: authConfig.refreshTokenExpirationMinutes * 60 * 1000,
      });

      const { password, ...userWithoutPassword } = user;

      return res.json({
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = await validateData(authRefreshTokenValidator, {
        body: req.body,
      });

      let previousRefreshToken =
        body.refreshToken ?? req.cookies?.salinas_refresh_token;

      if (!previousRefreshToken) {
        throw HttpException.badRequest({
          message:
            "Refresh token not found. Please set it in the body parameter or in your cookies.",
        });
      }
      const { accessToken, refreshToken } = await authService
        .refreshAuthenticationTokens({
          refreshToken: previousRefreshToken,
        })
        .catch((error) => {
          throw HttpException.badRequest({
            message: error.message,
          });
        });

      res.cookie("salinas_access_token", accessToken, {
        secure: process.env.NODE_ENV === "production",
        maxAge: authConfig.accessTokenExpirationMinutes * 60 * 1000, // Convert minutes to milliseconds
      });

      res.cookie("salinas_refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: authConfig.refreshTokenExpirationMinutes * 60 * 1000, // Convert minutes to milliseconds
      });

      return res.json({
        accessToken,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
