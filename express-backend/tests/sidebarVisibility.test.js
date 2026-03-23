var mockSupabasePrisma = {
  sidebarItem: {
    findMany: jest.fn(),
  },
  $queryRawUnsafe: jest.fn(),
};

jest.mock('../src/database/prisma', () => ({ supabasePrisma: mockSupabasePrisma }));

const sidebarController = require('../src/controllers/sidebarController');

describe('sidebar visibility filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabasePrisma.$queryRawUnsafe.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes('information_schema.tables') && s.includes('sidebar_item_user_visibility')) {
        return [{ 1: 1 }];
      }
      return [];
    });
  });

  const makeRes = () => {
    const res = {};
    res.json = jest.fn();
    res.status = jest.fn(() => res);
    return res;
  };

  it('filters by allowlist and adminOnly for non-admin user', async () => {
    mockSupabasePrisma.sidebarItem.findMany.mockResolvedValue([
      {
        id: 'root-1',
        label: 'Everyone',
        path: '/a',
        icon: null,
        parentId: null,
        order: 1,
        adminOnly: false,
        isActive: true,
        children: [],
      },
      {
        id: 'root-2',
        label: 'Allowlisted (not me)',
        path: '/b',
        icon: null,
        parentId: null,
        order: 2,
        adminOnly: false,
        isActive: true,
        children: [],
      },
      {
        id: 'root-3',
        label: 'Allowlisted (me)',
        path: '/c',
        icon: null,
        parentId: null,
        order: 3,
        adminOnly: false,
        isActive: true,
        children: [],
      },
      {
        id: 'root-4',
        label: 'Admin only',
        path: '/d',
        icon: null,
        parentId: null,
        order: 4,
        adminOnly: true,
        isActive: true,
        children: [],
      },
    ]);
    mockSupabasePrisma.$queryRawUnsafe.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes('information_schema.tables') && s.includes('sidebar_item_user_visibility')) {
        return [{ 1: 1 }];
      }
      if (s.includes('FROM public.sidebar_item_user_visibility')) {
        return [
          { sidebarItemId: 'root-2', userId: 'u2' },
          { sidebarItemId: 'root-2', userId: 'u3' },
          { sidebarItemId: 'root-3', userId: 'u1' },
          { sidebarItemId: 'root-3', userId: 'u9' },
        ];
      }
      return [];
    });

    const req = { user: { id: 'u1', role: 'user' } };
    const res = makeRes();
    const next = jest.fn();

    await sidebarController.getAllSidebarItems(req, res, next);

    expect(next).not.toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.map((i) => i.id)).toEqual(['root-1', 'root-3']);
  });

  it('includes parent as group when only child is visible', async () => {
    mockSupabasePrisma.sidebarItem.findMany.mockResolvedValue([
      {
        id: 'p',
        label: 'Parent',
        path: '/parent',
        icon: null,
        parentId: null,
        order: 1,
        adminOnly: false,
        isActive: true,
        children: [
          {
            id: 'c',
            label: 'Child',
            path: '/child',
            icon: null,
            parentId: 'p',
            order: 1,
            adminOnly: false,
            isActive: true,
            children: [],
          },
        ],
      },
    ]);
    mockSupabasePrisma.$queryRawUnsafe.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes('information_schema.tables') && s.includes('sidebar_item_user_visibility')) {
        return [{ 1: 1 }];
      }
      if (s.includes('FROM public.sidebar_item_user_visibility')) {
        return [
          { sidebarItemId: 'p', userId: 'u9' },
          { sidebarItemId: 'c', userId: 'u1' },
        ];
      }
      return [];
    });

    const req = { user: { id: 'u1', role: 'user' } };
    const res = makeRes();
    const next = jest.fn();

    await sidebarController.getAllSidebarItems(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].id).toBe('p');
    expect(payload.data[0].path).toBe('#');
    expect(payload.data[0].children).toHaveLength(1);
    expect(payload.data[0].children[0].id).toBe('c');
    expect(payload.data[0].children[0].path).toBe('/child');
  });

  it('admin sees adminOnly and allowlisted items', async () => {
    mockSupabasePrisma.sidebarItem.findMany.mockResolvedValue([
      {
        id: 'root-2',
        label: 'Allowlisted',
        path: '/b',
        icon: null,
        parentId: null,
        order: 2,
        adminOnly: false,
        isActive: true,
        children: [],
      },
      {
        id: 'root-4',
        label: 'Admin only',
        path: '/d',
        icon: null,
        parentId: null,
        order: 4,
        adminOnly: true,
        isActive: true,
        children: [],
      },
    ]);
    mockSupabasePrisma.$queryRawUnsafe.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes('information_schema.tables') && s.includes('sidebar_item_user_visibility')) {
        return [{ 1: 1 }];
      }
      if (s.includes('FROM public.sidebar_item_user_visibility')) {
        return [
          { sidebarItemId: 'root-2', userId: 'u2' },
          { sidebarItemId: 'root-2', userId: 'u3' },
        ];
      }
      return [];
    });

    const req = { user: { id: 'admin-1', role: 'administrator' } };
    const res = makeRes();
    const next = jest.fn();

    await sidebarController.getAllSidebarItems(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.data.map((i) => i.id)).toEqual(['root-2', 'root-4']);
  });
});
