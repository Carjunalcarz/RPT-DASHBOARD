const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      getFiles(path.join(dir, file), fileList);
    } else {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = getFiles('src');

files.forEach(f => {
  if (f.endsWith('.tsx') || f.endsWith('.ts')) {
    let content = fs.readFileSync(f, 'utf8');
    let originalContent = content;
    
    // Fix 1: rpt_m_PropertyDetailsView import in PropertyApproval.tsx
    content = content.replace(/RPT-management\/faas\/rpt_m_PropertyDetailsView/g, 'data-entry/faas/PropertyDetailsView');
    
    // Fix 2: api imports in shared/services
    content = content.replace(/from "\.\/api"/g, 'from "@/services/api"');
    
    // Fix 3: rpt_m_Breadcrumb in Breadcrumb.test.tsx
    content = content.replace(/from "\.\/rpt_m_Breadcrumb"/g, 'from "./Breadcrumb"');
    
    // Fix 4: rpt_m_SignatoriesSection in SignatoriesSection.test.tsx
    content = content.replace(/from '\.\/rpt_m_SignatoriesSection'/g, "from './SignatoriesSection'");
    content = content.replace(/from "\.\/rpt_m_SignatoriesSection"/g, 'from "./SignatoriesSection"');
    
    if (content !== originalContent) {
      fs.writeFileSync(f, content);
      console.log('Fixed additional imports in', f);
    }
  }
});
