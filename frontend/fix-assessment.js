const fs = require('fs');

function updateAssessmentSection() {
  let content = fs.readFileSync('src/modules/rptas/shared/components/data-entry/faas/AssessmentSection.tsx', 'utf8');
  if (!content.includes('dataSource?:')) {
    content = content.replace(/interface AssessmentSectionProps {/, "interface AssessmentSectionProps {\n  dataSource?: 'mssql' | 'supabase';");
    content = content.replace(/const AssessmentSection: React\.FC<AssessmentSectionProps> = \(\{/, "const AssessmentSection: React.FC<AssessmentSectionProps> = ({ dataSource = 'mssql', ");
    content = content.replace(/<BuildingAssessment/g, '<BuildingAssessment dataSource={dataSource}');
    content = content.replace(/<LandAssessment/g, '<LandAssessment dataSource={dataSource}');
    content = content.replace(/<MachineryAssessment/g, '<MachineryAssessment dataSource={dataSource}');
    fs.writeFileSync('src/modules/rptas/shared/components/data-entry/faas/AssessmentSection.tsx', content);
  }
}

updateAssessmentSection();
