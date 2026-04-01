const { z } = require('zod');
const { supabasePrisma } = require('../database/prisma');
const { AppError } = require('../../../middleware/errorHandler');

const createSchema = z.object({
  name: z.string().trim().min(2).max(200),
  title: z.string().trim().min(2).max(200),
  department: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  phone: z.string().trim().max(50).optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});

const updateSchema = createSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'At least one field must be provided',
});

const parsePagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const department = typeof req.query.department === 'string' ? req.query.department.trim() : '';
    const isActive = typeof req.query.isActive === 'string' ? req.query.isActive.trim() : '';

    const where = {
      deletedAt: null,
    };

    if (department) {
      where.department = { equals: department, mode: 'insensitive' };
    }

    if (isActive !== '') {
      where.isActive = isActive.toLowerCase() === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      supabasePrisma.setupSignatory.count({ where }),
      supabasePrisma.setupSignatory.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    res.json({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await supabasePrisma.setupSignatory.findFirst({
      where: { id, deletedAt: null },
    });
    if (!record) return next(new AppError('Signatory not found', 404));
    res.json({ data: record });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.issues[0]?.message || 'Validation Error', 400));
    }

    const payload = parsed.data;
    const record = await supabasePrisma.setupSignatory.create({
      data: {
        name: payload.name,
        title: payload.title,
        department: payload.department,
        email: payload.email || null,
        phone: payload.phone || null,
        isActive: payload.isActive ?? true,
        createdById: req.user?.id || null,
        updatedById: req.user?.id || null,
      },
    });

    res.status(201).json({ data: record });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.issues[0]?.message || 'Validation Error', 400));
    }

    const existing = await supabasePrisma.setupSignatory.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return next(new AppError('Signatory not found', 404));

    const payload = parsed.data;
    const record = await supabasePrisma.setupSignatory.update({
      where: { id },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.department !== undefined ? { department: payload.department } : {}),
        ...(payload.email !== undefined ? { email: payload.email || null } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone || null } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
        updatedById: req.user?.id || null,
      },
    });

    res.json({ data: record });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await supabasePrisma.setupSignatory.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return next(new AppError('Signatory not found', 404));

    await supabasePrisma.setupSignatory.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: req.user?.id || null,
        updatedById: req.user?.id || null,
      },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};

