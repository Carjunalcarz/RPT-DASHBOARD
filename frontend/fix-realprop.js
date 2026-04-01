const fs = require('fs');
let content = fs.readFileSync('src/modules/rptas/shared/components/data-entry/faas/RealPropertyDataEntry.tsx', 'utf8');

// Add dataSource prop
content = content.replace(/const RealPropertyDataEntry: React\.FC = \(\) => {/, "interface RealPropertyDataEntryProps {\n  dataSource?: 'mssql' | 'supabase';\n}\n\nconst RealPropertyDataEntry: React.FC<RealPropertyDataEntryProps> = ({ dataSource = 'mssql' }) => {");

// Update useSWR
content = content.replace(/\['rpt-mast'/, "[dataSource");
content = content.replace(/\(\[_, page, limit, searchField, filterValue\]\) => getRptMastDataDirect\({ page, limit, searchField, filterValue }\)/, "([_, page, limit, searchField, filterValue]) => dataSource === 'supabase' ? listFaasRecords({ page, limit, searchField, filterValue }) : getRptMastDataDirect({ page, limit, searchField, filterValue })");

// Update useEffect mapping
const oldEffect = `    useEffect(() => {
      if (apiData?.success) {
        const mappedRecords: PropertyRecord[] = apiData.data.map((item, index) => ({
          ...item,
          id: \`\${item.TDN}-\${index}\`, // Ensure unique ID even with duplicate TDNs
          tdn: item.TDN || '',
          arp: item.TDN || '', // ARP should use CURRENT TDN
          pin: cleanPin(item.PIN || ''),
          ownerNo: item.OWNER_NO || '',
          owner: item.Owner_Name || 'N/A',
          barangay: item.BARANGAY || 'N/A',
          barangayCode: item['BRGY.CODE'] || '',
          cityCode: item.CITY || '',
          // Map Reference Fields
          pNewTdn: item.P_NEW_TDN,
          pOldTdn: item.P_OLD_TDN,
          pPin: cleanPin(item.P_PIN || ''),
          pMarketValue: item.P_MARKET_VALUE,
          pAssessedValue: item.P_ASSESSED_VALUE,
          effectivityYear: item.EFFECTIVITY_YEAR,
          effectivityQuarter: item.EFFECTIVITY_QUARTER,
        }));
        setRecords(mappedRecords);
      } else {
        setRecords([]);
      }
    }, [apiData]);`;

const newEffect = `    useEffect(() => {
      if (apiData?.success || apiData?.data) {
        const rawData = Array.isArray(apiData.data) ? apiData.data : apiData;
        const mappedRecords: PropertyRecord[] = rawData.map((item: any, index: number) => {
          if (dataSource === 'supabase') {
             const innerData = item.data || {};
             const currentTdn = item.tdn || innerData.tdn || innerData.TDN || '';
             const currentPin = innerData.pin || innerData.PIN || '';
             const { tdn, pin, arp, ...cleanInnerData } = innerData;

             return {
               ...cleanInnerData,
               id: item.id,
               TDN: currentTdn,
               ARP: currentTdn,
               PIN: currentPin,
               status: item.status,
               owner: innerData.owner || innerData.owner_name || 'N/A',
               barangay: innerData.barangay || 'N/A',
               OWNER_NO: innerData.OWNER_NO || '',
             };
          } else {
             return {
               ...item,
               id: \`\${item.TDN}-\${index}\`, // Ensure unique ID even with duplicate TDNs
               tdn: item.TDN || '',
               arp: item.TDN || '', // ARP should use CURRENT TDN
               pin: cleanPin(item.PIN || ''),
               ownerNo: item.OWNER_NO || '',
               owner: item.Owner_Name || 'N/A',
               barangay: item.BARANGAY || 'N/A',
               barangayCode: item['BRGY.CODE'] || '',
               cityCode: item.CITY || '',
               // Map Reference Fields
               pNewTdn: item.P_NEW_TDN,
               pOldTdn: item.P_OLD_TDN,
               pPin: cleanPin(item.P_PIN || ''),
               pMarketValue: item.P_MARKET_VALUE,
               pAssessedValue: item.P_ASSESSED_VALUE,
               effectivityYear: item.EFFECTIVITY_YEAR,
               effectivityQuarter: item.EFFECTIVITY_QUARTER,
             };
          }
        });
        setRecords(mappedRecords);
      } else {
        setRecords([]);
      }
    }, [apiData, dataSource]);`;

content = content.replace(oldEffect, newEffect);

fs.writeFileSync('src/modules/rptas/shared/components/data-entry/faas/RealPropertyDataEntry.tsx', content);
