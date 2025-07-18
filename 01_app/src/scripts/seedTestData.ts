import { pilotAPI } from '../lib/pilotApi';
import { aircraftAPI } from '../lib/aircraftApi';

const TEST_USER_ID = 'test-user-001';

// テストパイロットデータ
const TEST_PILOTS = [
  { name: '杉晃太朗', licenseNumber: 'JPN-2024-001', email: 'sugi@example.com' },
  { name: '林賢太', licenseNumber: 'JPN-2024-002', email: 'hayashi@example.com' },
];

// テスト機体データ
const TEST_AIRCRAFTS = [
  { 
    name: 'DrN-40', 
    registrationNumber: 'JA-DRN40',
    manufacturer: 'ドローンメーカー',
    model: 'DrN-40',
    serialNumber: 'DRN40-001'
  },
  { 
    name: 'Wingcopter198 SN56', 
    registrationNumber: 'JA-WC56',
    manufacturer: 'Wingcopter',
    model: 'Wingcopter 198',
    serialNumber: 'SN56'
  },
  { 
    name: 'Wingcopter198 SN57', 
    registrationNumber: 'JA-WC57',
    manufacturer: 'Wingcopter',
    model: 'Wingcopter 198',
    serialNumber: 'SN57'
  },
  { 
    name: 'Wingcopter198 SN61', 
    registrationNumber: 'JA-WC61',
    manufacturer: 'Wingcopter',
    model: 'Wingcopter 198',
    serialNumber: 'SN61'
  },
  { 
    name: 'Wingcopter198 SN62', 
    registrationNumber: 'JA-WC62',
    manufacturer: 'Wingcopter',
    model: 'Wingcopter 198',
    serialNumber: 'SN62'
  },
  { 
    name: 'ACSL SOTEN CHIE', 
    registrationNumber: 'JA-CHIE',
    manufacturer: 'ACSL',
    model: 'SOTEN',
    serialNumber: 'CHIE'
  },
  { 
    name: 'ACSL SOTEN RINO', 
    registrationNumber: 'JA-RINO',
    manufacturer: 'ACSL',
    model: 'SOTEN',
    serialNumber: 'RINO'
  },
];

export async function seedTestData() {
  console.log('Seeding test data...');
  
  try {
    // パイロット作成
    console.log('Creating test pilots...');
    for (const pilot of TEST_PILOTS) {
      try {
        await pilotAPI.create(TEST_USER_ID, pilot);
        console.log(`Created pilot: ${pilot.name}`);
      } catch (err) {
        console.error(`Failed to create pilot ${pilot.name}:`, err);
      }
    }
    
    // 機体作成
    console.log('Creating test aircrafts...');
    for (const aircraft of TEST_AIRCRAFTS) {
      try {
        await aircraftAPI.create(TEST_USER_ID, aircraft);
        console.log(`Created aircraft: ${aircraft.name}`);
      } catch (err) {
        console.error(`Failed to create aircraft ${aircraft.name}:`, err);
      }
    }
    
    console.log('Test data seeding completed!');
  } catch (err) {
    console.error('Failed to seed test data:', err);
  }
}

// スクリプトとして実行される場合
if (require.main === module) {
  seedTestData();
}