import { Response, Request } from "express";

export const unknownRoutesMiddleware = (req: Request, res: Response) => {
  return res.status(404).json({ message: `This page does not exist.` });
};
