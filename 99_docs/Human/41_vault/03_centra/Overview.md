# 03_centra - UAV統合監視システム

## プロジェクト概要
**プロジェクト名**: Centra (旧称: Centrosome)  
**プロジェクト番号**: 03_centra  
**概要**: ドローン物流・監視飛行向けの統合監視システム

## 主要機能
- フライトプラン管理
- リアルタイムテレメトリ表示（MAVLink）
- 低遅延映像配信（AWS KVS WebRTC）
- 機体情報管理
- フライトログ記録

## 技術スタック
### フロントエンド
- React 19.1.0 + TypeScript 4.9.5
- Material-UI v7.2.0
- Mapbox GL 3.13.0
- React Router v7.6.3

### バックエンド
- AWS SDK v3 (DynamoDB, Cognito)
- AWS KVS WebRTC
- WebSocket (MAVLink通信)

### エッジデバイス
- Raspberry Pi 5
- MAVProxy
- GStreamer

## ディレクトリ構造
```
03_centra/
├── 01_app/          # メインWebアプリケーション
├── edge/            # Raspberry Pi関連
│   ├── telepath/    # MAVLink通信システム
│   └── fpv-streaming/ # 映像配信
└── 99_docs/         # プロジェクト文書
```

## 関連リンク
- [[Current Tasks|現在のタスク]]
- [[Versions/2025-07-06|最新バージョン情報]]