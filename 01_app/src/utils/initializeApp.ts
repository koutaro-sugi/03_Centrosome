// アプリケーション初期化ユーティリティ
import { uasPortAPI } from '../lib/uasPortApi';
import { initialUASPorts } from '../scripts/initializeUASPorts';
import polygonData from '../scripts/uasPortPolygons.json';

/**
 * UASポートの自動初期化
 * DBにデータがない場合のみ初期化を実行
 */
export async function autoInitializeUASPorts() {
  try {
    console.log('Checking UAS ports in database...');
    
    // 既存のポートを確認
    const existingPorts = await uasPortAPI.listAll();
    
    if (existingPorts && existingPorts.length > 0) {
      console.log(`Found ${existingPorts.length} UAS ports in database. Skip initialization.`);
      return;
    }
    
    console.log('No UAS ports found. Starting auto-initialization...');
    
    // ポリゴンデータマップを作成
    const polygonMap = new Map(
      polygonData.map(port => [port.code, port.polygon])
    );
    
    let successCount = 0;
    
    // 初期データを登録
    for (const portData of initialUASPorts) {
      try {
        await uasPortAPI.create({
          uaport_code: portData.uaport_code,
          common_name: portData.common_name,
          full_address: portData.full_address,
          location: portData.location,
          polygon: polygonMap.get(portData.uaport_code) || portData.polygon,
          status: portData.status,
        });
        successCount++;
        console.log(`✓ Auto-initialized: ${portData.uaport_code}`);
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log(`- ${portData.uaport_code} already exists`);
        } else {
          console.error(`✗ Failed to initialize ${portData.uaport_code}:`, error);
        }
      }
    }
    
    if (successCount > 0) {
      console.log(`✅ Auto-initialization completed: ${successCount} ports created`);
    }
    
  } catch (error) {
    console.error('Auto-initialization error:', error);
    // エラーが発生してもアプリは起動を続ける
  }
}

/**
 * アプリケーション全体の初期化
 */
export async function initializeApp() {
  // UASポートの自動初期化（非同期で実行）
  autoInitializeUASPorts().catch(error => {
    console.error('UAS ports initialization failed:', error);
  });
  
  // 他の初期化処理があればここに追加
}