const { mssqlPrisma, supabasePrisma } = require('../database/prisma');
const { AppError } = require('../../../middleware/errorHandler');
const logger = require('../../../utils/logger');

const getClient = (source) => {
  if (source === 'mssql') return mssqlPrisma;
  return supabasePrisma; // Default to Supabase
};

/**
 * Updates both a Task and an Item in a single transaction.
 * Ensures data consistency and atomic updates.
 */
exports.updateTaskAndItem = async (req, res, next) => {
  const startTime = Date.now();
  const { taskId, taskData, itemId, itemData, source } = req.body;

  // 1. Validation Checks
  if (!taskId || !itemId) {
    return next(new AppError('Both taskId and itemId are required for simultaneous update.', 400));
  }

  if (!taskData && !itemData) {
    return next(new AppError('At least one of taskData or itemData must be provided.', 400));
  }

  const client = getClient(source);
  const sourceName = source === 'mssql' ? 'MSSQL' : 'Supabase';

  logger.info(`Starting atomic update for Task ${taskId} and Item ${itemId} on ${sourceName}`);

  try {
    // 2. Transaction Execution
    // We use an interactive transaction to perform reads (validation) and writes atomically
    const result = await client.$transaction(async (tx) => {
      
      // A. Verify Task Existence
      const task = await tx.testTask.findUnique({
        where: { id: parseInt(taskId) }
      });

      if (!task) {
        throw new AppError(`Task with ID ${taskId} not found. Transaction aborted.`, 404);
      }

      // B. Verify Item Existence
      const item = await tx.item.findUnique({
        where: { id: parseInt(itemId) }
      });

      if (!item) {
        throw new AppError(`Item with ID ${itemId} not found. Transaction aborted.`, 404);
      }

      // C. Update Task (if data provided)
      let updatedTask = task;
      if (taskData) {
        // Sanitize update data (remove id, createdAt, etc. if present)
        const { id, createdAt, ...cleanTaskData } = taskData;
        
        updatedTask = await tx.testTask.update({
          where: { id: parseInt(taskId) },
          data: {
            ...cleanTaskData,
            updatedAt: new Date()
          }
        });
        logger.debug(`Task ${taskId} staged for update.`);
      }

      // D. Update Item (if data provided)
      let updatedItem = item;
      if (itemData) {
        // Sanitize update data
        const { id, createdAt, ...cleanItemData } = itemData;

        updatedItem = await tx.item.update({
          where: { id: parseInt(itemId) },
          data: {
            ...cleanItemData,
            updatedAt: new Date()
          }
        });
        logger.debug(`Item ${itemId} staged for update.`);
      }

      // If we reach here, both updates are successful in the transaction context
      return { task: updatedTask, item: updatedItem };
    });

    // 3. Success Response
    const duration = Date.now() - startTime;
    logger.info(`Successfully updated Task ${taskId} and Item ${itemId} in ${duration}ms.`);

    res.status(200).json({
      status: 'success',
      message: 'Simultaneous update completed successfully.',
      data: result
    });

  } catch (err) {
    // 4. Error Handling & Rollback (Implicit)
    // Prisma automatically rolls back the transaction if an error is thrown within the closure.
    
    logger.error(`Transaction failed for Task ${taskId} / Item ${itemId}. Rolling back changes. Reason: ${err.message}`);
    
    // Pass custom AppErrors through, wrap others
    if (err instanceof AppError) {
      return next(err);
    }
    
    // Return a generic 500 but with specific message about the transaction failure
    return next(new AppError(`Transaction failed: ${err.message}`, 500));
  }
};
