import { Response } from "express";
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from "../services/errors";

export function handleError(res: Response, error: unknown) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundError)   return res.status(404).json({ error: error.message });
    if (error instanceof ConflictError)   return res.status(409).json({ error: error.message });
    if (error instanceof ForbiddenError)  return res.status(403).json({ error: error.message });
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
}