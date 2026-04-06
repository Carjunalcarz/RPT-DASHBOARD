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

const files = walk('d:/RPT-DASHBOARD/RPT-DASHBOARD/rptas-standalone')
  .filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let changed = false;
  if (c.includes('useAuth')) {
    c = c.replace(/import\s+\{\s*useAuth\s*\}\s+from\s+['"].*AuthContext['"];/g, 'import { useRPTASContext } from \'@/modules/rptas/providers/RPTASProvider\';');
    c = c.replace(/useAuth\(\)/g, 'useRPTASContext()');
    changed = true;
  }
  if (c.includes('usePermissions')) {
    c = c.replace(/import\s+\{\s*usePermissions\s*\}\s+from\s+['"].*usePermissions['"];/g, '');
    c = c.replace(/const\s+\{\s*hasPermission\s*\}\s*=\s*usePermissions\(\);/g, '');
    c = c.replace(/hasPermission\([^)]+\)/g, 'true');
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(f, c);
    console.log('Fixed', f);
  }
});
