import { NextFunction, Request, Response } from "express";
import { HttpException } from "@/common/exceptions/http-exception";
import { authService } from "@/common/services/auth.service";
import { prisma } from "@/common/database/prisma";
import { User } from "@/generated/prisma/client";

// By extending the Express Request interface, we can add our own
// context property for type-safe access in controllers.
declare global {
  namespace Express {
    interface Request {
      context?: {
        user: Omit<User, "password">;
      };
    }
  }
}

/**
 * @summary Protects routes by verifying a JWT access token.
 * @description Extracts a JWT from the 'salinas_access_token' cookie or the
 * Authorization header, validates it against the database, and attaches the
 * authenticated user to the request context (`req.context.user`).
 */
export const sessionsGuard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    // 1. Extract token from cookie or Authorization header.
    if (req.cookies?.salinas_access_token) {
      token = req.cookies.salinas_access_token;
    } else if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(
        HttpException.unauthorized({
          message: "Authentication required. No access token provided.",
        })
      );
    }

    // 2. Verify the JWT and get its payload.
    const payload = await authService.getJwtPayload(token).catch(() => {
      // This catches errors from jwt.verify (e.g., invalid signature, expired token)
      throw HttpException.unauthorized({
        message: "Invalid or expired access token.",
      });
    });

    // 3. Find the corresponding session in the database.
    const session = await prisma.session.findUnique({
      where: {
        id: payload.sub,
        // Also ensure the session itself hasn't expired.
        // This is important for enabling manual session revocation.
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        account: true, // Fetch the associated user.
      },
    });

    // If no valid session is found, the token is effectively invalid.
    if (!session || !session.account) {
      return next(
        HttpException.unauthorized({
          message: "Session has expired or is invalid. Please sign in again.",
        })
      );
    }

    // 4. Attach the authenticated user to the request context.
    // We remove the password hash for security.
    const { password, ...userWithoutPassword } = session.account;
    req.context = {
      user: userWithoutPassword,
    };

    // 5. Proceed to the next middleware or route handler.
    return next();
  } catch (error) {
    return next(error);
  }
};
