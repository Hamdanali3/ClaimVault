import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { LoginSchema, RegisterSchema } from '@claimvault/shared';
import { UserModel } from '../models/User.js';
import { HouseholdModel } from '../models/Household.js';
import { AppError } from '../middlewares/errorHandler.js';
import {
  computeSha256Hex,
  hashPasswordArgon2id,
  verifyPasswordHash,
} from '../services/crypto/sha256FileHasher.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../middlewares/jwtAuth.js';

function buildAlias(email: string): string {
  const local = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '.')
    .replace(/\.+/g, '.')
    .slice(0, 24);
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${local}.${suffix}.vault@claimvault.app`;
}

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = RegisterSchema.parse(req.body);
    const existing = await UserModel.findOne({ email: input.email.toLowerCase() });
    if (existing) {
      throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
    }

    const userId = new mongoose.Types.ObjectId();
    const householdId = new mongoose.Types.ObjectId();
    const passwordHash = await hashPasswordArgon2id(input.password);

    const household = await HouseholdModel.create({
      _id: householdId,
      name: input.householdName ?? `${input.fullName.split(' ')[0]}'s Household Vault`,
      planTier: 'FREE',
      inboundForwardingAlias: buildAlias(input.email),
      defaultCurrency: input.defaultCurrency,
      members: [{ userId, role: 'OWNER', joinedAt: new Date() }],
    });

    const tokenPayload = {
      sub: userId.toString(),
      householdId: household._id.toString(),
      email: input.email.toLowerCase(),
    };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    let user;
    try {
      user = await UserModel.create({
        _id: userId,
        fullName: input.fullName,
        email: input.email.toLowerCase(),
        passwordHash,
        defaultCurrency: input.defaultCurrency,
        timezone: input.timezone,
        activeHouseholdId: household._id,
        refreshTokens: [
          {
            tokenHash: computeSha256Hex(refreshToken),
            expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000),
            deviceInfo: req.headers['user-agent']?.slice(0, 80) ?? 'Web Browser',
          },
        ],
      });
    } catch (createUserErr) {
      await HouseholdModel.deleteOne({ _id: household._id }).catch(() => undefined);
      throw createUserErr;
    }

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        _id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        defaultCurrency: user.defaultCurrency,
        timezone: user.timezone,
        activeHouseholdId: household._id.toString(),
      },
      household: {
        _id: household._id.toString(),
        name: household.name,
        planTier: household.planTier,
        inboundForwardingAlias: household.inboundForwardingAlias,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = LoginSchema.parse(req.body);
    const user = await UserModel.findOne({ email: input.email.toLowerCase() });
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const valid = await verifyPasswordHash(input.password, user.passwordHash);
    if (!valid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const household = await HouseholdModel.findById(user.activeHouseholdId);
    if (!household) {
      throw new AppError('Household not found', 404, 'HOUSEHOLD_MISSING');
    }

    const tokenPayload = {
      sub: user._id.toString(),
      householdId: household._id.toString(),
      email: user.email,
    };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    user.refreshTokens = [
      ...user.refreshTokens.filter((t) => t.expiresAt.getTime() > Date.now()).slice(-4),
      {
        tokenHash: computeSha256Hex(refreshToken),
        expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000),
        deviceInfo: req.headers['user-agent']?.slice(0, 80) ?? 'Web Browser',
      },
    ];
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: {
        _id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        defaultCurrency: user.defaultCurrency,
        timezone: user.timezone,
        activeHouseholdId: household._id.toString(),
      },
      household: {
        _id: household._id.toString(),
        name: household.name,
        planTier: household.planTier,
        inboundForwardingAlias: household.inboundForwardingAlias,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const incomingToken = String(req.body?.refreshToken ?? '').trim();
    if (!incomingToken) {
      throw new AppError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN');
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(incomingToken);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH');
    }

    const user = await UserModel.findById(decoded.sub);
    if (!user) {
      throw new AppError('Account not found', 401, 'UNAUTHORIZED');
    }

    const incomingHash = computeSha256Hex(incomingToken);
    const found = user.refreshTokens.find(
      (r) => r.tokenHash === incomingHash && r.expiresAt.getTime() > Date.now(),
    );
    if (!found) {
      throw new AppError('Refresh token revoked or expired', 401, 'REFRESH_REVOKED');
    }

    const payload = {
      sub: user._id.toString(),
      householdId: user.activeHouseholdId.toString(),
      email: user.email,
    };
    const newAccessToken = signAccessToken(payload);
    const newRefreshToken = signRefreshToken(payload);

    user.refreshTokens = [
      ...user.refreshTokens.filter(
        (r) => r.tokenHash !== incomingHash && r.expiresAt.getTime() > Date.now(),
      ),
      {
        tokenHash: computeSha256Hex(newRefreshToken),
        expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000),
        deviceInfo: found.deviceInfo,
      },
    ];
    await user.save();

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const incomingToken = String(req.body?.refreshToken ?? '').trim();
    if (incomingToken && req.auth) {
      const incomingHash = computeSha256Hex(incomingToken);
      await UserModel.updateOne(
        { _id: req.auth.userId },
        { $pull: { refreshTokens: { tokenHash: incomingHash } } },
      );
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) {
      throw new AppError('Not authenticated', 401, 'UNAUTHORIZED');
    }
    const household = await HouseholdModel.findById(req.auth.householdId).lean();
    res.json({
      user: {
        _id: req.auth.userId,
        fullName: req.auth.fullName,
        email: req.auth.email,
        isDemoWorkspace: req.auth.isDemoWorkspace,
        role: req.auth.role,
      },
      household: household
        ? {
            _id: household._id.toString(),
            name: household.name,
            planTier: household.planTier,
            inboundForwardingAlias: household.inboundForwardingAlias,
            defaultCurrency: household.defaultCurrency,
            memberCount: household.members.length,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
}
