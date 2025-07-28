# Centra Weather Dashboard クリーンアップログ

## 実施日: 2025-01-27

### 削除対象ファイル
- [ ] `/src/services/amplifyIotService.ts` - Amplify PubSub実装
- [ ] `/src/services/sensorApi.ts` - センサー管理API
- [ ] `/src/components/WeatherStationCard.tsx` - 気象ステーションカード
- [ ] `/src/components/WeatherStationList.tsx` - 気象ステーションリスト
- [ ] `/src/components/WeatherDashboard.tsx` - 気象ダッシュボード
- [ ] `/src/pages/Weather.tsx` - Weatherページ

### AWSリソース（保持）
- ✅ `centra-list-sensors` Lambda関数 - 他の用途で使用する可能性があるため保持
- ✅ API Gateway (`ex4ezakdah`) - 他のエンドポイントと共用のため保持
- ✅ Cognito User Pool - 認証基盤として保持
- ✅ Identity Pool - 将来の使用に備えて保持

### 次のステップ
1. 手動で上記ファイルを削除
2. `git add -A && git commit -m "feat: remove old weather implementation"`
3. AppSync APIの構築を開始

### 注意事項
- 削除前に必ずバックアップを取ること
- 他のページ（Flights, Plan等）への影響がないことを確認
- package.jsonの不要な依存関係も後で確認