// Initialize UAS Ports in DynamoDB

import { UASPort } from '../types/uasport';
import polygonData from './uasPortPolygons.json';

// ポリゴンデータマップを作成
const polygonMap = new Map(
  polygonData.map(port => [port.code, port.polygon])
);

// 初期UASポートデータ
export const initialUASPorts: Omit<UASPort, 'PK' | 'SK' | 'entityType' | 'createdAt' | 'updatedAt'>[] = [
  {
    uaport_code: 'UFKE',
    common_name: '五島（福江島）',
    full_address: '長崎県五島市',
    location: {
      lat: 32.6978,  // ポリゴンの中心付近に更新
      lon: 128.8528
    },
    polygon: polygonMap.get('UFKE'),
    status: 'ACTIVE'
  },
  {
    uaport_code: 'UNAG',
    common_name: '長崎市',
    full_address: '長崎県長崎市',
    location: {
      lat: 32.7413,  // ポリゴンの中心付近に更新
      lon: 129.8680
    },
    polygon: polygonMap.get('UNAG'),
    status: 'ACTIVE'
  },
  {
    uaport_code: 'UWAK',
    common_name: '稚内市',
    full_address: '北海道稚内市',
    location: {
      lat: 45.4235,  // ポリゴンの中心付近に更新
      lon: 141.6352
    },
    polygon: polygonMap.get('UWAK'),
    status: 'ACTIVE'
  },
  {
    uaport_code: 'URSI',
    common_name: '利尻島',
    full_address: '北海道利尻郡',
    location: {
      lat: 45.2349,  // ポリゴンの中心付近に更新
      lon: 141.2694
    },
    polygon: polygonMap.get('URSI'),
    status: 'ACTIVE'
  }
];

// UASポート初期化関数（管理画面で使用）
export async function initializeUASPortsInDB(createPort: (input: any) => Promise<any>) {
  console.log('Initializing UAS Ports...');
  
  for (const portData of initialUASPorts) {
    try {
      await createPort(portData);
      console.log(`Created UAS Port: ${portData.uaport_code} (${portData.common_name})`);
    } catch (error) {
      console.error(`Failed to create port ${portData.uaport_code}:`, error);
    }
  }
  
  console.log('UAS Ports initialization completed.');
}