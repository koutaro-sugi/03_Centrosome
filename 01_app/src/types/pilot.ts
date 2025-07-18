// Pilot Entity Types

export interface Pilot {
  PK: string; // USER#[userId]
  SK: string; // PILOT#[pilotId]
  entityType: 'PILOT';
  pilotId: string; // 一意のパイロットID
  userId: string; // パイロットを登録したユーザー
  
  // パイロット情報
  name: string; // 氏名
  licenseNumber?: string; // 技能証明番号
  email?: string; // メールアドレス
  phone?: string; // 電話番号
  
  // メタデータ
  createdAt: string;
  updatedAt: string;
  isActive: boolean; // 有効/無効フラグ
}

export interface CreatePilotInput {
  name: string;
  licenseNumber?: string;
  email?: string;
  phone?: string;
}

export interface UpdatePilotInput {
  pilotId: string;
  name?: string;
  licenseNumber?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
}