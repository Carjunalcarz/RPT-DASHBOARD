const { mssqlPrisma, supabasePrisma } = require('../database/prisma');
const { AppError } = require('../middleware/errorHandler');

const getClient = (source) => {
  // Always use Supabase unless explicitly requested otherwise (though MSSQL is also available)
  if (source === 'mssql') return mssqlPrisma;
  return supabasePrisma; // Default to Supabase
};

exports.createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate, source } = req.body;
    const client = getClient(source);

    const task = await client.testTask.create({
      data: {
        title,
        description,
        status: status || 'pending',
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });

    res.status(201).json({
      status: 'success',
      data: task
    });
  } catch (err) {
    next(err);
  }
};

exports.getTasks = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, priority, source } = req.query;
    const client = getClient(source);
    
    const where = {
      deletedAt: null // Soft delete filter
    };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [total, tasks] = await Promise.all([
      client.testTask.count({ where }),
      client.testTask.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    res.status(200).json({
      status: 'success',
      results: tasks.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: tasks
    });
  } catch (err) {
    next(err);
  }
};

exports.getTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { source } = req.query;
    const client = getClient(source);

    const task = await client.testTask.findFirst({
      where: {
        id: parseInt(id),
        deletedAt: null
      }
    });

    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: task
    });
  } catch (err) {
    next(err);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, dueDate } = req.body;
    const source = req.query.source || req.body.source;
    const client = getClient(source);

    // Check existence
    const existing = await client.testTask.findFirst({
      where: { id: parseInt(id), deletedAt: null }
    });

    if (!existing) {
      return next(new AppError('Task not found', 404));
    }

    const task = await client.testTask.update({
      where: { id: parseInt(id) },
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined
      }
    });

    res.status(200).json({
      status: 'success',
      data: task
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { source } = req.query;
    const client = getClient(source);

    // Check existence
    const existing = await client.testTask.findFirst({
      where: { id: parseInt(id), deletedAt: null }
    });

    if (!existing) {
      return next(new AppError('Task not found', 404));
    }

    // Soft delete
    await client.testTask.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() }
    });

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
};
