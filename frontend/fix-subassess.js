const fs = require('fs');

function updateSubAssessment(filePath, getFnName) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('dataSource?:')) {
    content = content.replace(/interface [a-zA-Z]+Props \{/, "$&\n  dataSource?: 'mssql' | 'supabase';");
  }
  
  content = content.replace(/const ([a-zA-Z]+Assessment): React\.FC<[a-zA-Z]+Props> = \(\{/, "const $1: React.FC<$1Props> = ({ dataSource = 'mssql', ");
  
  // Replace the fetching logic
  // e.g. const struc = await getBldgStrucByTdn(selectedRecord.id);
  // With: 
  // let struc = [];
  // if (dataSource === 'supabase') {
  //   struc = (selectedRecord as any).data?.bldgStruc || [];
  // } else {
  //   struc = await getBldgStrucByTdn(selectedRecord.id);
  // }
  
  if (filePath.includes('BuildingAssessment')) {
    content = content.replace(
      /const struc = await getBldgStrucByTdn\(selectedRecord\.id\);/,
      "let struc: any[] = [];\n      if (dataSource === 'supabase') {\n        struc = (selectedRecord as any).bldgStruc || [];\n      } else {\n        struc = await getBldgStrucByTdn(selectedRecord.id);\n      }"
    );
  }
  
  if (filePath.includes('LandAssessment')) {
    content = content.replace(
      /const trees = await getTreesByTdn\(selectedRecord\.id\);/,
      "let trees: any[] = [];\n      if (dataSource === 'supabase') {\n        trees = (selectedRecord as any).trees || [];\n      } else {\n        trees = await getTreesByTdn(selectedRecord.id);\n      }"
    );
  }
  
  if (filePath.includes('MachineryAssessment')) {
    content = content.replace(
      /const items = await getRptMachByTdn\(selectedRecord\.id\);/,
      "let items: any[] = [];\n      if (dataSource === 'supabase') {\n        items = (selectedRecord as any).machineryItems || [];\n      } else {\n        items = await getRptMachByTdn(selectedRecord.id);\n      }"
    );
  }
  
  fs.writeFileSync(filePath, content);
}

updateSubAssessment('src/modules/rptas/shared/components/data-entry/building/BuildingAssessment.tsx');
updateSubAssessment('src/modules/rptas/shared/components/data-entry/land/LandAssessment.tsx');
updateSubAssessment('src/modules/rptas/shared/components/data-entry/machinery/MachineryAssessment.tsx');
