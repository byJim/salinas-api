import { NextFunction, Request, Response } from "express";
import { validateData } from "@/common/utils/validation";
import { userService } from "../services/user.service";
import { createUserValidator, updateUserValidator, userIdValidator } from "../validators/user.validators";

class UserController {
  findAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await userService.findAll();
      const usersWithoutPassword = users.map(user => {
        const { password, ...rest } = user;
        return rest;
      });
      res.json(usersWithoutPassword);
    } catch (error) {
      next(error);
    }
  };

  findOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
       const { params } = await validateData(userIdValidator, { params: req.params });
      const user = await userService.findOne(params.id);
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = await validateData(createUserValidator, { body: req.body });
      const newUser = await userService.create(body);
      const { password, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { params, body } = await validateData(updateUserValidator, { params: req.params, body: req.body });
      const updatedUser = await userService.update(params.id, body);
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { params } = await validateData(userIdValidator, { params: req.params });
      const deletedUser = await userService.delete(params.id);
      const { password, ...userWithoutPassword } = deletedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  };
}

export const userController = new UserController();
