// Flight Log Entity Types

export interface FlightLog {
  PK: string; // USER#[userId]
  SK: string; // FLIGHTLOG#[date]#[logId]
  entityType: 'FLIGHTLOG';
  logId: string; // 一意の飛行記録ID
  userId: string; // 記録作成者
  
  // 基本情報
  flightDate: string; // 飛行日 YYYY-MM-DD
  flightStartTime?: string; // 飛行開始時刻 HH:MM
  flightEndTime?: string; // 飛行終了時刻 HH:MM
  
  // パイロット情報
  pilotName: string; // 操縦者氏名
  pilotLicenseNumber?: string; // 技能証明番号
  
  // 機体情報
  aircraftId?: string; // 機体ID（Aircraft entityと連携）
  registrationNumber: string; // 無人航空機の登録記号
  
  // 飛行情報
  flightType?: string[]; // 飛行形態（複数選択可）: 'DANGEROUS_GOODS', 'OBJECT_DROP', 'OVER_25KG', etc.
  takeoffLocation?: {
    locationId?: string; // 保存された地点のID
    name: string;
    address: string;
    coordinates: {
      lat: number;
      lon: number;
    };
    uasportCode?: string; // UASポートコード
  };
  landingLocation?: {
    locationId?: string; // 保存された地点のID
    name: string;
    address: string;
    coordinates: {
      lat: number;
      lon: number;
    };
    uasportCode?: string; // UASポートコード
  };
  
  // 飛行記録
  flightPurpose?: string; // 飛行目的
  flightRemarks?: string; // 備考
  
  // 不具合・処置
  squawks?: FlightSquawk[]; // 不具合事項
  
  // メタデータ
  createdAt: string;
  updatedAt: string;
  status: 'DRAFT' | 'COMPLETED' | 'ARCHIVED';
}

export interface FlightSquawk {
  id: string;
  description: string; // 不具合内容
  correctiveAction?: string; // 処置内容
  timestamp: string;
}

export interface CreateFlightLogInput {
  flightDate: string;
  pilotName: string;
  registrationNumber: string;
  pilotLicenseNumber?: string;
  aircraftId?: string;
  flightType?: string[];
  flightStartTime?: string;
  flightEndTime?: string;
  takeoffLocation?: {
    locationId?: string;
    name: string;
    address: string;
    coordinates: {
      lat: number;
      lon: number;
    };
    uasportCode?: string;
  };
  landingLocation?: {
    locationId?: string;
    name: string;
    address: string;
    coordinates: {
      lat: number;
      lon: number;
    };
    uasportCode?: string;
  };
  flightPurpose?: string;
  flightRemarks?: string;
}

export interface UpdateFlightLogInput extends Partial<CreateFlightLogInput> {
  logId: string;
  squawks?: FlightSquawk[];
  status?: 'DRAFT' | 'COMPLETED' | 'ARCHIVED';
}

// 飛行形態の定数
export const FLIGHT_TYPES = {
  DANGEROUS_GOODS: { value: 'DANGEROUS_GOODS', label: '危険物輸送' },
  OBJECT_DROP: { value: 'OBJECT_DROP', label: '物件投下' },
  OVER_25KG: { value: 'OVER_25KG', label: '25kg以上' },
  NIGHT_FLIGHT: { value: 'NIGHT_FLIGHT', label: '夜間飛行' },
  BVLOS: { value: 'BVLOS', label: '目視外飛行' },
  DID: { value: 'DID', label: 'DID（人口集中地区）' },
  ABOVE_150M: { value: 'ABOVE_150M', label: '150m以上' },
  EVENT: { value: 'EVENT', label: 'イベント上空' },
  NEAR_PEOPLE: { value: 'NEAR_PEOPLE', label: '人・物30m未満' },
} as const;