export const dummyPropertyRecord = {
  // RealPropertyDataEntry Mapped Fields
  id: 'DUMMY-RECORD-001',
  tdn: '2024-01-001-00001',
  arp: '2024-001-00001',
  pin: '123-01-001-001-001',
  ownerNo: 'OWN-2024-001',
  owner: 'JUAN A. DELA CRUZ',
  barangay: 'POBLACION',
  barangayCode: '001',
  cityCode: '01',
  
  // PropertyInformationSection Raw Fields
  EFF_DATE: '2024-01-01',
  DEC_DATE: '2024-01-15',
  EFF_CANC: '',
  DIST_NO: '01',
  BCODE: '001',
  BARANGAY: 'POBLACION',
  CCN: 'CCN-2024-001',
  MTDN: '',
  IMP_NO: 'IMP-001',
  BLDGNAME: 'SUNRISE APARTMENTS',
  BLDGUNIT: 'UNIT-101',
  TRANS_CD: 'GR', // General Revision
  CER_TIT_NO: 'TCT-123456',
  TCT_DATE: '2020-05-20',
  CAD_LOT_NO: 'CAD-789',
  ASS_LOT_NO: 'SURV-456',
  BLOCK_NO: 'BLK-12',
  LOTE_NO: 'LOT-34',

  // PropertyOwnerSection Raw Fields
  OWN_CD: 'SING', // Single
  Owner_Address: '123 RIZAL STREET, BARANGAY POBLACION, CITY OF DREAMS',
  ADM_CD: 'MAR', // Married
  ADMIN_NO: 'ADM-2024-001',
  Administrator_Name: 'MARIA B. DELA CRUZ',
  Administrator_Address: '456 MABINI STREET, BARANGAY SAN ISIDRO, CITY OF DREAMS',

  // Reference Section (mapped keys in parent, but might be used raw if I fix child)
  P_NEW_TDN: '2025-01-001-00001',
  P_OLD_TDN: '2023-01-001-00001',
  P_PIN: '123-01-001-001-000',
  P_MARKET_VALUE: 1500000,
  P_ASS_VALUE: 600000,
  P_OWNER_CODE: 'OWN-2023-001',
  P_OWNER_NO: 'OWN-2023-001',
  CAN_ARP: '2023-001-00001',
  P_AREA: 500,
  P_AREA_M: true,
  P_EFF_DATE: '2023-01-01',
  P_OWNER: 'JUAN A. DELA CRUZ',

  // Signatory Fields (mapped in parent)
  Appraiser: 'JOHN DOE',
  AppraiserPos: 'LAOO I',
  AppraisedDate: '2024-01-10',
  Assessor: 'JANE SMITH',
  AssessorPos: 'MUNICIPAL ASSESSOR',
  AssessorDate: '2024-01-20',
  Rec_Approval: 'PETER PARKER',
  Rec_ApprovalPos: 'ASST. MUNICIPAL ASSESSOR',
  Rec_AppDate: '2024-01-18',
  Approved: 'MAYOR ALICE GUO',
  ApprovedPos: 'MUNICIPAL MAYOR',
  ApprovedDate: '2024-01-25',
  
  // Checkboxes
  SGD_APPRAISED: true,
  SGD_RECOMMEND: true,
  SGD_APPROVED: true,
  SGD_ASSESSED: true,
  
  // Taxability
  taxable: true,
  beneficialUse: false,
  idleLand: false,

  // PropertyBoundariesSection Fields
  STREET_CD: '001',
  STREET: 'RIZAL STREET',
  LOCATION: 'POBLACION, CITY OF DREAMS',
  NORTH: 'LOT 123 (JUAN LUNA)',
  SOUTH: 'LOT 125 (JOSE RIZAL)',
  EAST: 'MABINI STREET',
  WEST: 'LOT 124 (ANDRES BONIFACIO)'
};

export const dummyAssessmentRecords = [
  {
    TDN: '2024-01-001-00001',
    REGION: '13',
    PROV: 'AGUSAN DEL NORTE',
    CITY: '01',
    DISTRICT: '01',
    KIND: 'L', // Land
    CLASSIFICATION: 'RES', // Residential
    ACTUAL_USE: 'RES',
    SUB_CLASS: 'R-1',
    CLASS_LEVEL: '1st', // Custom field for frontend
    MUNICIPALITY: 'Buenavista', // Custom field for frontend
    EFF_DATE: '2024-01-01',
    FOR_YEAR: 2024,
    AREA: 500,
    IF_DEFAULT: false, // sq.m.
    UNIT_VALUE: 1200,
    MARKET_VAL: 600000,
    OLD_MVAL: 0,
    ASS_LEVEL: 20,
    TAXABLE_RATE: 20,
    ASS_VALUE: 120000,
    TAXABILITY: 'TAXABLE',
    BU: '1',
    SQAREA: 500,
    IdleLand: false
  }
];

export const dummyTreesData = [
  {
    id: 'TREE-001',
    name: 'Coconut',
    class: 'A',
    unitPrice: 150,
    quantity: 50,
    totalValue: 7500,
    type: 'FB' // Fruit Bearing
  },
  {
    id: 'TREE-002',
    name: 'Mango',
    class: 'B',
    unitPrice: 200,
    quantity: 30,
    totalValue: 6000,
    type: 'FB'
  },
  {
    id: 'TREE-003',
    name: 'Narra',
    class: '',
    unitPrice: 500,
    quantity: 10,
    totalValue: 5000,
    type: 'NFB' // Non-Fruit Bearing
  }
];

export const dummyLandFormData = {
  classification: 'RES',
  subClass: 'R-1',
  classLevel: '1st',
  municipality: 'Buenavista',
  actualUse: 'RES',
  area: '500',
  ifDefault: false, // sq.m.
  unitValue: '1200',
  assessmentLevel: '20',
  taxable: true,
  beneficialUse: false,
  idleLand: false
};

export const dummyBuildingFormData = {
  classification: 'RES',
  actualUse: 'RES',
  subClass: 'III-A',
  area: '120',
  unitValue: '15000',
  assessmentLevel: '40',
  taxable: true,
  beneficialUse: false,
  idleLand: false
};

export const dummyMachineryFormData = {
  classification: 'COM',
  actualUse: 'COM',
  subClass: 'MACH-HVY',
  area: '1',
  unitValue: '500000',
  assessmentLevel: '80',
  taxable: true,
  beneficialUse: false,
  idleLand: false
};
