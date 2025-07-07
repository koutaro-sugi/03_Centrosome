// UAS Port Lookup Service
import { isPointInPolygon } from '../utils/geoUtils';
import { uasPortAPI } from '../lib/uasPortApi';
import { UASPort } from '../types/uasport';
import { initialUASPorts } from '../scripts/initializeUASPorts';

export class UASPortLookupService {
  private static cachedPorts: UASPort[] | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5分

  /**
   * 全てのUASポートを取得（キャッシュ付き）
   */
  private static async getAllPorts(): Promise<UASPort[]> {
    const now = Date.now();
    
    // キャッシュが有効な場合はキャッシュを返す
    if (this.cachedPorts && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cachedPorts;
    }

    try {
      this.cachedPorts = await uasPortAPI.listAll();
      this.cacheTimestamp = now;
      
      // DBにデータがない場合はハードコードされたデータを使用
      if (!this.cachedPorts || this.cachedPorts.length === 0) {
        console.log('No UAS ports in DB, using hardcoded data');
        // ハードコードされたデータをUASPort形式に変換
        this.cachedPorts = initialUASPorts.map(port => ({
          PK: `UASPORT#${port.uaport_code}`,
          SK: `METADATA#${port.uaport_code}`,
          entityType: 'UASPORT' as const,
          ...port,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }
      
      return this.cachedPorts;
    } catch (error) {
      console.error('Error fetching UAS ports, using hardcoded data:', error);
      // エラー時はハードコードされたデータを返す（フォールバック）
      return initialUASPorts.map(port => ({
        PK: `UASPORT#${port.uaport_code}`,
        SK: `METADATA#${port.uaport_code}`,
        entityType: 'UASPORT' as const,
        ...port,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }
  }

  /**
   * 座標がどのUASポート内にあるかを判定
   * @param point 判定したい座標
   * @returns UASポートコード、またはnull
   */
  static async findPortByCoordinates(point: { lat: number; lon: number }): Promise<string | null> {
    const ports = await this.getAllPorts();
    
    for (const port of ports) {
      if (port.polygon && isPointInPolygon(point, port.polygon)) {
        return port.uaport_code;
      }
    }
    
    return null;
  }

  /**
   * 複数の座標からUASポートを特定
   * @param takeoffPoint 離陸地点
   * @param landingPoint 着陸地点
   * @returns 離陸・着陸ポートコード
   */
  static async identifyPortsForFlight(
    takeoffPoint: { lat: number; lon: number },
    landingPoint: { lat: number; lon: number }
  ): Promise<{ departurePort: string | null; destinationPort: string | null }> {
    const [departurePort, destinationPort] = await Promise.all([
      this.findPortByCoordinates(takeoffPoint),
      this.findPortByCoordinates(landingPoint)
    ]);

    return { departurePort, destinationPort };
  }

  /**
   * UASポートコードから名前を取得
   * @param code UASポートコード
   * @returns ポート名、またはコード
   */
  static async getPortName(code: string): Promise<string> {
    try {
      const ports = await this.getAllPorts();
      const port = ports.find(p => p.uaport_code === code);
      return port?.common_name || code;
    } catch (error) {
      console.error('Error getting port name:', error);
      // フォールバック：ハードコードされたデータから取得
      const port = initialUASPorts.find(p => p.uaport_code === code);
      return port?.common_name || code;
    }
  }

  /**
   * キャッシュをクリア
   */
  static clearCache(): void {
    this.cachedPorts = null;
    this.cacheTimestamp = 0;
  }
}