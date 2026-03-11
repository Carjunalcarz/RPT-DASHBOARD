
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Register fonts if needed (using standard fonts for now)
// Font.register({ family: 'Roboto', src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf' });

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  header: {
    backgroundColor: '#008000', // Green header
    color: 'white',
    textAlign: 'center',
    padding: 5,
    marginBottom: 5,
    fontWeight: 'bold',
    fontSize: 12,
  },
  subHeader: {
    textAlign: 'center',
    fontSize: 10,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 5,
    border: '1px solid #008000', // Green border
  },
  row: {
    flexDirection: 'row',
    borderBottom: '1px solid #008000',
  },
  lastRow: {
    flexDirection: 'row',
    borderBottom: 'none',
  },
  col: {
    padding: 2,
    borderRight: '1px solid #008000',
  },
  lastCol: {
    padding: 2,
    borderRight: 'none',
  },
  label: {
    fontSize: 7,
    color: '#333',
    marginBottom: 2,
  },
  value: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
    fontSize: 8,
    textAlign: 'center',
    padding: 3,
  },
  tableCell: {
    fontSize: 8,
    padding: 3,
  },
  watermark: {
    position: 'absolute',
    top: 300,
    left: 100,
    opacity: 0.1,
    transform: 'rotate(-45deg)',
    fontSize: 60,
    color: 'red',
    zIndex: -1,
  },
  checkbox: {
    width: 10,
    height: 10,
    border: '1px solid #000',
    marginRight: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: {
    width: 6,
    height: 6,
    backgroundColor: '#000',
  },
});

const Checkbox = ({ checked }) => (
  <View style={styles.checkbox}>
    {checked && <View style={styles.checked} />}
  </View>
);

