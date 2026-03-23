const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function createSidebarTable() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DIRECT_URL || process.env.SUPABASE_DB_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const sql = `
      CREATE TABLE IF NOT EXISTS sidebar_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        label TEXT NOT NULL,
        path TEXT NOT NULL,
        icon TEXT,
        parent_id UUID REFERENCES sidebar_items(id),
        "order" INTEGER DEFAULT 0,
        admin_only BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Add updated_at trigger if not exists
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_sidebar_items_updated_at ON sidebar_items;
      CREATE TRIGGER update_sidebar_items_updated_at
          BEFORE UPDATE ON sidebar_items
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `;

    await client.query(sql);
    console.log('Sidebar items table created successfully');

    // Seed initial data
    console.log('Seeding initial data...');
    const initialItems = [
      { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', "order": 1 },
      { label: 'Property Records', path: '/properties', icon: 'Building2', "order": 2 },
      { label: 'Tax Assessment', path: '/assessment', icon: 'FileText', "order": 3 },
      { label: 'Payments', path: '/payments', icon: 'CreditCard', "order": 4 },
      { label: 'Reports', path: '/reports', icon: 'BarChart3', "order": 5 },
      { label: 'Data Entry (Legacy)', path: '/data-entry', icon: 'ClipboardEdit', "order": 6 },
      { label: 'RPT Management', path: '/rpt-management', icon: 'Database', "order": 7 },
      { label: 'Items', path: '/items', icon: 'Package', "order": 8 },
      { label: 'Tasks', path: '/tasks', icon: 'CheckSquare', "order": 9 },
      { label: 'Audit Trail', path: '/audit-trail', icon: 'FileClock', "order": 10 },
      { label: 'User Management', path: '/admin/users', icon: 'UserCog', "order": 11, admin_only: false },
      { label: 'Settings', path: '/settings', icon: 'Settings', "order": 12 },
      { label: 'Sidebar Management', path: '/admin/sidebar', icon: 'Menu', "order": 13, admin_only: true },
    ];

    const parents = [
      { label: 'Approving Parent', path: '#', icon: 'CheckCircle', "order": 14 },
      { label: 'Setup', path: '#', icon: 'Settings2', "order": 15 },
    ];

    // Clear existing
    await client.query('DELETE FROM sidebar_items');

    // Insert simple items
    for (const item of initialItems) {
      await client.query(
        'INSERT INTO sidebar_items (label, path, icon, "order", admin_only) VALUES ($1, $2, $3, $4, $5)',
        [item.label, item.path, item.icon, item.order, !!item.admin_only]
      );
    }

    // Insert parents and children
    for (const parent of parents) {
      const res = await client.query(
        'INSERT INTO sidebar_items (label, path, icon, "order") VALUES ($1, $2, $3, $4) RETURNING id',
        [parent.label, parent.path, parent.icon, parent.order]
      );
      const parentId = res.rows[0].id;
      
      if (parent.label === 'Approving Parent') {
        await client.query(
          'INSERT INTO sidebar_items (label, path, parent_id, "order") VALUES ($1, $2, $3, $4)',
          ['Municipality', '/approvals/municipal', parentId, 1]
        );
        await client.query(
          'INSERT INTO sidebar_items (label, path, parent_id, "order") VALUES ($1, $2, $3, $4)',
          ['Province', '/approvals/provincial', parentId, 2]
        );
      } else if (parent.label === 'Setup') {
        await client.query(
          'INSERT INTO sidebar_items (label, path, parent_id, "order") VALUES ($1, $2, $3, $4)',
          ['Setup_Signatory', '/setup/signatory', parentId, 1]
        );
      }
    }
    console.log('Seeding completed successfully');

  } catch (err) {
    console.error('Error creating sidebar items table:', err);
  } finally {
    await client.end();
  }
}

createSidebarTable();
