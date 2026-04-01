const { z } = require('zod');
const { supabasePrisma } = require('../database/prisma');
const { AppError } = require('../../../middleware/errorHandler');

const templateSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  appraisedById: z.string().uuid().optional().nullable(),
  appraisedSgd: z.boolean().optional(),
  appraisedTpd: z.boolean().optional(),
  appraisedDate: z.string().optional().nullable(),
  assessedById: z.string().uuid().optional().nullable(),
  assessedSgd: z.boolean().optional(),
  assessedTpd: z.boolean().optional(),
  assessedDate: z.string().optional().nullable(),
  recommendingById: z.string().uuid().optional().nullable(),
  recommendingSgd: z.boolean().optional(),
  recommendingTpd: z.boolean().optional(),
  recommendingDate: z.string().optional().nullable(),
  approvedById: z.string().uuid().optional().nullable(),
  approvedSgd: z.boolean().optional(),
  approvedTpd: z.boolean().optional(),
  approvedDate: z.string().optional().nullable(),
  provincialAssessorId: z.string().uuid().optional().nullable(),
  provincialAssessorSgd: z.boolean().optional(),
  provincialAssessorTpd: z.boolean().optional(),
  provincialAssessorDate: z.string().optional().nullable(),
  cityAssessorId: z.string().uuid().optional().nullable(),
  cityAssessorSgd: z.boolean().optional(),
  cityAssessorTpd: z.boolean().optional(),
  cityAssessorDate: z.string().optional().nullable(),
  deputyId: z.string().uuid().optional().nullable(),
  deputySgd: z.boolean().optional(),
  deputyTpd: z.boolean().optional(),
  deputyDate: z.string().optional().nullable(),
});

const includeSignatories = {
  appraisedBy: true,
  assessedBy: true,
  recommendingBy: true,
  approvedBy: true,
  provincialAssessor: true,
  cityAssessor: true,
  deputy: true
};

const listTemplates = async (req, res, next) => {
  try {
    const templates = await supabasePrisma.setupSignatoryTemplate.findMany({
      where: { deletedAt: null },
      include: includeSignatories,
      orderBy: { year: 'desc' },
    });

    res.json({ data: templates });
  } catch (error) {
    next(error);
  }
};

const getTemplateByYear = async (req, res, next) => {
  try {
    const year = parseInt(req.params.year, 10);
    if (Number.isNaN(year)) return next(new AppError('Invalid year', 400));

    const template = await supabasePrisma.setupSignatoryTemplate.findFirst({
      where: { year, deletedAt: null },
      include: includeSignatories,
    });

    if (!template) return next(new AppError('No template found for this year', 404));
    res.json({ data: template });
  } catch (error) {
    next(error);
  }
};

const createTemplate = async (req, res, next) => {
  try {
    const parsed = templateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.issues[0]?.message || 'Validation Error', 400));
    }

    const payload = parsed.data;
    const existing = await supabasePrisma.setupSignatoryTemplate.findFirst({
      where: { year: payload.year, deletedAt: null },
      select: { id: true },
    });
    if (existing) return next(new AppError(`Template for year ${payload.year} already exists`, 400));

    const template = await supabasePrisma.setupSignatoryTemplate.create({
      data: {
        year: payload.year,
        description: payload.description || null,
        isActive: payload.isActive ?? true,
        appraisedById: payload.appraisedById ?? null,
        appraisedSgd: payload.appraisedSgd ?? false,
        appraisedTpd: payload.appraisedTpd ?? false,
        appraisedDate: payload.appraisedDate ? new Date(payload.appraisedDate) : null,
        assessedById: payload.assessedById ?? null,
        assessedSgd: payload.assessedSgd ?? false,
        assessedTpd: payload.assessedTpd ?? false,
        assessedDate: payload.assessedDate ? new Date(payload.assessedDate) : null,
        recommendingById: payload.recommendingById ?? null,
        recommendingSgd: payload.recommendingSgd ?? false,
        recommendingTpd: payload.recommendingTpd ?? false,
        recommendingDate: payload.recommendingDate ? new Date(payload.recommendingDate) : null,
        approvedById: payload.approvedById ?? null,
        approvedSgd: payload.approvedSgd ?? false,
        approvedTpd: payload.approvedTpd ?? false,
        approvedDate: payload.approvedDate ? new Date(payload.approvedDate) : null,
        provincialAssessorId: payload.provincialAssessorId ?? null,
        provincialAssessorSgd: payload.provincialAssessorSgd ?? false,
        provincialAssessorTpd: payload.provincialAssessorTpd ?? false,
        provincialAssessorDate: payload.provincialAssessorDate ? new Date(payload.provincialAssessorDate) : null,
        cityAssessorId: payload.cityAssessorId ?? null,
        cityAssessorSgd: payload.cityAssessorSgd ?? false,
        cityAssessorTpd: payload.cityAssessorTpd ?? false,
        cityAssessorDate: payload.cityAssessorDate ? new Date(payload.cityAssessorDate) : null,
        deputyId: payload.deputyId ?? null,
        deputySgd: payload.deputySgd ?? false,
        deputyTpd: payload.deputyTpd ?? false,
        deputyDate: payload.deputyDate ? new Date(payload.deputyDate) : null,
        createdById: req.user?.id || null,
        updatedById: req.user?.id || null,
      },
      include: includeSignatories,
    });

    res.status(201).json({ data: template });
  } catch (error) {
    next(error);
  }
};

const updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = templateSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.issues[0]?.message || 'Validation Error', 400));
    }

    const existing = await supabasePrisma.setupSignatoryTemplate.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return next(new AppError('Template not found', 404));

    const payload = parsed.data;
    const updated = await supabasePrisma.setupSignatoryTemplate.update({
      where: { id },
      data: {
        ...(payload.year !== undefined ? { year: payload.year } : {}),
        ...(payload.description !== undefined ? { description: payload.description || null } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
        ...(payload.appraisedById !== undefined ? { appraisedById: payload.appraisedById ?? null } : {}),
        ...(payload.appraisedSgd !== undefined ? { appraisedSgd: payload.appraisedSgd } : {}),
        ...(payload.appraisedTpd !== undefined ? { appraisedTpd: payload.appraisedTpd } : {}),
        ...(payload.appraisedDate !== undefined ? { appraisedDate: payload.appraisedDate ? new Date(payload.appraisedDate) : null } : {}),
        ...(payload.assessedById !== undefined ? { assessedById: payload.assessedById ?? null } : {}),
        ...(payload.assessedSgd !== undefined ? { assessedSgd: payload.assessedSgd } : {}),
        ...(payload.assessedTpd !== undefined ? { assessedTpd: payload.assessedTpd } : {}),
        ...(payload.assessedDate !== undefined ? { assessedDate: payload.assessedDate ? new Date(payload.assessedDate) : null } : {}),
        ...(payload.recommendingById !== undefined ? { recommendingById: payload.recommendingById ?? null } : {}),
        ...(payload.recommendingSgd !== undefined ? { recommendingSgd: payload.recommendingSgd } : {}),
        ...(payload.recommendingTpd !== undefined ? { recommendingTpd: payload.recommendingTpd } : {}),
        ...(payload.recommendingDate !== undefined ? { recommendingDate: payload.recommendingDate ? new Date(payload.recommendingDate) : null } : {}),
        ...(payload.approvedById !== undefined ? { approvedById: payload.approvedById ?? null } : {}),
        ...(payload.approvedSgd !== undefined ? { approvedSgd: payload.approvedSgd } : {}),
        ...(payload.approvedTpd !== undefined ? { approvedTpd: payload.approvedTpd } : {}),
        ...(payload.approvedDate !== undefined ? { approvedDate: payload.approvedDate ? new Date(payload.approvedDate) : null } : {}),
        ...(payload.provincialAssessorId !== undefined ? { provincialAssessorId: payload.provincialAssessorId ?? null } : {}),
        ...(payload.provincialAssessorSgd !== undefined ? { provincialAssessorSgd: payload.provincialAssessorSgd } : {}),
        ...(payload.provincialAssessorTpd !== undefined ? { provincialAssessorTpd: payload.provincialAssessorTpd } : {}),
        ...(payload.provincialAssessorDate !== undefined ? { provincialAssessorDate: payload.provincialAssessorDate ? new Date(payload.provincialAssessorDate) : null } : {}),
        ...(payload.cityAssessorId !== undefined ? { cityAssessorId: payload.cityAssessorId ?? null } : {}),
        ...(payload.cityAssessorSgd !== undefined ? { cityAssessorSgd: payload.cityAssessorSgd } : {}),
        ...(payload.cityAssessorTpd !== undefined ? { cityAssessorTpd: payload.cityAssessorTpd } : {}),
        ...(payload.cityAssessorDate !== undefined ? { cityAssessorDate: payload.cityAssessorDate ? new Date(payload.cityAssessorDate) : null } : {}),
        ...(payload.deputyId !== undefined ? { deputyId: payload.deputyId ?? null } : {}),
        ...(payload.deputySgd !== undefined ? { deputySgd: payload.deputySgd } : {}),
        ...(payload.deputyTpd !== undefined ? { deputyTpd: payload.deputyTpd } : {}),
        ...(payload.deputyDate !== undefined ? { deputyDate: payload.deputyDate ? new Date(payload.deputyDate) : null } : {}),
        updatedById: req.user?.id || null,
      },
      include: includeSignatories,
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};

const deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await supabasePrisma.setupSignatoryTemplate.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return next(new AppError('Template not found', 404));

    await supabasePrisma.setupSignatoryTemplate.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: req.user?.id || null,
        updatedById: req.user?.id || null,
        isActive: false,
      },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listTemplates,
  getTemplateByYear,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