const AssessmentSheet = ({ data }) => {
  const {
    transactionCode = 'GR',
    tdNo,
    arpNo,
    pin,
    octTctNo,
    cadastralLotNo,
    cloaCscNo,
    surveyNo,
    lotNo,
    blockNo,
    owner,
    address,
    administrator,
    adminAddress,
    tin,
    telNo,
    adminTin,
    adminTelNo,
    propertyLocation,
    boundaries,
    landAppraisal = [],
    otherImprovements = [],
    valueAdjustment = [],
    propertyAssessment = [],
    totals = {},
    taxability = {},
    signatories = {},
    memoranda,
    supersededAssessment = {},
  } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text>REAL PROPERTY FIELD APPRAISAL & ASSESSMENT SHEET</Text>
          <Text style={{ fontSize: 10 }}>LAND & OTHER IMPROVEMENTS</Text>
        </View>

        {/* Transaction Code */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 5 }}>
          <Text style={{ fontSize: 8 }}>TRANSACTION CODE: </Text>
          <Text style={{ fontSize: 8, fontWeight: 'bold', marginLeft: 5 }}>{transactionCode}</Text>
        </View>

        {/* Basic Info Section */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={[styles.col, { flex: 2 }]}>
              <Text style={styles.label}>TD / ARP No.</Text>
              <Text style={styles.value}>{tdNo || arpNo}</Text>
            </View>
            <View style={[styles.lastCol, { flex: 2 }]}>
              <Text style={styles.label}>PIN</Text>
              <Text style={styles.value}>{pin}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.col, { flex: 1 }]}>
              <Text style={styles.label}>OCT/TCT No.</Text>
              <Text style={styles.value}>{octTctNo}</Text>
            </View>
            <View style={[styles.col, { flex: 1 }]}>
              <Text style={styles.label}>Dated:</Text>
              <Text style={styles.value}></Text>
            </View>
            <View style={[styles.col, { flex: 1 }]}>
              <Text style={styles.label}>Cadastral Lot No.</Text>
              <Text style={styles.value}>{cadastralLotNo}</Text>
            </View>
            <View style={[styles.lastCol, { flex: 1 }]}>
              <Text style={styles.label}>Lot No.</Text>
              <Text style={styles.value}>{lotNo}</Text>
            </View>
          </View>
          {/* Owner Info */}
          <View style={styles.row}>
            <View style={[styles.col, { flex: 3 }]}>
              <Text style={styles.label}>Owner:</Text>
              <Text style={[styles.value, { fontSize: 11 }]}>{owner}</Text>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{address}</Text>
            </View>
            <View style={[styles.lastCol, { flex: 1 }]}>
              <Text style={styles.label}>TIN:</Text>
              <Text style={styles.value}>{tin}</Text>
              <Text style={styles.label}>Tel. No:</Text>
              <Text style={styles.value}>{telNo}</Text>
            </View>
          </View>
           {/* Admin Info */}
           <View style={styles.lastRow}>
            <View style={[styles.col, { flex: 3 }]}>
              <Text style={styles.label}>Administrator/Beneficial User:</Text>
              <Text style={[styles.value, { fontSize: 11 }]}>{administrator}</Text>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{adminAddress}</Text>
            </View>
            <View style={[styles.lastCol, { flex: 1 }]}>
              <Text style={styles.label}>TIN:</Text>
              <Text style={styles.value}>{adminTin}</Text>
              <Text style={styles.label}>Tel. No:</Text>
              <Text style={styles.value}>{adminTelNo}</Text>
            </View>
          </View>
        </View>

        {/* Property Location */}
        <View style={styles.section}>
          <Text style={[styles.label, { padding: 2, backgroundColor: '#f0f0f0' }]}>PROPERTY LOCATION</Text>
          <View style={styles.lastRow}>
            <View style={[styles.col, { flex: 1 }]}>
              <Text style={styles.label}>No./Street/Purok/Sitio:</Text>
              <Text style={styles.value}>{propertyLocation?.street}</Text>
            </View>
            <View style={[styles.col, { flex: 1 }]}>
              <Text style={styles.label}>Barangay:</Text>
              <Text style={styles.value}>{propertyLocation?.barangay}</Text>
            </View>
            <View style={[styles.col, { flex: 1 }]}>
              <Text style={styles.label}>Municipality:</Text>
              <Text style={styles.value}>{propertyLocation?.municipality}</Text>
            </View>
            <View style={[styles.lastCol, { flex: 1 }]}>
              <Text style={styles.label}>Province:</Text>
              <Text style={styles.value}>{propertyLocation?.province}</Text>
            </View>
          </View>
        </View>

        {/* Boundaries */}
        <View style={[styles.section, { flexDirection: 'row' }]}>
           <View style={{ flex: 1, borderRight: '1px solid #008000' }}>
              <Text style={[styles.label, { padding: 2, backgroundColor: '#f0f0f0' }]}>PROPERTY BOUNDARIES</Text>
              <View style={{ padding: 2, borderBottom: '1px solid #008000' }}>
                 <Text style={styles.label}>North:</Text>
                 <Text style={styles.value}>{boundaries?.north}</Text>
              </View>
              <View style={{ padding: 2, borderBottom: '1px solid #008000' }}>
                 <Text style={styles.label}>East:</Text>
                 <Text style={styles.value}>{boundaries?.east}</Text>
              </View>
              <View style={{ padding: 2, borderBottom: '1px solid #008000' }}>
                 <Text style={styles.label}>South:</Text>
                 <Text style={styles.value}>{boundaries?.south}</Text>
              </View>
              <View style={{ padding: 2 }}>
                 <Text style={styles.label}>West:</Text>
                 <Text style={styles.value}>{boundaries?.west}</Text>
              </View>
           </View>
           <View style={{ flex: 1 }}>
              <Text style={[styles.label, { padding: 2, backgroundColor: '#f0f0f0' }]}>Land Sketch:</Text>
              {/* Placeholder for sketch */}
              <View style={{ height: 100, alignItems: 'center', justifyContent: 'center' }}>
                 <Text style={{ fontSize: 8, color: '#ccc' }}>(Sketch Placeholder)</Text>
              </View>
           </View>
        </View>

        {/* Land Appraisal Table */}
        <View style={styles.section}>
          <Text style={[styles.label, { padding: 2, backgroundColor: '#f0f0f0' }]}>LAND APPRAISAL</Text>
          <View style={styles.row}>
            <Text style={[styles.col, styles.tableHeader, { flex: 2 }]}>Classification</Text>
            <Text style={[styles.col, styles.tableHeader, { flex: 2 }]}>Sub-Classification</Text>
            <Text style={[styles.col, styles.tableHeader, { flex: 1 }]}>Area</Text>
            <Text style={[styles.col, styles.tableHeader, { flex: 1 }]}>Unit Value</Text>
            <Text style={[styles.lastCol, styles.tableHeader, { flex: 1 }]}>Base Market Value</Text>
          </View>
          {landAppraisal.map((item, index) => (
            <View key={index} style={styles.row}>
              <Text style={[styles.col, styles.tableCell, { flex: 2 }]}>{item.classification}</Text>
              <Text style={[styles.col, styles.tableCell, { flex: 2 }]}>{item.subClass}</Text>
              <Text style={[styles.col, styles.tableCell, { flex: 1, textAlign: 'right' }]}>{item.area}</Text>
              <Text style={[styles.col, styles.tableCell, { flex: 1, textAlign: 'right' }]}>{item.unitValue}</Text>
              <Text style={[styles.lastCol, styles.tableCell, { flex: 1, textAlign: 'right' }]}>{item.baseMarketValue}</Text>
            </View>
          ))}
          <View style={styles.lastRow}>
            <Text style={[styles.col, { flex: 4, textAlign: 'right', fontWeight: 'bold' }]}>Total</Text>
            <Text style={[styles.lastCol, { flex: 2, textAlign: 'right', fontWeight: 'bold' }]}>{totals.landTotal}</Text>
          </View>
        </View>

        {/* Other Improvements Table (Simplified) */}
        <View style={styles.section}>
           <Text style={[styles.label, { padding: 2, backgroundColor: '#f0f0f0' }]}>OTHER IMPROVEMENTS</Text>
           <View style={styles.row}>
            <Text style={[styles.col, styles.tableHeader, { flex: 2 }]}>Kind</Text>
            <Text style={[styles.col, styles.tableHeader, { flex: 1 }]}>Total Number</Text>
            <Text style={[styles.col, styles.tableHeader, { flex: 1 }]}>Unit Value</Text>
            <Text style={[styles.lastCol, styles.tableHeader, { flex: 1 }]}>Base Market Value</Text>
          </View>
           {otherImprovements.map((item, index) => (
            <View key={index} style={styles.row}>
              <Text style={[styles.col, styles.tableCell, { flex: 2 }]}>{item.kind}</Text>
              <Text style={[styles.col, styles.tableCell, { flex: 1, textAlign: 'center' }]}>{item.totalNumber}</Text>
              <Text style={[styles.col, styles.tableCell, { flex: 1, textAlign: 'right' }]}>{item.unitValue}</Text>
              <Text style={[styles.lastCol, styles.tableCell, { flex: 1, textAlign: 'right' }]}>{item.baseMarketValue}</Text>
            </View>
          ))}
        </View>

         {/* Property Assessment Table */}
         <View style={styles.section}>
          <Text style={[styles.label, { padding: 2, backgroundColor: '#f0f0f0' }]}>PROPERTY ASSESSMENT</Text>
          <View style={styles.row}>
            <Text style={[styles.col, styles.tableHeader, { flex: 2 }]}>Actual Use</Text>
            <Text style={[styles.col, styles.tableHeader, { flex: 1 }]}>Adjusted Market Value</Text>
            <Text style={[styles.col, styles.tableHeader, { flex: 1 }]}>Assessment Level</Text>
            <Text style={[styles.lastCol, styles.tableHeader, { flex: 1 }]}>Assessed Value</Text>
          </View>
          {propertyAssessment.map((item, index) => (
            <View key={index} style={styles.row}>
              <Text style={[styles.col, styles.tableCell, { flex: 2 }]}>{item.actualUse}</Text>
              <Text style={[styles.col, styles.tableCell, { flex: 1, textAlign: 'right' }]}>{item.adjustedMarketValue}</Text>
              <Text style={[styles.col, styles.tableCell, { flex: 1, textAlign: 'center' }]}>{item.assessmentLevel}%</Text>
              <Text style={[styles.lastCol, styles.tableCell, { flex: 1, textAlign: 'right' }]}>{item.assessedValue}</Text>
            </View>
          ))}
           <View style={styles.lastRow}>
            <Text style={[styles.col, { flex: 2, textAlign: 'right', fontWeight: 'bold' }]}>Total</Text>
            <Text style={[styles.col, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>{totals.marketValueTotal}</Text>
            <Text style={[styles.col, { flex: 1 }]}></Text>
            <Text style={[styles.lastCol, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>{totals.assessedValueTotal}</Text>
          </View>
        </View>

        {/* Taxability */}
        <View style={[styles.section, { padding: 5, flexDirection: 'row', alignItems: 'center' }]}>
            <Text style={{ fontSize: 9, marginRight: 10 }}>Taxable:</Text>
            <Checkbox checked={taxability.taxable} />
            <Text style={{ fontSize: 9, marginRight: 10 }}>Exempt:</Text>
            <Checkbox checked={taxability.exempt} />
            <Text style={{ fontSize: 9, marginLeft: 20 }}>Effectivity of Assessment/Reassessment:</Text>
            <Text style={{ fontSize: 9, fontWeight: 'bold', marginLeft: 10 }}>{taxability.effectivity}</Text>
        </View>

        {/* Signatories */}
        <View style={[styles.section, { border: 'none', marginTop: 10 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <View style={{ width: '30%' }}>
                    <Text style={styles.label}>APPRAISED/ASSESSED BY:</Text>
                    <View style={{ borderBottom: '1px solid black', marginTop: 15, marginBottom: 2 }} />
                    <Text style={{ textAlign: 'center', fontSize: 8 }}>{signatories.appraisedBy}</Text>
                    <Text style={{ textAlign: 'center', fontSize: 7 }}>Date: {signatories.appraisedDate}</Text>
                </View>
                <View style={{ width: '30%' }}>
                    <Text style={styles.label}>RECOMMENDING APPROVAL:</Text>
                    <View style={{ borderBottom: '1px solid black', marginTop: 15, marginBottom: 2 }} />
                    <Text style={{ textAlign: 'center', fontSize: 8 }}>{signatories.recommending}</Text>
                    <Text style={{ textAlign: 'center', fontSize: 7 }}>Date: {signatories.recommendingDate}</Text>
                </View>
                 <View style={{ width: '30%' }}>
                    <Text style={styles.label}>APPROVED BY:</Text>
                    <View style={{ borderBottom: '1px solid black', marginTop: 15, marginBottom: 2 }} />
                    <Text style={{ textAlign: 'center', fontSize: 8 }}>{signatories.approvedBy}</Text>
                    <Text style={{ textAlign: 'center', fontSize: 7 }}>Date: {signatories.approvedDate}</Text>
                </View>
            </View>
        </View>

        {/* Footer / Memoranda */}
        <View style={styles.section}>
            <Text style={styles.label}>MEMORANDA:</Text>
            <Text style={{ fontSize: 8, padding: 2 }}>{memoranda}</Text>
        </View>

      </Page>
    </Document>
  );
};

export default AssessmentSheet;
