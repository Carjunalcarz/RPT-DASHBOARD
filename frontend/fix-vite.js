const fs = require('fs');
let content = fs.readFileSync('vite.config.cjs', 'utf8');
content = content.replace(/alias: {\n\s+'@': path\.resolve\(__dirname, 'src'\),/, "alias: {\n        '@': path.resolve(__dirname, 'src'),\n        '@/modules/rptas': path.resolve(__dirname, 'src/modules/rptas'),");
fs.writeFileSync('vite.config.cjs', content);
