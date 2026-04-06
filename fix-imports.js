const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

const files = walk('d:/RPT-DASHBOARD/RPT-DASHBOARD/standalone-dashboard/src')
  .filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let changed = false;

  // Replace contexts
  if (c.includes('useAlert') && c.includes('AlertContext')) {
    c = c.replace(/import\s+.*?useAlert.*?\s+from\s+['"].*?AlertContext['"];/g, "import { useAlert } from '@/context/AlertContext';");
    changed = true;
  }
  if (c.includes('ThemeColorContext')) {
    c = c.replace(/import\s+.*?ThemeColorContext.*?\s+from\s+['"].*?ThemeColorContext['"];/g, "import { useThemeColor } from '@/context/ThemeColorContext';");
    changed = true;
  }
  
  // Replace api
  if (c.includes('/services/api')) {
    c = c.replace(/import\s+.*?api.*?\s+from\s+['"].*?\/services\/api['"];/g, "import api from '@/services/api';");
    changed = true;
  }

  // Replace table toolbar
  if (c.includes('TableToolbar') && c.includes('RPT-management')) {
    c = c.replace(/import\s+.*?TableToolbar.*?\s+from\s+['"].*?TableToolbar['"];/g, "import { TableToolbar } from '@/components/RPT-management/rpt_m_TableToolbar';");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(f, c);
    console.log('Fixed', f);
  }
});