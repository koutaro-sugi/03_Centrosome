// Flight Location Entity Types

export interface FlightLocation {
  PK: string; // USER#[userId]
  SK: string; // LOCATION#[locationId]
  entityType: 'LOCATION';
  locationId: string; // 一意の地点ID
  userId: string; // 地点を登録したユーザー
  
  // 地点情報
  name: string; // 地点名（表示用）
  address: string; // 住所（町名まで、番地なし）
  fullAddress?: string; // 詳細住所（Geocoding APIからの完全な住所）
  
  // 座標
  coordinates: {
    lat: number;
    lon: number;
  };
  
  // 使用情報
  usageCount: number; // 使用回数
  lastUsedAt?: string; // 最後に使用した日時
  
  // メタデータ
  createdAt: string;
  updatedAt: string;
  tags?: string[]; // カテゴリタグ（例：'離陸地点', '着陸地点', '撮影現場'）
}

export interface CreateFlightLocationInput {
  name: string;
  address: string;
  fullAddress?: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  tags?: string[];
}

export interface UpdateFlightLocationInput {
  locationId: string;
  name?: string;
  address?: string;
  tags?: string[];
}

// 地点選択時の型
export interface LocationSelection {
  locationId?: string; // 既存地点のID
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  saveToDatabase?: boolean; // DBに保存するかどうか
}

// 住所整形用のヘルパー関数
export function formatAddressToTownLevel(fullAddress: string): string {
  // 日本の住所から町名レベルまでを抽出
  // 例: "日本、長崎県長崎市魚の町1-23" → "長崎県長崎市魚の町"
  // 例: "長崎県五島市三井楽町濱ノ畔123-4" → "長崎県五島市三井楽町濱ノ畔"
  
  // まず日本を除去
  let address = fullAddress.replace(/^日本、/, '').replace(/^日本/, '');
  
  // 番地部分を削除（数字-数字、数字番地など）
  address = address.replace(/\d+[-－‐]\d+.*$/, '');
  address = address.replace(/\d+番地.*$/, '');
  address = address.replace(/\d+番.*$/, '');
  address = address.replace(/\d+号.*$/, '');
  address = address.replace(/\d+$/, '');
  
  // 余分なスペースを削除
  address = address.trim();
  
  return address;
}