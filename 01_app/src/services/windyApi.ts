// Windy API Service
// Supports both Map Forecast API and Point Forecast API

// Point Forecast API Types
interface WindyPointForecastRequest {
  lat: number;
  lon: number;
  model: string;
  parameters: string[];
  levels?: string[];
  key: string;
}

interface WindyPointForecastResponse {
  ts: number[];
  units: Record<string, string>;
  [key: string]: any;
}

export interface ProcessedWeatherData {
  location: {
    name: string;
    lat: number;
    lon: number;
  };
  current: {
    temperature: number;
    windSpeed: number;
    windDirection: number;
    humidity: number;
    pressure: number;
    visibility: number;
    cloudCover: number;
    precipitation: number;
  };
  forecast: {
    time: string;
    temperature: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
  }[];
  timestamp: string;
  model: string;
}

// API Endpoints
const WINDY_POINT_FORECAST_ENDPOINT = 'https://api.windy.com/api/point-forecast/v2';
const WINDY_MAP_FORECAST_BASE = 'https://api.windy.com/assets/map-forecast/';

// API Types
export enum WindyApiType {
  POINT_FORECAST = 'point',
  MAP_FORECAST = 'map'
}

// Map Forecast API Configuration
export interface MapForecastConfig {
  key: string;
  overlay?: string; // wind, temp, rain, etc.
  level?: string; // surface, 500h, etc.
}


// Get appropriate API key based on API type
const getApiKey = (apiType: WindyApiType): string => {
  if (apiType === WindyApiType.POINT_FORECAST) {
    return process.env.REACT_APP_WINDY_POINT_FORECAST_KEY || '';
  } else {
    return process.env.REACT_APP_WINDY_MAP_FORECAST_KEY || '';
  }
};

// Check which APIs are available
export const getAvailableApis = (): { point: boolean; map: boolean } => {
  const pointKey = process.env.REACT_APP_WINDY_POINT_FORECAST_KEY;
  const mapKey = process.env.REACT_APP_WINDY_MAP_FORECAST_KEY;
  
  console.log('[Windy API] Environment check:', {
    pointKeyExists: !!pointKey,
    pointKeyLength: pointKey?.length || 0,
    mapKeyExists: !!mapKey,
    mapKeyLength: mapKey?.length || 0,
    // デバッグ用：最初の8文字だけ表示
    pointKeyPrefix: pointKey ? pointKey.substring(0, 8) + '...' : 'undefined',
    mapKeyPrefix: mapKey ? mapKey.substring(0, 8) + '...' : 'undefined'
  });
  
  return {
    point: !!pointKey,
    map: !!mapKey
  };
};

