// Geographical utility functions

/**
 * ポイントがポリゴン内にあるかを判定 (Ray-casting algorithm)
 * @param point 判定したい点 {lat, lon}
 * @param polygon ポリゴンの頂点配列 [{lat, lon}, ...]
 * @returns ポイントがポリゴン内にある場合true
 */
export function isPointInPolygon(
  point: { lat: number; lon: number },
  polygon: { lat: number; lon: number }[]
): boolean {
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lon;
    const yi = polygon[i].lat;
    const xj = polygon[j].lon;
    const yj = polygon[j].lat;
    
    const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
        (point.lon < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * ポリゴンの中心点を計算
 * @param polygon ポリゴンの頂点配列
 * @returns 中心点の座標
 */
export function getPolygonCenter(polygon: { lat: number; lon: number }[]): { lat: number; lon: number } {
  if (polygon.length === 0) {
    throw new Error('Polygon must have at least one point');
  }
  
  let sumLat = 0;
  let sumLon = 0;
  
  // 最後の点が最初の点と同じ場合は除外
  const uniquePoints = polygon[polygon.length - 1].lat === polygon[0].lat && 
                      polygon[polygon.length - 1].lon === polygon[0].lon
    ? polygon.slice(0, -1)
    : polygon;
  
  for (const point of uniquePoints) {
    sumLat += point.lat;
    sumLon += point.lon;
  }
  
  return {
    lat: sumLat / uniquePoints.length,
    lon: sumLon / uniquePoints.length
  };
}

/**
 * 2点間の距離を計算 (Haversine formula)
 * @param point1 最初の点
 * @param point2 2番目の点
 * @returns 距離（メートル）
 */
export function calculateDistance(
  point1: { lat: number; lon: number },
  point2: { lat: number; lon: number }
): number {
  const R = 6371e3; // 地球の半径（メートル）
  const φ1 = point1.lat * Math.PI / 180;
  const φ2 = point2.lat * Math.PI / 180;
  const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
  const Δλ = (point2.lon - point1.lon) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}