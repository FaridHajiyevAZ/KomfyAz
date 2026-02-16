import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../types';

export async function getWarranty(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { registrationId } = req.params;

  const registration = await prisma.productRegistration.findFirst({
    where: { id: registrationId, userId },
    include: {
      warranty: true,
      mattressModel: { select: { name: true, warrantyMonths: true } },
    },
  });

  if (!registration) {
    res.status(404).json({ success: false, error: 'Registration not found' });
    return;
  }

  if (!registration.warranty) {
    res.status(404).json({ success: false, error: 'Warranty record not found' });
    return;
  }

  const warranty = registration.warranty;
  const now = new Date();
  const isExpired = warranty.endDate && warranty.status === 'ACTIVE' && warranty.endDate < now;

  res.json({
    success: true,
    data: {
      id: warranty.id,
      status: isExpired ? 'EXPIRED' : warranty.status,
      startDate: warranty.startDate,
      endDate: warranty.endDate,
      activatedAt: warranty.activatedAt,
      modelName: registration.mattressModel.name,
      warrantyMonths: registration.mattressModel.warrantyMonths,
      daysRemaining: warranty.endDate && warranty.status === 'ACTIVE'
        ? Math.max(0, Math.ceil((warranty.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 0,
    },
  });
}