export const fetchWindyPointForecast = async (
  lat: number,
  lon: number,
  apiKey?: string,
  model: string = 'gfs'
): Promise<ProcessedWeatherData> => {
  console.log('[Windy API] fetchWindyPointForecast called with:', { lat, lon, model });
  
  // Use provided key or get from environment
  const key = apiKey || getApiKey(WindyApiType.POINT_FORECAST);
  console.log('[Windy API] API Key available:', !!key, key ? 'Key starts with: ' + key.substring(0, 8) : 'No key');
  
  if (!key) {
    throw new Error('Windy Point Forecast API key not configured');
  }
  const request: WindyPointForecastRequest = {
    lat,
    lon,
    model,
    parameters: [
      'temp',          // 気温
      'wind',          // 風速・風向
      'windGust',      // 突風
      'rh',            // 相対湿度
      'pressure',      // 気圧
      'dewpoint',      // 露点
      'lclouds',       // 下層雲
      'mclouds',       // 中層雲
      'hclouds',       // 上層雲
      'precip'         // 降水量
    ],
    levels: ['surface'],  // levelsを配列として追加
    key: key
  };

  try {
    console.log('[Windy API] Sending request to:', WINDY_POINT_FORECAST_ENDPOINT);
    console.log('[Windy API] Request body:', JSON.stringify(request));
    
    const response = await fetch(WINDY_POINT_FORECAST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    console.log('[Windy API] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Windy API] Error response:', errorText);
      throw new Error(`Windy API error: ${response.status} - ${errorText}`);
    }

    const data: WindyPointForecastResponse = await response.json();
    
    // 開発者コンソールにレスポンスを出力
    console.log('[Windy API Response]', {
      endpoint: WINDY_POINT_FORECAST_ENDPOINT,
      request: {
        lat,
        lon,
        model,
        parameters: request.parameters
      },
      response: data
    });
    
    // 最初のタイムスタンプのデータを現在の気象データとして使用
    const currentIndex = 0;
    
    // wind_u と wind_v コンポーネントから風速と風向を計算
    const windU = data['wind_u-surface']?.[currentIndex] || 0;
    const windV = data['wind_v-surface']?.[currentIndex] || 0;
    const windSpeed = Math.sqrt(windU * windU + windV * windV); // m/s
    const windDirection = (Math.atan2(-windU, -windV) * 180 / Math.PI + 360) % 360; // 度単位
    
    // 雲量を計算（低層雲、中層雲、上層雲の最大値）
    const cloudCover = Math.max(
      data['lclouds-surface']?.[currentIndex] || 0,
      data['mclouds-surface']?.[currentIndex] || 0,
      data['hclouds-surface']?.[currentIndex] || 0
    );
    
    // レスポンスを処理して使いやすい形式に変換
    const processedData: ProcessedWeatherData = {
      location: {
        name: '',  // 別途Geocoding APIで取得
        lat,
        lon
      },
      current: {
        temperature: Math.round((data['temp-surface']?.[currentIndex] || 0) - 273.15), // KelvinからCelsiusに変換
        windSpeed: Math.round(windSpeed * 10) / 10, // 小数点1桁に丸める
        windDirection: Math.round(windDirection),
        humidity: Math.round(data['rh-surface']?.[currentIndex] || 0),
        pressure: Math.round((data['pressure-surface']?.[currentIndex] || 101300) / 100), // PaからhPaに変換
        visibility: 10, // Windy APIには視程データがないため固定値
        cloudCover: Math.round(cloudCover),
        precipitation: data['past3hprecip-surface']?.[currentIndex] || 0
      },
      forecast: data.ts.slice(0, 24).map((timestamp, index) => {
        const u = data['wind_u-surface']?.[index] || 0;
        const v = data['wind_v-surface']?.[index] || 0;
        const speed = Math.sqrt(u * u + v * v);
        const dir = (Math.atan2(-u, -v) * 180 / Math.PI + 360) % 360;
        
        return {
          time: new Date(timestamp).toISOString(),
          temperature: Math.round((data['temp-surface']?.[index] || 0) - 273.15),
          windSpeed: Math.round(speed * 10) / 10, // m/s
          windDirection: Math.round(dir),
          precipitation: data['past3hprecip-surface']?.[index] || 0
        };
      }),
      timestamp: new Date().toISOString(),
      model: model.toUpperCase()
    };

    return processedData;
  } catch (error) {
    console.error('Windy API fetch error:', error);
    throw error;
  }
};

// 離陸地点と着陸地点の気象データを取得
export const fetchFlightWeather = async (
  takeoffCoords: { lat: number; lon: number },
  landingCoords: { lat: number; lon: number },
  apiKey?: string,
  model: string = 'gfs'
): Promise<{
  takeoff: ProcessedWeatherData;
  landing: ProcessedWeatherData;
}> => {
  console.log('[fetchFlightWeather] Called with coords:', { takeoffCoords, landingCoords });
  
  const [takeoffWeather, landingWeather] = await Promise.all([
    fetchWindyPointForecast(takeoffCoords.lat, takeoffCoords.lon, apiKey, model),
    fetchWindyPointForecast(landingCoords.lat, landingCoords.lon, apiKey, model)
  ]);

  // ロケーション名を設定（後でPlanDetailsWithForecastコンポーネントで上書きされる）
  takeoffWeather.location.name = 'Departure';
  landingWeather.location.name = 'Destination';

  return { takeoff: takeoffWeather, landing: landingWeather };
};

// Mapbox Geocoding APIから地名を取得（既存の実装を参考）
// async function getPlaceName(lat: number, lon: number, mapboxToken: string): Promise<string | null> {
//   try {
//     const response = await fetch(
//       `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${mapboxToken}`
//     );
//     const data = await response.json();
//     
//     if (data.features && data.features.length > 0) {
//       const place = data.features[0];
//       const name = place.place_name?.split(',')[0] || place.text;
//       return name?.toUpperCase() || null;
//     }
//     return null;
//   } catch (error) {
//     console.error('Geocoding error:', error);
//     return null;
//   }
// }

// Map Forecast API helper function
export const getWindyMapUrl = (config: MapForecastConfig): string => {
  const baseUrl = `${WINDY_MAP_FORECAST_BASE}${config.key}`;
  const params = new URLSearchParams();
  
  if (config.overlay) params.append('overlay', config.overlay);
  if (config.level) params.append('level', config.level);
  
  return `${baseUrl}?${params.toString()}`;
};