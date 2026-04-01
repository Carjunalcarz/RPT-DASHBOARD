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

const files = getFiles('src/modules/rptas/shared/services');

files.forEach(f => {
  if (f.endsWith('.ts')) {
    let content = fs.readFileSync(f, 'utf8');
    let originalContent = content;
    
    // Replace api imports in services
    content = content.replace(/from "\.\/api"/g, 'from "@/services/api"');
    content = content.replace(/from '\.\/api'/g, "from '@/services/api'");
    
    if (content !== originalContent) {
      fs.writeFileSync(f, content);
      console.log('Fixed api import in', f);
    }
  }
});
