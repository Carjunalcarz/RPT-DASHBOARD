const fs = require('fs');
let content = fs.readFileSync('src/modules/rptas/shared/components/data-entry/faas/PropertyDetailsView.tsx', 'utf8');

// Fix internal imports in PropertyDetailsView
content = content.replace(/from '\.\/rpt_m_PropertyInformationSection'/g, 'from "./PropertyInformationSection"');
content = content.replace(/from '\.\/rpt_m_PropertyOwnerSection'/g, 'from "./PropertyOwnerSection"');
content = content.replace(/from '\.\/rpt_m_PropertyBoundariesSection'/g, 'from "./PropertyBoundariesSection"');
content = content.replace(/from '\.\/rpt_m_AssessmentSection'/g, 'from "./AssessmentSection"');
content = content.replace(/from '\.\/rpt_m_TaxDecSheetSection'/g, 'from "./TaxDecSheetSection"');
content = content.replace(/from '\.\/rpt_m_PreviousTDNsSection'/g, 'from "./PreviousTDNsSection"');
content = content.replace(/from '\.\/rpt_m_SignatoriesSection'/g, 'from "./SignatoriesSection"');
content = content.replace(/from '\.\/rpt_m_ReferenceSection'/g, 'from "./ReferenceSection"');

// Double quotes just in case
content = content.replace(/from "\.\/rpt_m_PropertyInformationSection"/g, 'from "./PropertyInformationSection"');
content = content.replace(/from "\.\/rpt_m_PropertyOwnerSection"/g, 'from "./PropertyOwnerSection"');
content = content.replace(/from "\.\/rpt_m_PropertyBoundariesSection"/g, 'from "./PropertyBoundariesSection"');
content = content.replace(/from "\.\/rpt_m_AssessmentSection"/g, 'from "./AssessmentSection"');
content = content.replace(/from "\.\/rpt_m_TaxDecSheetSection"/g, 'from "./TaxDecSheetSection"');
content = content.replace(/from "\.\/rpt_m_PreviousTDNsSection"/g, 'from "./PreviousTDNsSection"');
content = content.replace(/from "\.\/rpt_m_SignatoriesSection"/g, 'from "./SignatoriesSection"');
content = content.replace(/from "\.\/rpt_m_ReferenceSection"/g, 'from "./ReferenceSection"');

fs.writeFileSync('src/modules/rptas/shared/components/data-entry/faas/PropertyDetailsView.tsx', content);
