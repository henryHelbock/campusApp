import { Request, Response, NextFunction } from 'express';
import { isWithinCampus } from '@campusapp/shared';

/**
 * Validates that latitude/longitude in the request body are within SUNY Oneonta campus bounds.
 */
export function validateCampusBounds(req: Request, res: Response, next: NextFunction): void {
  const { latitude, longitude } = req.body;

  if (latitude !== undefined && longitude !== undefined) {
    if (!isWithinCampus(latitude, longitude)) {
      res.status(400).json({
        error: 'Coordinates are outside the SUNY Oneonta campus boundary',
      });
      return;
    }
  }

  next();
}
