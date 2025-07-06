// ウェイポイント距離のフィルタリング
// 異常値を除外し、滑らかな変化を実現

export class WpDistanceFilter {
  private history: number[] = [];
  private readonly maxHistorySize = 10;
  private readonly maxChangeRate = 100; // m/s - 最大変化率
  private lastValidValue: number | null = null;
  private lastUpdateTime: number | null = null;

  /**
   * 新しいwp_dist値をフィルタリング
   * @param rawValue 生のwp_dist値（メートル）
   * @returns フィルタリング後の値
   */
  filter(rawValue: number): number {
    const now = Date.now();
    
    // 初回または長時間経過後
    if (this.lastValidValue === null || 
        this.lastUpdateTime === null || 
        now - this.lastUpdateTime > 5000) {
      this.lastValidValue = rawValue;
      this.lastUpdateTime = now;
      this.history = [rawValue];
      return rawValue;
    }

    // 経過時間（秒）
    const deltaTime = (now - this.lastUpdateTime) / 1000;
    
    // 最大許容変化量（機体速度25m/s + マージン）
    const maxChange = this.maxChangeRate * deltaTime;
    
    // 変化量チェック
    const change = Math.abs(rawValue - this.lastValidValue);
    
    if (change > maxChange) {
      // 異常値として無視
      console.log(`[WpDistFilter] 異常値を検出: ${this.lastValidValue}m → ${rawValue}m (変化: ${change}m, 許容: ${maxChange}m)`);
      return this.lastValidValue;
    }
    
    // 履歴に追加
    this.history.push(rawValue);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
    
    // 移動平均で平滑化
    const average = this.history.reduce((a, b) => a + b, 0) / this.history.length;
    
    this.lastValidValue = average;
    this.lastUpdateTime = now;
    
    return Math.round(average);
  }

  /**
   * フィルタをリセット
   */
  reset() {
    this.history = [];
    this.lastValidValue = null;
    this.lastUpdateTime = null;
  }
}