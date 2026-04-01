const fs = require('fs');
let content = fs.readFileSync('src/modules/rptas/shared/components/data-entry/Breadcrumb.test.tsx', 'utf8');
content = content.replace(/from '\.\/rpt_m_Breadcrumb'/g, 'from "./Breadcrumb"');
fs.writeFileSync('src/modules/rptas/shared/components/data-entry/Breadcrumb.test.tsx', content);
