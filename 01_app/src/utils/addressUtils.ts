/**
 * 住所から市以下を抽出する（日本の住所形式）
 * 例: "長崎県五島市" → "五島市"
 * 例: "北海道稚内市" → "稚内市"
 * 例: "北海道利尻郡" → "利尻郡"
 * @param fullAddress 完全な住所
 * @returns 市以下の住所
 */
export function extractCityAndBelow(fullAddress: string): string {
  if (!fullAddress) return '';
  
  // 都道府県名のパターン
  const prefecturePattern = /^(北海道|東京都|大阪府|京都府|.{2,3}県)/;
  
  // 都道府県名を削除
  const cityAndBelow = fullAddress.replace(prefecturePattern, '').trim();
  
  return cityAndBelow || fullAddress;
}

/**
 * 座標を度分秒形式に変換
 * @param decimal 10進数の座標
 * @param isLat 緯度の場合true、経度の場合false
 * @returns 度分秒形式の文字列
 */
export function decimalToDMS(decimal: number, isLat: boolean): string {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesDecimal = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = Math.round((minutesDecimal - minutes) * 60);
  
  const direction = isLat 
    ? (decimal >= 0 ? 'N' : 'S')
    : (decimal >= 0 ? 'E' : 'W');
  
  return `${degrees}°${minutes}'${seconds}"${direction}`;
}

/**
 * 座標を表示用フォーマットに変換
 * @param lat 緯度
 * @param lon 経度
 * @returns フォーマット済みの座標文字列
 */
export function formatCoordinates(lat: number, lon: number): string {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}