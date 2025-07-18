import { aircraftAPI } from '../lib/aircraftApi';
import { pilotAPI } from '../lib/pilotApi';

// 初期データ挿入スクリプト
export async function insertInitialData(userId?: string) {
  // ユーザーIDを設定（引数で指定されていない場合はデフォルト値を使用）
  const targetUserId = userId || 'test-user-001';

  console.log('=== 初期データ挿入開始 ===');

  // 1. 既存データの削除（必要に応じて）
  console.log('既存データを確認中...');
  const existingAircrafts = await aircraftAPI.listByUser(targetUserId);
  const existingPilots = await pilotAPI.listByUser(targetUserId);
  
  console.log(`既存の機体数: ${existingAircrafts.length}`);
  console.log(`既存のパイロット数: ${existingPilots.length}`);

  // 2. 機体データの挿入
  console.log('\n--- 機体データ挿入 ---');
  const aircraftData = [
    {
      name: 'SN56',
      registrationNumber: 'JUXXXXXXXXXX',
      manufacturer: 'Wingcopter',
      model: 'WC198R1A',
      serialNumber: 'XXXXXXXXXXX56',
      codeName: 'SN56',
      totalFlightTime: 0,
    },
    {
      name: 'SN62',
      registrationNumber: 'JUXXXXXXXXXX',
      manufacturer: 'Wingcopter',
      model: 'WC198R1A',
      serialNumber: 'XXXXXXXXXXX62',
      codeName: 'SN62',
      totalFlightTime: 0,
    },
    {
      name: 'DRN40-001',
      registrationNumber: 'JUXXXXXXXXXX',
      manufacturer: 'ドローンメーカー',
      model: 'DrN-40',
      serialNumber: 'XXXXXXXXXXXXX',
      codeName: 'DRN40-001',
      totalFlightTime: 0,
    },
    {
      name: 'RINO',
      registrationNumber: 'JUXXXXXXXXXX',
      manufacturer: 'ACSL',
      model: 'SOTEN',
      serialNumber: 'XXXXXXXXXXXXX',
      codeName: 'RINO',
      totalFlightTime: 0,
    },
    {
      name: 'CHIE',
      registrationNumber: 'JUXXXXXXCF26',
      manufacturer: 'ACSL',
      model: 'SOTEN',
      serialNumber: 'XXXXXXXXXXXXX',
      codeName: 'CHIE',
      totalFlightTime: 0,
    },
    {
      name: 'SN57',
      registrationNumber: 'JUXXXXXXXXXX',
      manufacturer: 'Wingcopter',
      model: 'WC198R1A',
      serialNumber: 'XXXXXXXXXXX57',
      codeName: 'SN57',
      totalFlightTime: 0,
    },
    {
      name: 'SN61',
      registrationNumber: 'JUXXXXXXXXXX',
      manufacturer: 'Wingcopter',
      model: 'WC198R1A',
      serialNumber: 'XXXXXXXXXXX61',
      codeName: 'SN61',
      totalFlightTime: 0,
    },
    {
      name: 'Orca',
      registrationNumber: '',
      manufacturer: 'Pheonix-Wings',
      model: 'Orca',
      serialNumber: '',
      totalFlightTime: 0,
    },
  ];

  // 重複チェックして挿入
  for (const aircraft of aircraftData) {
    const existing = existingAircrafts.find(
      a => a.registrationNumber === aircraft.registrationNumber && 
          a.serialNumber === aircraft.serialNumber
    );
    
    if (existing) {
      console.log(`既存の機体をスキップ: ${aircraft.name} (${aircraft.registrationNumber})`);
    } else {
      try {
        const created = await aircraftAPI.create(targetUserId, {
          name: aircraft.name,
          registrationNumber: aircraft.registrationNumber,
          manufacturer: aircraft.manufacturer,
          model: aircraft.model,
          serialNumber: aircraft.serialNumber || undefined,
        });
        console.log(`機体を作成しました: ${aircraft.name} (ID: ${created.aircraftId})`);
      } catch (error) {
        console.error(`機体作成エラー: ${aircraft.name}`, error);
      }
    }
  }

  // 3. パイロットデータの挿入
  console.log('\n--- パイロットデータ挿入 ---');
  const pilotData = [
    {
      name: '杉晃太朗',
      email: 'ksugi101@gmail.com',
      licenseNumber: '24100114140',
      pilotId: '6bc1c1a0-1ca9-44fa-a66e-3ca59f5d8ffc', // 既存のIDを保持（参考用）
    },
    {
      name: '林賢太',
      email: 'kenta.hayashi@airwingsllc.com',
      licenseNumber: '23040007901',
      pilotId: '7fb5e3ff-9fca-47f9-84db-77e1d64f1d24', // 既存のIDを保持（参考用）
    },
    {
      name: '前場洋人',
      email: '',
      licenseNumber: '23020003420',
    },
  ];

  // 重複チェックして挿入
  for (const pilot of pilotData) {
    const existing = existingPilots.find(
      p => p.licenseNumber === pilot.licenseNumber || p.email === pilot.email
    );
    
    if (existing) {
      console.log(`既存のパイロットをスキップ: ${pilot.name} (${pilot.licenseNumber})`);
    } else {
      try {
        const created = await pilotAPI.create(targetUserId, {
          name: pilot.name,
          email: pilot.email || undefined,
          licenseNumber: pilot.licenseNumber || undefined,
        });
        console.log(`パイロットを作成しました: ${pilot.name} (ID: ${created.pilotId})`);
      } catch (error) {
        console.error(`パイロット作成エラー: ${pilot.name}`, error);
      }
    }
  }

  console.log('\n=== 初期データ挿入完了 ===');
}

// 直接実行する場合
if (require.main === module) {
  insertInitialData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('エラーが発生しました:', error);
      process.exit(1);
    });
}