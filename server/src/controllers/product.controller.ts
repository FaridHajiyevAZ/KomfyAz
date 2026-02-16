import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../types';
import { sha256File } from '../utils/hash';
import { logger } from '../utils/logger';

export async function listModels(_req: Request, res: Response): Promise<void> {
  const models = await prisma.mattressModel.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      warrantyMonths: true,
    },
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, data: models });
}

export async function listSources(_req: Request, res: Response): Promise<void> {
  const sources = await prisma.purchaseSource.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      type: true,
    },
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, data: sources });
}

export async function registerProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { mattressModelId, purchaseSourceId, purchaseDate, receivedUndamaged, infoAccurate } = req.body;
  const files = req.files as Express.Multer.File[] | undefined;

  // Validate mattress model exists
  const model = await prisma.mattressModel.findUnique({ where: { id: mattressModelId } });
  if (!model || !model.isActive) {
    res.status(400).json({ success: false, error: 'Invalid mattress model' });
    return;
  }

  // Validate purchase source exists
  const source = await prisma.purchaseSource.findUnique({ where: { id: purchaseSourceId } });
  if (!source || !source.isActive) {
    res.status(400).json({ success: false, error: 'Invalid purchase source' });
    return;
  }

  // Validate purchase date against model release date
  const purchaseDateObj = new Date(purchaseDate);
  if (model.releasedAt && purchaseDateObj < model.releasedAt) {
    res.status(400).json({ success: false, error: 'Purchase date cannot be before the model release date' });
    return;
  }

  // Validate minimum photo requirements
  if (!files || files.length < 2) {
    res.status(400).json({ success: false, error: 'At least 2 photos required (label + invoice)' });
    return;
  }

  // Check for duplicate invoice photos (fraud detection)
  const fileHashes: string[] = [];
  for (const file of files) {
    const hash = await sha256File(file.path);
    fileHashes.push(hash);

    const duplicate = await prisma.registrationPhoto.findFirst({
      where: { sha256Hash: hash },
      include: { productRegistration: true },
    });

    if (duplicate) {
      logger.warn('Duplicate photo detected', {
        userId,
        hash,
        existingRegistrationId: duplicate.productRegistrationId,
      });
      // Flag but don't block — admin will review
    }
  }

  // Create registration with warranty and photos in a transaction
  const registration = await prisma.$transaction(async (tx) => {
    const reg = await tx.productRegistration.create({
      data: {
        userId,
        mattressModelId,
        purchaseSourceId,
        purchaseDate: purchaseDateObj,
        receivedUndamaged,
        infoAccurate,
        registrationStatus: 'PENDING_REVIEW',
      },
    });

    // Create warranty record (pending)
    await tx.warranty.create({
      data: {
        productRegistrationId: reg.id,
        status: 'PENDING',
        startDate: purchaseDateObj,
        endDate: new Date(
          purchaseDateObj.getFullYear(),
          purchaseDateObj.getMonth() + model.warrantyMonths,
          purchaseDateObj.getDate()
        ),
      },
    });

    // Save photo records
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await tx.registrationPhoto.create({
        data: {
          productRegistrationId: reg.id,
          type: i === 0 ? 'LABEL' : i === 1 ? 'INVOICE' : 'ADDITIONAL',
          originalFilename: file.originalname,
          storagePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          sha256Hash: fileHashes[i],
        },
      });
    }

    return reg;
  });

  logger.info('Product registered', { userId, registrationId: registration.id });

  res.status(201).json({
    success: true,
    message: 'Product registered successfully. Your warranty is pending review.',
    data: { registrationId: registration.id },
  });
}

export async function getMyProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const products = await prisma.productRegistration.findMany({
    where: { userId },
    include: {
      mattressModel: { select: { name: true, slug: true, warrantyMonths: true } },
      purchaseSource: { select: { name: true, type: true } },
      warranty: { select: { status: true, startDate: true, endDate: true, activatedAt: true } },
      photos: { select: { id: true, type: true, originalFilename: true, createdAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: products });
}

export async function getProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { id } = req.params;

  const product = await prisma.productRegistration.findFirst({
    where: { id, userId },
    include: {
      mattressModel: true,
      purchaseSource: true,
      warranty: true,
      photos: true,
    },
  });

  if (!product) {
    res.status(404).json({ success: false, error: 'Product registration not found' });
    return;
  }

  res.json({ success: true, data: product });
}

export async function addPhotos(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { id } = req.params;
  const files = req.files as Express.Multer.File[] | undefined;

  const registration = await prisma.productRegistration.findFirst({
    where: { id, userId },
  });

  if (!registration) {
    res.status(404).json({ success: false, error: 'Product registration not found' });
    return;
  }

  if (registration.registrationStatus !== 'INFO_REQUESTED' && registration.registrationStatus !== 'PENDING_REVIEW') {
    res.status(400).json({ success: false, error: 'Cannot add photos to this registration' });
    return;
  }

  if (!files || files.length === 0) {
    res.status(400).json({ success: false, error: 'No files provided' });
    return;
  }

  for (const file of files) {
    const hash = await sha256File(file.path);
    await prisma.registrationPhoto.create({
      data: {
        productRegistrationId: id,
        type: 'ADDITIONAL',
        originalFilename: file.originalname,
        storagePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        sha256Hash: hash,
      },
    });
  }

  // If info was requested, move back to pending review
  if (registration.registrationStatus === 'INFO_REQUESTED') {
    await prisma.productRegistration.update({
      where: { id },
      data: { registrationStatus: 'PENDING_REVIEW' },
    });
  }

  res.json({ success: true, message: 'Photos added successfully' });
}
