import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

export async function createTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { subject, body } = req.body;

  // Verify customer has at least one registered product
  const hasProduct = await prisma.productRegistration.findFirst({
    where: { userId },
  });

  if (!hasProduct) {
    res.status(400).json({
      success: false,
      error: 'You must register at least one product before creating a support ticket',
    });
    return;
  }

  const ticket = await prisma.$transaction(async (tx) => {
    const t = await tx.supportTicket.create({
      data: {
        userId,
        subject,
        status: 'OPEN',
      },
    });

    await tx.ticketMessage.create({
      data: {
        ticketId: t.id,
        senderType: 'customer',
        senderId: userId,
        body,
      },
    });

    return t;
  });

  logger.info('Support ticket created', { userId, ticketId: ticket.id });

  res.status(201).json({
    success: true,
    data: { ticketId: ticket.id },
  });
}

export async function listTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const tickets = await prisma.supportTicket.findMany({
    where: { userId },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { body: true, senderType: true, createdAt: true },
      },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({ success: true, data: tickets });
}

export async function getTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { id } = req.params;

  const ticket = await prisma.supportTicket.findFirst({
    where: { id, userId },
    include: {
      messages: {
        include: {
          attachments: {
            select: { id: true, originalFilename: true, mimeType: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!ticket) {
    res.status(404).json({ success: false, error: 'Ticket not found' });
    return;
  }

  res.json({ success: true, data: ticket });
}

export async function sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { id } = req.params;
  const { body } = req.body;
  const files = req.files as Express.Multer.File[] | undefined;

  const ticket = await prisma.supportTicket.findFirst({
    where: { id, userId },
  });

  if (!ticket) {
    res.status(404).json({ success: false, error: 'Ticket not found' });
    return;
  }

  // Check if ticket is closed and older than 30 days
  if (ticket.status === 'RESOLVED' && ticket.closedAt) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (ticket.closedAt < thirtyDaysAgo) {
      res.status(400).json({ success: false, error: 'This ticket is closed and can no longer receive messages' });
      return;
    }
  }

  if (ticket.status === 'CLOSED') {
    res.status(400).json({ success: false, error: 'This ticket is closed' });
    return;
  }

  const message = await prisma.$transaction(async (tx) => {
    const msg = await tx.ticketMessage.create({
      data: {
        ticketId: id,
        senderType: 'customer',
        senderId: userId,
        body,
      },
    });

    if (files && files.length > 0) {
      for (const file of files) {
        await tx.ticketAttachment.create({
          data: {
            messageId: msg.id,
            originalFilename: file.originalname,
            storagePath: file.path,
            mimeType: file.mimetype,
            fileSize: file.size,
          },
        });
      }
    }

    // Reopen ticket if it was resolved
    if (ticket.status === 'RESOLVED') {
      await tx.supportTicket.update({
        where: { id },
        data: { status: 'OPEN', closedAt: null },
      });
    }

    return msg;
  });

  res.status(201).json({
    success: true,
    data: { messageId: message.id },
  });
}
