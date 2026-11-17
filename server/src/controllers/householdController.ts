import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { HouseholdModel } from '../models/Household.js';
import { UserModel } from '../models/User.js';
import { AppError } from '../middlewares/errorHandler.js';

const AddMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['EDITOR', 'VIEWER']).default('EDITOR'),
});

export async function getHouseholdDetails(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    const household = await HouseholdModel.findById(req.auth.householdId).lean();
    if (!household) throw new AppError('Household not found', 404, 'NOT_FOUND');

    const memberIds = household.members.map((m) => m.userId);
    const users = await UserModel.find({ _id: { $in: memberIds } })
      .select('fullName email')
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    res.json({
      household: {
        _id: household._id.toString(),
        name: household.name,
        planTier: household.planTier,
        inboundForwardingAlias: household.inboundForwardingAlias,
        defaultCurrency: household.defaultCurrency,
        members: household.members.map((m) => {
          const u = userMap.get(m.userId.toString());
          return {
            userId: m.userId.toString(),
            fullName: u?.fullName ?? 'Member',
            email: u?.email ?? '',
            role: m.role,
            joinedAt: m.joinedAt,
          };
        }),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function addHouseholdMember(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    const input = AddMemberSchema.parse(req.body);

    const household = await HouseholdModel.findById(req.auth.householdId);
    if (!household) throw new AppError('Household not found', 404, 'NOT_FOUND');

    const invitedUser = await UserModel.findOne({ email: input.email.toLowerCase() });
    if (!invitedUser) {
      throw new AppError(
        'No registered ClaimVault user matches that email yet. Ask them to create an account first.',
        404,
        'USER_NOT_FOUND',
      );
    }

    const alreadyMember = household.members.some(
      (m) => m.userId.toString() === invitedUser._id.toString(),
    );
    if (alreadyMember) {
      throw new AppError('User is already a member of this household', 409, 'ALREADY_MEMBER');
    }

    household.members.push({
      userId: invitedUser._id,
      role: input.role,
      joinedAt: new Date(),
    });
    await household.save();

    res.status(201).json({
      ok: true,
      member: {
        userId: invitedUser._id.toString(),
        fullName: invitedUser.fullName,
        email: invitedUser.email,
        role: input.role,
      },
    });
  } catch (err) {
    next(err);
  }
}
