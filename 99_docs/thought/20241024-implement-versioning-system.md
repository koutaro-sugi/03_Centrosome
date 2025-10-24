# Title: バージョン管理システムの実装

## Date
2024-10-24

## Decision
セマンティックバージョニング（MAJOR.MINOR.PATCH-COMMIT_HASH形式）を採用し、99_docs/version/VERSIONS.mdで履歴を管理する。

## Rationale
- デプロイされたバージョンとコードの正確な対応付けが必要
- ログからバージョンを特定し、バグの原因コミットを追跡する必要がある
- フロントエンドとバックエンドのバージョン不一致を検知する必要がある
- 「自分の変更が反映されているか？」という不確実性を解消

## Implementation
1. **99_docs/version/VERSIONS.md**: バージョン履歴の一元管理
2. **src/lib/version.ts**: バージョン情報の取得API
3. **scripts/update-version.sh**: バージョン自動更新スクリプト
4. **UI表示**: Sidebarの右下にバージョン番号表示
5. **コンソールログ**: アプリ起動時にバージョン情報を表示

## Alternatives Considered
- package.jsonのversionフィールドのみ使用 → コミットハッシュとの対応が取れない
- ビルド時に自動生成 → 手動更新で意識的にバージョン管理を行う方針

## Format
```
MAJOR.MINOR.PATCH-COMMIT_HASH
例: 0.1.0-033777f
```

- **MAJOR**: 破壊的変更、メジャーリライト（初期開発は0）
- **MINOR**: 新機能、重要な更新（開発中は頻繁にインクリメント）
- **PATCH**: バグ修正、マイナー変更
- **COMMIT_HASH**: Gitコミットハッシュの最初の7文字

## Follow-ups
- [ ] サーバーログにバージョン情報を含める（pino baseフィールド）
- [ ] デバッグメニューからログエクスポート時にファイル名にバージョンを含める
- [ ] 将来的にバージョン間の変更差分を自動生成

## Benefits
- ✅ デプロイバージョンの即座の特定
- ✅ ログとコードの対応付け
- ✅ バグ追跡の効率化
- ✅ デプロイ確認の確実性

## References
- 07_Blacksmith/AGENT.md - Semantic Versioning with 99_Doc/version/
- https://semver.org/

