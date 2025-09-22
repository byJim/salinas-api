import { prisma } from "@/common/database/prisma";
import { HttpException } from "@/common/exceptions/http-exception";
import { Prisma, User } from "@/generated/prisma/client";
import { authService } from "@/common/services/auth.service";

class UserService {
  async findAll(): Promise<User[]> {
    return prisma.user.findMany();
  }

  async findOne(id: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw HttpException.notFound({ message: "User not found" });
    }

    return user;
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    const { email, password } = data;

    if (!password) {
      throw HttpException.badRequest({ message: "Password is required" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw HttpException.conflict({ message: "User with this email already exists" });
    }

    const hashedPassword = await authService.hashPassword({ password });

    return prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    await this.findOne(id);

    if (data.password && typeof data.password === 'string') {
        data.password = await authService.hashPassword({ password: data.password });
    }

    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<User> {
    await this.findOne(id);
    return prisma.user.delete({
      where: { id },
    });
  }
}

export const userService = new UserService();
