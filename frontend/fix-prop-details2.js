const fs = require('fs');
let content = fs.readFileSync('src/modules/rptas/shared/components/data-entry/faas/PropertyDetailsView.tsx', 'utf8');
content = content.replace(/from "\.\.\/rpt_m_OtherPropertyTab"/g, 'from "../OtherPropertyTab"');
content = content.replace(/from '\.\.\/rpt_m_OtherPropertyTab'/g, 'from "../OtherPropertyTab"');
fs.writeFileSync('src/modules/rptas/shared/components/data-entry/faas/PropertyDetailsView.tsx', content);
