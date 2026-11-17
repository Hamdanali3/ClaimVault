import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';
import { HouseholdModel } from '../models/Household.js';
import { AppError } from './errorHandler.js';
import type { HouseholdRole } from '@claimvault/shared';

export interface AuthContext {
  userId: string;
  householdId: string;
  role: HouseholdRole;
  isDemoWorkspace: boolean;
  email: string;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export interface AccessTokenPayload {
  sub: string;
  householdId: string;
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: '2h',
    jwtid: crypto.randomUUID(),
  });
}

export function signRefreshToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: '14d',
    jwtid: crypto.randomUUID(),
  });
}

export function verifyRefreshToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as AccessTokenPayload;
}

export const DEMO_USER_EMAIL = 'demo@claimvault.app';

/**
 * Resolves authenticated JWT user or falls back cleanly to the interactive
 * demo household workspace when no Authorization token is supplied (per Julie Zhuo
 * zero-friction Visit 1 rule: visitors can drop receipts before registering).
 */
export async function jwtAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      let decoded: AccessTokenPayload;
      try {
        decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
      } catch {
        throw new AppError('Invalid or expired access token', 401, 'UNAUTHORIZED');
      }

      const user = await UserModel.findById(decoded.sub).lean();
      if (!user) {
        throw new AppError('Account not found', 401, 'UNAUTHORIZED');
      }

      const targetHouseholdId =
        (req.headers['x-household-id'] as string | undefined) ||
        user.activeHouseholdId.toString();

      const household = await HouseholdModel.findById(targetHouseholdId).lean();
      if (!household) {
        throw new AppError('Household not found', 404, 'NOT_FOUND');
      }

      const member = household.members.find(
        (m) => m.userId.toString() === user._id.toString(),
      );
      if (!member) {
        throw new AppError('Access denied for this household', 403, 'FORBIDDEN');
      }

      req.auth = {
        userId: user._id.toString(),
        householdId: household._id.toString(),
        role: member.role,
        isDemoWorkspace: user.email === DEMO_USER_EMAIL,
        email: user.email,
        fullName: user.fullName,
      };
      next();
      return;
    }

    // Zero-friction interactive demo session for unauthenticated evaluators
    const demoUser = await UserModel.findOne({ email: DEMO_USER_EMAIL }).lean();
    if (!demoUser) {
      throw new AppError(
        'Demo workspace is not seeded yet and no Bearer token was provided',
        401,
        'UNAUTHORIZED',
      );
    }

    const demoHousehold = await HouseholdModel.findById(demoUser.activeHouseholdId).lean();
    if (!demoHousehold) {
      throw new AppError('Demo household missing', 500, 'DEMO_MISSING');
    }

    req.auth = {
      userId: demoUser._id.toString(),
      householdId: demoHousehold._id.toString(),
      role: 'OWNER',
      isDemoWorkspace: true,
      email: demoUser.email,
      fullName: demoUser.fullName,
    };
    next();
  } catch (err) {
    next(err);
  }
}
