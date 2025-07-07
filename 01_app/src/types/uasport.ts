// UAS Port Entity Types

export interface UASPort {
  PK: string; // UASPORT#[uaport_code]
  SK: string; // METADATA#[uaport_code]
  entityType: 'UASPORT';
  uaport_code: string; // 一意のUASポート識別コード (例: "UNAG")
  common_name: string; // UI表示用の通称地名 (例: "長崎")
  full_address: string; // 正式な住所
  location: {
    lat: number;
    lon: number;
  };
  polygon?: {
    lat: number;
    lon: number;
  }[];
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  createdAt: string;
  updatedAt: string;
}

export interface CreateUASPortInput {
  uaport_code: string;
  common_name: string;
  full_address: string;
  location: {
    lat: number;
    lon: number;
  };
  polygon?: {
    lat: number;
    lon: number;
  }[];
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

export interface UpdateUASPortInput {
  uaport_code: string;
  common_name?: string;
  full_address?: string;
  location?: {
    lat: number;
    lon: number;
  };
  polygon?: {
    lat: number;
    lon: number;
  }[];
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}