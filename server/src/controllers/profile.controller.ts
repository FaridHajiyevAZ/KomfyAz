import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../types';

export async function getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      role: true,
      isVerified: true,
      createdAt: true,
      _count: {
        select: {
          productRegistrations: true,
          supportTickets: true,
        },
      },
    },
  });

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  res.json({ success: true, data: user });
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { firstName, lastName, email, phone } = req.body;

  // Check for uniqueness if changing email or phone
  if (email) {
    const existing = await prisma.user.findFirst({
      where: { email, id: { not: userId } },
    });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already in use' });
      return;
    }
  }

  if (phone) {
    const existing = await prisma.user.findFirst({
      where: { phone, id: { not: userId } },
    });
    if (existing) {
      res.status(409).json({ success: false, error: 'Phone number already in use' });
      return;
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
    },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
    },
  });

  res.json({ success: true, data: updated });
}
