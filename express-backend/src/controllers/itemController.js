const { mssqlPrisma, supabasePrisma } = require('../database/prisma');
const { AppError } = require('../middleware/errorHandler');

const getClient = (source) => {
  if (source === 'mssql') return mssqlPrisma;
  return supabasePrisma; // Default to Supabase
};

exports.getAllItems = async (req, res, next) => {
  try {
    const { source } = req.query;
    let items = [];

    if (source) {
      const client = getClient(source);
      if (!client) throw new AppError('Invalid source', 400);
      items = await client.item.findMany();
    } else {
      // Query both
      const [mssqlItems, supabaseItems] = await Promise.all([
        mssqlPrisma.item.findMany(),
        supabasePrisma.item.findMany()
      ]);
      // Mark source
      items = [
        ...mssqlItems.map(i => ({ ...i, source: 'mssql' })),
        ...supabaseItems.map(i => ({ ...i, source: 'supabase' }))
      ];
    }

    res.status(200).json({
      status: 'success',
      results: items.length,
      data: items
    });
  } catch (err) {
    next(err);
  }
};

exports.createItem = async (req, res, next) => {
  try {
    const { name, description, source } = req.body;
    const client = getClient(source);
    
    if (!client) return next(new AppError('Source (mssql/supabase) is required', 400));

    const newItem = await client.item.create({
      data: {
        name,
        description
      }
    });

    res.status(201).json({
      status: 'success',
      data: newItem
    });
  } catch (err) {
    next(err);
  }
};

exports.getItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { source } = req.query;
    
    if (!source) return next(new AppError('Source query parameter is required to fetch specific item', 400));
    
    const client = getClient(source);
    if (!client) return next(new AppError('Invalid source', 400));

    const item = await client.item.findUnique({
      where: { id: parseInt(id) }
    });

    if (!item) {
      return next(new AppError('No item found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: item
    });
  } catch (err) {
    next(err);
  }
};

exports.updateItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, source } = req.body;
    
    // Source is needed to know which DB to update
    // Alternatively, we could search both, but that's inefficient.
    // Let's require source in body or query.
    // For update, typically ID is unique enough, but here IDs might collide between DBs (both autoincrement int).
    // So source is mandatory.
    
    const targetSource = source || req.query.source;
    if (!targetSource) return next(new AppError('Source is required for update', 400));

    const client = getClient(targetSource);
    if (!client) return next(new AppError('Invalid source', 400));

    const updatedItem = await client.item.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description
      }
    });

    res.status(200).json({
      status: 'success',
      data: updatedItem
    });
  } catch (err) {
    if (err.code === 'P2025') { // Prisma Record Not Found
       return next(new AppError('No item found with that ID', 404));
    }
    next(err);
  }
};

exports.deleteItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { source } = req.query; // Require source to identify item

    if (!source) return next(new AppError('Source is required for delete', 400));
    
    const client = getClient(source);
    if (!client) return next(new AppError('Invalid source', 400));

    await client.item.delete({
      where: { id: parseInt(id) }
    });

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    if (err.code === 'P2025') {
       return next(new AppError('No item found with that ID', 404));
    }
    next(err);
  }
};
