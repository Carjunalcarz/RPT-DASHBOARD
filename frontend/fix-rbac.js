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

const files = walk('d:/RPT-DASHBOARD/RPT-DASHBOARD/frontend/src/modules/rptas-standalone')
  .filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let changed = false;

  // Remove PermissionsGate wrapper completely but keep children
  if (c.includes('PermissionsGate')) {
    // Regex matches <PermissionsGate ...> and </PermissionsGate>
    c = c.replace(/<PermissionsGate[^>]*>/g, '');
    c = c.replace(/<\/PermissionsGate>/g, '');
    c = c.replace(/import\s+\{\s*PermissionsGate\s*\}\s+from\s+['"].*PermissionsGate['"];?\s*/g, '');
    changed = true;
  }

  // Remove usePermissions hook and hasPermission usage
  if (c.includes('usePermissions')) {
    c = c.replace(/import\s+\{\s*usePermissions\s*\}\s+from\s+['"].*usePermissions['"];?\s*/g, '');
    c = c.replace(/const\s+\{\s*hasPermission\s*\}\s*=\s*usePermissions\(\);\s*/g, '');
    // Replace boolean checks like `hasPermission('something') &&` with `true &&` 
    // We can also just replace `hasPermission(...)` with `true`
    c = c.replace(/hasPermission\([^)]+\)/g, 'true');
    changed = true;
  }

  // Specific check for user.role checks (like in ProfilePage.tsx)
  if (c.includes('user?.role')) {
    // Keep user.role display in ProfilePage, just replace conditionally hiding based on role
    // if there are any `user?.role === 'admin'` checks, replace them with `true` or let them be if they are just display
    // E.g. in ProfilePage it's `{user?.role || 'Standard'} Account`, which is fine.
  }

  if (changed) {
    fs.writeFileSync(f, c);
    console.log('Fixed RBAC in', f);
  }
});
