/**
 * 入力データサニタイゼーション
 * ユーザー入力を安全に処理するためのユーティリティ
 */

/**
 * HTMLエンティティをエスケープ
 * XSS攻撃を防ぐ基本的なサニタイゼーション
 */
export const escapeHtml = (str: string): string => {
  const htmlEscapes: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };
  
  return str.replace(/[&<>"'\/]/g, (match) => htmlEscapes[match]);
};

/**
 * SQLインジェクション対策用のサニタイゼーション
 * DynamoDBでは不要だが、念のため実装
 */
export const escapeSql = (str: string): string => {
  return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case '\0': return '\\0';
      case '\x08': return '\\b';
      case '\x09': return '\\t';
      case '\x1a': return '\\z';
      case '\n': return '\\n';
      case '\r': return '\\r';
      case '"':
      case "'":
      case '\\':
      case '%':
        return '\\' + char;
      default:
        return char;
    }
  });
};

/**
 * URLパラメータのサニタイゼーション
 */
export const sanitizeUrlParam = (param: string): string => {
  return encodeURIComponent(param);
};

/**
 * デバイスIDのバリデーションとサニタイゼーション
 * 期待される形式: M-X-001, M-X-002等
 */
export const sanitizeDeviceId = (deviceId: string): string | null => {
  // モックデバイス: X-X-001形式、Madoデバイス: M-X, M-01形式
  const deviceIdPattern = /^([A-Z]-[A-Z]-\d{3}|M-[A-Z0-9]{1,2})$/;
  
  console.log('Sanitizing device ID:', deviceId, 'Pattern test:', deviceIdPattern.test(deviceId)); // デバッグログ
  
  if (!deviceIdPattern.test(deviceId)) {
    console.error('Invalid device ID format:', deviceId);
    return null;
  }
  
  return deviceId;
};

/**
 * タイムスタンプのバリデーションとサニタイゼーション
 * ISO 8601形式を期待
 */
export const sanitizeTimestamp = (timestamp: string): string | null => {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      console.error('Invalid timestamp:', timestamp);
      return null;
    }
    return date.toISOString();
  } catch (error) {
    console.error('Error parsing timestamp:', error);
    return null;
  }
};

/**
 * 数値入力のサニタイゼーション
 * 範囲チェックを含む
 */
export const sanitizeNumericInput = (
  value: string | number,
  min: number,
  max: number
): number | null => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    console.error('Invalid numeric input:', value);
    return null;
  }
  
  if (num < min || num > max) {
    console.error(`Value ${num} out of range [${min}, ${max}]`);
    return null;
  }
  
  return num;
};

/**
 * 気象データのサニタイゼーション
 * 各フィールドの妥当性をチェック
 */
export const sanitizeWeatherData = (data: any): any => {
  const sanitized: any = {};
  
  // デバイスID
  if (data.deviceId) {
    const cleanDeviceId = sanitizeDeviceId(data.deviceId);
    if (!cleanDeviceId) throw new Error('Invalid device ID');
    sanitized.deviceId = cleanDeviceId;
  }
  
  // タイムスタンプ
  if (data.timestamp) {
    const cleanTimestamp = sanitizeTimestamp(data.timestamp);
    if (!cleanTimestamp) throw new Error('Invalid timestamp');
    sanitized.timestamp = cleanTimestamp;
  }
  
  // 温度: -50°C ~ 60°C
  if (data.temperature !== undefined) {
    const temp = sanitizeNumericInput(data.temperature, -50, 60);
    if (temp === null) throw new Error('Invalid temperature');
    sanitized.temperature = temp;
  }
  
  // 湿度: 0% ~ 100%
  if (data.humidity !== undefined) {
    const humidity = sanitizeNumericInput(data.humidity, 0, 100);
    if (humidity === null) throw new Error('Invalid humidity');
    sanitized.humidity = humidity;
  }
  
  // 気圧: 800hPa ~ 1100hPa
  if (data.pressure !== undefined) {
    const pressure = sanitizeNumericInput(data.pressure, 800, 1100);
    if (pressure === null) throw new Error('Invalid pressure');
    sanitized.pressure = pressure;
  }
  
  // 風速: 0m/s ~ 100m/s
  if (data.windSpeed !== undefined) {
    const windSpeed = sanitizeNumericInput(data.windSpeed, 0, 100);
    if (windSpeed === null) throw new Error('Invalid wind speed');
    sanitized.windSpeed = windSpeed;
  }
  
  // 風向: 0° ~ 360°
  if (data.windDirection !== undefined) {
    const windDir = sanitizeNumericInput(data.windDirection, 0, 360);
    if (windDir === null) throw new Error('Invalid wind direction');
    sanitized.windDirection = windDir;
  }
  
  // 降水量: 0mm ~ 1000mm
  if (data.rainfall !== undefined) {
    const rainfall = sanitizeNumericInput(data.rainfall, 0, 1000);
    if (rainfall === null) throw new Error('Invalid rainfall');
    sanitized.rainfall = rainfall;
  }
  
  // 照度: 0lux ~ 150000lux
  if (data.illuminance !== undefined) {
    const illuminance = sanitizeNumericInput(data.illuminance, 0, 150000);
    if (illuminance === null) throw new Error('Invalid illuminance');
    sanitized.illuminance = illuminance;
  }
  
  // 視程: 0km ~ 50km
  if (data.visibility !== undefined) {
    const visibility = sanitizeNumericInput(data.visibility, 0, 50);
    if (visibility === null) throw new Error('Invalid visibility');
    sanitized.visibility = visibility;
  }
  
  // 体感温度: -60°C ~ 70°C
  if (data.feelsLike !== undefined) {
    const feelsLike = sanitizeNumericInput(data.feelsLike, -60, 70);
    if (feelsLike === null) throw new Error('Invalid feels like temperature');
    sanitized.feelsLike = feelsLike;
  }
  
  return sanitized;
};

/**
 * GraphQLクエリパラメータのサニタイゼーション
 * 深度制限チェックを含む
 */
export const sanitizeGraphQLParams = (params: any, maxDepth: number = 10): any => {
  const checkDepth = (obj: any, currentDepth: number = 0): void => {
    if (currentDepth > maxDepth) {
      throw new Error(`GraphQL query depth exceeds maximum allowed depth of ${maxDepth}`);
    }
    
    if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(value => {
        checkDepth(value, currentDepth + 1);
      });
    }
  };
  
  checkDepth(params);
  return params;
};