import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../types';
import { sendWarrantyConfirmation } from '../services/notification';
import { logger } from '../utils/logger';

// ─── REGISTRATIONS ───────────────────────────────────────────

export async function listRegistrations(req: AuthenticatedRequest, res: Response): Promise<void> {
  const query = (req as any).validatedQuery || req.query;
  const { page = 1, limit = 20, status, modelId, sourceId, dateFrom, dateTo, search, sortOrder = 'desc' } = query;

  const where: Prisma.ProductRegistrationWhereInput = {};

  if (status) where.registrationStatus = status;
  if (modelId) where.mattressModelId = modelId;
  if (sourceId) where.purchaseSourceId = sourceId;
  if (dateFrom || dateTo) {
    where.purchaseDate = {};
    if (dateFrom) where.purchaseDate.gte = new Date(dateFrom);
    if (dateTo) where.purchaseDate.lte = new Date(dateTo);
  }
  if (search) {
    where.OR = [
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { user: { phone: { contains: search } } },
      { user: { firstName: { contains: search, mode: 'insensitive' } } },
      { user: { lastName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [registrations, total] = await Promise.all([
    prisma.productRegistration.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, phone: true, firstName: true, lastName: true } },
        mattressModel: { select: { name: true } },
        purchaseSource: { select: { name: true, type: true } },
        warranty: { select: { status: true, startDate: true, endDate: true } },
        photos: { select: { id: true, type: true, sha256Hash: true } },
        _count: { select: { adminNotes: true } },
      },
      orderBy: { createdAt: sortOrder },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.productRegistration.count({ where }),
  ]);

  res.json({
    success: true,
    data: registrations,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}

export async function getRegistrationDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const registration = await prisma.productRegistration.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, phone: true, firstName: true, lastName: true, createdAt: true } },
      mattressModel: true,
      purchaseSource: true,
      warranty: true,
      photos: true,
      adminNotes: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!registration) {
    res.status(404).json({ success: false, error: 'Registration not found' });
    return;
  }

  res.json({ success: true, data: registration });
}

export async function updateRegistrationStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { status, reason } = req.body;
  const adminId = req.user!.userId;

  const registration = await prisma.productRegistration.findUnique({
    where: { id },
    include: {
      warranty: true,
      mattressModel: true,
      user: { select: { email: true } },
    },
  });

  if (!registration) {
    res.status(404).json({ success: false, error: 'Registration not found' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Update registration status
    await tx.productRegistration.update({
      where: { id },
      data: {
        registrationStatus: status,
        rejectionReason: status === 'REJECTED' ? reason : null,
      },
    });

    // Update warranty status based on approval
    if (status === 'APPROVED' && registration.warranty) {
      await tx.warranty.update({
        where: { id: registration.warranty.id },
        data: {
          status: 'ACTIVE',
          activatedAt: new Date(),
        },
      });

      // Send confirmation email
      if (registration.user.email && registration.warranty.startDate && registration.warranty.endDate) {
        await sendWarrantyConfirmation(registration.user.email, {
          modelName: registration.mattressModel.name,
          startDate: registration.warranty.startDate.toISOString().split('T')[0],
          endDate: registration.warranty.endDate.toISOString().split('T')[0],
        });
      }
    } else if (status === 'REJECTED' && registration.warranty) {
      await tx.warranty.update({
        where: { id: registration.warranty.id },
        data: { status: 'VOIDED' },
      });
    }

    // Add admin note
    if (reason) {
      await tx.adminNote.create({
        data: {
          adminId,
          productRegistrationId: id,
          content: `Status changed to ${status}. Reason: ${reason}`,
        },
      });
    }
  });

  logger.info('Registration status updated', { registrationId: id, status, adminId });

  res.json({ success: true, message: `Registration ${status.toLowerCase()}` });
}

export async function addRegistrationNote(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { content } = req.body;
  const adminId = req.user!.userId;

  const registration = await prisma.productRegistration.findUnique({ where: { id } });
  if (!registration) {
    res.status(404).json({ success: false, error: 'Registration not found' });
    return;
  }

  const note = await prisma.adminNote.create({
    data: {
      adminId,
      productRegistrationId: id,
      content,
    },
  });

  res.status(201).json({ success: true, data: note });
}

// ─── FRAUD DETECTION ─────────────────────────────────────────

