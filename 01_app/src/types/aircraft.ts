// Aircraft Entity Types

export interface Aircraft {
  PK: string; // USER#[userId]
  SK: string; // AIRCRAFT#[aircraftId]
  entityType: 'AIRCRAFT';
  aircraftId: string; // 一意の機体ID
  userId: string; // 機体を登録したユーザー
  
  // 機体情報
  name: string; // 機体名（表示用）
  registrationNumber: string; // 登録記号（JA12345など）
  manufacturer: string; // メーカー名
  model: string; // モデル名
  serialNumber?: string; // シリアル番号
  
  // 運用情報
  totalFlightTime: number; // 総飛行時間（分）
  lastMaintenanceDate?: string; // 最終メンテナンス日
  nextMaintenanceDate?: string; // 次回メンテナンス予定日
  
  // メタデータ
  createdAt: string;
  updatedAt: string;
  isActive: boolean; // 有効/無効フラグ
}

export interface CreateAircraftInput {
  name: string;
  registrationNumber: string;
  manufacturer: string;
  model: string;
  serialNumber?: string;
}

export interface UpdateAircraftInput {
  aircraftId: string;
  name?: string;
  registrationNumber?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  totalFlightTime?: number;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  isActive?: boolean;
}