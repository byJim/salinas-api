import jwt from "jsonwebtoken";
import { authConfig } from "@/modules/auth/auth.config";
import { prisma } from "../database/prisma";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { env } from "@/config";
import { dateUtils } from "../utils/date";
import { Role, User, Prisma } from "@/generated/prisma/client";
import { HttpException } from "@/common/exceptions/http-exception";

class AuthService {
    private jwtPrivateKey: string = Buffer.from(
        env.APP_JWT_PRIVATE_KEY,
        "base64"
    ).toString("utf8");
    private jwtPublicKey: string = Buffer.from(
        env.APP_JWT_PUBLIC_KEY,
        "base64"
    ).toString("utf8");

    signJwt = ({
                   payload,
                   options,
               }: {
        payload: string | Buffer | object;
        options: jwt.SignOptions;
    }): Promise<string> => {
        return new Promise((resolve, reject) => {
            jwt.sign(
                payload,
                this.jwtPrivateKey,
                {
                    algorithm: "RS256", // Recommended algorithm for JWT (Asymmetric, uses a private key to sign and a public key to verify.). The default one is HS256 (Symmetric, uses a single secret key for both signing and verifying).
                    ...options,
                },
                (err, token) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(token as string);
                    }
                }
            );
        });
    };

    getJwtPayload = (token: string): Promise<{ sub: string; role: Role }> => {
        return new Promise((resolve, reject) => {
            jwt.verify(token, this.jwtPublicKey, (err, payload) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(payload as { sub: string; role: Role });
                }
            });
        });
    };

    /**
     *  Method to generate a secure unique token
     */
    generateUniqueToken = ({ length = 32 }: { length?: number } = {}) => {
        const result = crypto.randomBytes(length);
        return result.toString("hex");
    };

    comparePassword = async ({
                                 password,
                                 hashedPassword,
                             }: {
        password: string;
        hashedPassword: string;
    }) => {
        return await bcrypt.compare(password, hashedPassword);
    };

    hashPassword = async ({ password }: { password: string }) => {
        return await bcrypt.hash(password, 10);
    };

    register = async ({
      createUserInput,
    }: {
      createUserInput: Prisma.UserCreateInput;
    }): Promise<{ user: User; accessToken: string; refreshToken: string }> => {
      const { email, password } = createUserInput;
  
      if (!password) {
        throw HttpException.badRequest({
          message: "Password is required.",
        });
      }
  
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
  
      if (existingUser) {
        throw HttpException.badRequest({
          message: "A user with this email already exists.",
        });
      }
  
      const hashedPassword = await this.hashPassword({ password });
  
      const user = await prisma.user.create({
        data: {
          ...createUserInput,
          password: hashedPassword,
        },
      });
  
      const { accessToken, refreshToken } = await this.generateAuthenticationTokens({
        accountId: user.id,
      });
  
      return {
        user,
        accessToken,
        refreshToken,
      };
    };

    /**
     * Generate a JWT access token for a given account id.
     */
    generateAuthenticationTokens = async ({
                                              accountId,
                                          }: {
        accountId: string;
    }): Promise<{ accessToken: string; refreshToken: string }> => {
        // Get the user
        const user = await prisma.user.findUnique({
            where: { id: accountId },
        });

        if (!user) {
            throw new Error("Account does not exist.");
        }

        // Create a new session
        const session = await prisma.session.create({
            data: {
                expiresAt: dateUtils.add(new Date(), {
                    minutes: authConfig.refreshTokenExpirationMinutes,
                }),
                accountId,
            },
        });

        // Generate the JWT access token
        const accessToken = await this.signJwt({
            payload: {
                sub: session.id,
                role: user.role,
            },
            options: {
                expiresIn: `${authConfig.accessTokenExpirationMinutes}m`,
            },
        });

        // Generate the JWT refresh token
        const refreshToken = await this.signJwt({
            payload: {
                sub: session.id,
            },
            options: {
                expiresIn: `${authConfig.refreshTokenExpirationMinutes}m`,
            },
        });

        return {
            accessToken,
            refreshToken,
        };
    };

    refreshAuthenticationTokens = async ({
                                             refreshToken,
                                         }: {
        refreshToken: string;
    }) => {
        const payload = await this.getJwtPayload(refreshToken).catch(() => {
            throw new Error("Invalid or expired refresh token.");
        });

        if (!payload) {
            throw new Error("Invalid or expired refresh token.");
        }

        const session = await prisma.session.findUnique({
            include: {
                account: true,
            },
            where: {
                id: payload.sub,
                expiresAt: {
                    gt: new Date(),
                },
            },
        });

        if (!session) {
            throw new Error("This session does not exist.");
        }

        /**
         * Refresh Token Rotation
         * We update the expiration date of the session to prevent the session from expiring
         */
        await prisma.session.update({
            where: { id: session.id },
            data: {
                expiresAt: dateUtils.add(new Date(), {
                    minutes: authConfig.refreshTokenExpirationMinutes,
                }),
            },
        });

        // Generate the JWT access token
        const accessToken = await this.signJwt({
            payload: {
                sub: session.id,
                role: session.account.role,
            },
            options: {
                expiresIn: `${authConfig.accessTokenExpirationMinutes}m`,
            },
        });

        // Generate the JWT refresh token
        const newRefreshToken = await this.signJwt({
            payload: {
                sub: session.id,
            },
            options: {
                expiresIn: `${authConfig.refreshTokenExpirationMinutes}m`,
            },
        });

        return {
            accessToken,
            refreshToken: newRefreshToken,
        };
    };
}

export const authService = new AuthService();