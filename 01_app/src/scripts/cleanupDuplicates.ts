import { aircraftAPI } from '../lib/aircraftApi';
import { pilotAPI } from '../lib/pilotApi';
import { Aircraft } from '../types/aircraft';
import { Pilot } from '../types/pilot';

// 重複データクリーンアップスクリプト
export async function cleanupDuplicates(userId?: string) {
  const targetUserId = userId || 'test-user-001';

  console.log('=== 重複データクリーンアップ開始 ===');

  // 1. 機体の重複チェック
  console.log('\n--- 機体の重複チェック ---');
  const aircrafts = await aircraftAPI.listByUser(targetUserId);
  const aircraftMap = new Map<string, Aircraft[]>();

  // 登録番号とシリアル番号の組み合わせでグループ化
  aircrafts.forEach(aircraft => {
    const key = `${aircraft.registrationNumber}-${aircraft.serialNumber || 'NONE'}`;
    if (!aircraftMap.has(key)) {
      aircraftMap.set(key, []);
    }
    aircraftMap.get(key)!.push(aircraft);
  });

  // 重複がある場合は最新のものを残して削除
  const aircraftEntries = Array.from(aircraftMap.entries());
  for (const [key, duplicates] of aircraftEntries) {
    if (duplicates.length > 1) {
      console.log(`重複発見: ${key} (${duplicates.length}件)`);
      
      // 作成日時でソート（新しい順）
      duplicates.sort((a: Aircraft, b: Aircraft) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // 最新のものを残して他は削除
      for (let i = 1; i < duplicates.length; i++) {
        try {
          await aircraftAPI.hardDelete(targetUserId, duplicates[i].aircraftId);
          console.log(`  削除: ${duplicates[i].name} (ID: ${duplicates[i].aircraftId})`);
        } catch (error) {
          console.error(`  削除エラー: ${duplicates[i].name}`, error);
        }
      }
      console.log(`  保持: ${duplicates[0].name} (ID: ${duplicates[0].aircraftId})`);
    }
  }

  // 2. パイロットの重複チェック
  console.log('\n--- パイロットの重複チェック ---');
  const pilots = await pilotAPI.listByUser(targetUserId);
  const pilotMap = new Map<string, Pilot[]>();

  // ライセンス番号またはメールアドレスでグループ化
  pilots.forEach(pilot => {
    const key = pilot.licenseNumber || pilot.email || pilot.name;
    if (!pilotMap.has(key)) {
      pilotMap.set(key, []);
    }
    pilotMap.get(key)!.push(pilot);
  });

  // 重複がある場合は最新のものを残して削除
  const pilotEntries = Array.from(pilotMap.entries());
  for (const [key, duplicates] of pilotEntries) {
    if (duplicates.length > 1) {
      console.log(`重複発見: ${key} (${duplicates.length}件)`);
      
      // 作成日時でソート（新しい順）
      duplicates.sort((a: Pilot, b: Pilot) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // 最新のものを残して他は削除
      for (let i = 1; i < duplicates.length; i++) {
        try {
          await pilotAPI.hardDelete(targetUserId, duplicates[i].pilotId);
          console.log(`  削除: ${duplicates[i].name} (ID: ${duplicates[i].pilotId})`);
        } catch (error) {
          console.error(`  削除エラー: ${duplicates[i].name}`, error);
        }
      }
      console.log(`  保持: ${duplicates[0].name} (ID: ${duplicates[0].pilotId})`);
    }
  }

  console.log('\n=== 重複データクリーンアップ完了 ===');
}

// 直接実行する場合
if (require.main === module) {
  cleanupDuplicates()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('エラーが発生しました:', error);
      process.exit(1);
    });
}