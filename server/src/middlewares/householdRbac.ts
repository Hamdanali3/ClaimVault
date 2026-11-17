import type { NextFunction, Request, Response } from 'express';
import type { HouseholdRole } from '@claimvault/shared';
import { AppError } from './errorHandler.js';

const ROLE_WEIGHT: Record<HouseholdRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

export function requireHouseholdRole(minimumRole: HouseholdRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
      return;
    }
    if (ROLE_WEIGHT[req.auth.role] < ROLE_WEIGHT[minimumRole]) {
      next(
        new AppError(
          `Requires ${minimumRole} permission within this household`,
          403,
          'FORBIDDEN',
        ),
      );
      return;
    }
    next();
  };
}