export async function getDuplicates(_req: AuthenticatedRequest, res: Response): Promise<void> {
  // Find photos with duplicate SHA256 hashes across different registrations
  const duplicates = await prisma.$queryRaw`
    SELECT
      rp."sha256_hash" as hash,
      COUNT(DISTINCT rp."product_registration_id") as registration_count,
      ARRAY_AGG(DISTINCT rp."product_registration_id") as registration_ids
    FROM registration_photos rp
    WHERE rp."sha256_hash" IS NOT NULL
    GROUP BY rp."sha256_hash"
    HAVING COUNT(DISTINCT rp."product_registration_id") > 1
    ORDER BY registration_count DESC
    LIMIT 50
  `;

  res.json({ success: true, data: duplicates });
}

// ─── SUPPORT TICKETS (ADMIN) ─────────────────────────────────

export async function listAllTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
  const query = (req as any).validatedQuery || req.query;
  const { page = 1, limit = 20, status, priority, tag, search, sortOrder = 'desc' } = query;

  const where: Prisma.SupportTicketWhereInput = {};

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (tag) where.tags = { has: tag };
  if (search) {
    where.OR = [
      { subject: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { user: { firstName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, phone: true, firstName: true, lastName: true } },
        _count: { select: { messages: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { senderType: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: sortOrder },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.supportTicket.count({ where }),
  ]);

  res.json({
    success: true,
    data: tickets,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}

export async function getTicketDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, phone: true, firstName: true, lastName: true } },
      messages: {
        include: {
          attachments: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      adminNotes: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!ticket) {
    res.status(404).json({ success: false, error: 'Ticket not found' });
    return;
  }

  res.json({ success: true, data: ticket });
}

export async function adminReplyTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
  const adminId = req.user!.userId;
  const { id } = req.params;
  const { body } = req.body;

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) {
    res.status(404).json({ success: false, error: 'Ticket not found' });
    return;
  }

  const message = await prisma.$transaction(async (tx) => {
    const msg = await tx.ticketMessage.create({
      data: {
        ticketId: id,
        senderType: 'admin',
        senderId: adminId,
        body,
      },
    });

    // Auto-set to IN_PROGRESS if OPEN
    if (ticket.status === 'OPEN') {
      await tx.supportTicket.update({
        where: { id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return msg;
  });

  res.status(201).json({ success: true, data: { messageId: message.id } });
}

export async function updateTicketStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { status } = req.body;

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) {
    res.status(404).json({ success: false, error: 'Ticket not found' });
    return;
  }

  await prisma.supportTicket.update({
    where: { id },
    data: {
      status,
      closedAt: (status === 'RESOLVED' || status === 'CLOSED') ? new Date() : null,
    },
  });

  res.json({ success: true, message: `Ticket status updated to ${status}` });
}

export async function updateTicketTags(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { tags } = req.body;

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) {
    res.status(404).json({ success: false, error: 'Ticket not found' });
    return;
  }

  await prisma.supportTicket.update({
    where: { id },
    data: { tags },
  });

  res.json({ success: true, message: 'Tags updated' });
}

// ─── STATS ───────────────────────────────────────────────────

export async function getStats(_req: AuthenticatedRequest, res: Response): Promise<void> {
  const [
    totalUsers,
    totalRegistrations,
    pendingRegistrations,
    activeWarranties,
    openTickets,
    registrationsByMonth,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CUSTOMER', deletedAt: null } }),
    prisma.productRegistration.count(),
    prisma.productRegistration.count({ where: { registrationStatus: 'PENDING_REVIEW' } }),
    prisma.warranty.count({ where: { status: 'ACTIVE' } }),
    prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*)::int as count
      FROM product_registrations
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `,
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      totalRegistrations,
      pendingRegistrations,
      activeWarranties,
      openTickets,
      registrationsByMonth,
    },
  });
}

// ─── USERS (ADMIN) ──────────────────────────────────────────

export async function listUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  const query = (req as any).validatedQuery || req.query;
  const { page = 1, limit = 20 } = query;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'CUSTOMER', deletedAt: null },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: {
            productRegistrations: true,
            supportTickets: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.user.count({ where: { role: 'CUSTOMER', deletedAt: null } }),
  ]);

  res.json({
    success: true,
    data: users,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}

export async function getUserDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      isVerified: true,
      createdAt: true,
      productRegistrations: {
        include: {
          mattressModel: { select: { name: true } },
          warranty: { select: { status: true, startDate: true, endDate: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      supportTickets: {
        select: { id: true, subject: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  res.json({ success: true, data: user });
}
