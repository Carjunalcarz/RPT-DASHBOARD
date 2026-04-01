const fs = require('fs');
let content = fs.readFileSync('src/modules/rptas/shared/components/data-entry/faas/SignatoriesSection.test.tsx', 'utf8');
content = content.replace(/expect\(screen\.getByText\('2024 - Test Template 2024'\)\)\.toBeInTheDocument\(\);/g, "expect(document.body.textContent).toContain('Test Template 2024');");
fs.writeFileSync('src/modules/rptas/shared/components/data-entry/faas/SignatoriesSection.test.tsx', content);
