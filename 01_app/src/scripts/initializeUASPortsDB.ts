// Initialize UAS Ports in DynamoDB
import { uasPortAPI } from '../lib/uasPortApi';
import polygonData from './uasPortPolygons.json';

// ポートデータの定義
const uasPortsData = [
  {
    uaport_code: 'UFKE',
    common_name: '五島（福江島）',
    full_address: '長崎県五島市',
    location: { lat: 32.6978, lon: 128.8528 },
  },
  {
    uaport_code: 'UNAG',
    common_name: '長崎市',
    full_address: '長崎県長崎市',
    location: { lat: 32.7413, lon: 129.8680 },
  },
  {
    uaport_code: 'UWAK',
    common_name: '稚内市',
    full_address: '北海道稚内市',
    location: { lat: 45.4235, lon: 141.6352 },
  },
  {
    uaport_code: 'URSI',
    common_name: '利尻島',
    full_address: '北海道利尻郡',
    location: { lat: 45.2349, lon: 141.2694 },
  },
];

export async function initializeUASPortsInDB() {
  console.log('Initializing UAS Ports in DynamoDB...');
  
  let successCount = 0;
  let errorCount = 0;
  
  // ポリゴンデータマップを作成
  const polygonMap = new Map(
    polygonData.map(port => [port.code, port.polygon])
  );
  
  for (const portData of uasPortsData) {
    try {
      await uasPortAPI.create({
        uaport_code: portData.uaport_code,
        common_name: portData.common_name,
        full_address: portData.full_address,
        location: portData.location,
        polygon: polygonMap.get(portData.uaport_code),
        status: 'ACTIVE',
      });
      console.log(`✓ Created UAS Port: ${portData.uaport_code} (${portData.common_name})`);
      successCount++;
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log(`- Skipped UAS Port: ${portData.uaport_code} (already exists)`);
      } else {
        console.error(`✗ Failed to create port ${portData.uaport_code}:`, error);
        errorCount++;
      }
    }
  }
  
  console.log(`\nUAS Ports initialization completed:`);
  console.log(`- Success: ${successCount}`);
  console.log(`- Errors: ${errorCount}`);
  console.log(`- Skipped: ${uasPortsData.length - successCount - errorCount}`);
}

// CLIから実行できるようにする
if (require.main === module) {
  initializeUASPortsInDB()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}