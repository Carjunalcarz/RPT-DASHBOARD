const fs = require('fs');
let content = fs.readFileSync('tsconfig.json', 'utf8');
content = content.replace(/"@\/\*": \["\.\/\*"\]/, '"@/*": ["src/*"]');
content = content.replace(/"@\/modules\/rptas\/\*": \["\.\/src\/modules\/rptas\/\*"\]/, '"@/modules/rptas/*": ["src/modules/rptas/*"]');
fs.writeFileSync('tsconfig.json', content);
