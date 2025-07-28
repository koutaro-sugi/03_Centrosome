# セキュリティ実装ガイド

## 概要

このドキュメントは、Centra Weather Dashboardアプリケーションのセキュリティ機能について説明します。

## 実装されているセキュリティ機能

### 1. Cognito認証とトークン管理

**実装場所**: `src/contexts/SecurityContext.tsx`

- AWS Cognitoによるユーザー認証
- JWTトークンの自動リフレッシュ（有効期限の5分前）
- 認証状態の集中管理
- トークン検証の定期実行（1分ごと）

```typescript
// 使用例
const { isAuthenticated, authTokens, refreshToken } = useSecurityContext();
```

### 2. GraphQL深度制限とクエリ検証

**実装場所**: `src/utils/security/graphqlSecurity.ts`

設定値:
- 最大深度: 10
- 最大エイリアス数: 15
- 最大トークン数: 1000

```typescript
// 自動的に適用される検証
const validation = validateGraphQLQuery(query);
if (!validation.valid) {
  throw new Error(validation.error);
}
```

### 3. 入力データサニタイゼーション

**実装場所**: `src/utils/security/sanitizer.ts`

実装されているサニタイザー:
- HTMLエスケープ（XSS対策）
- SQLエスケープ（念のため）
- URLパラメータエンコーディング
- デバイスIDバリデーション
- タイムスタンプバリデーション
- 数値範囲チェック
- 気象データの包括的な検証

```typescript
// 使用例
const sanitizedDeviceId = sanitizeDeviceId(userInput);
if (!sanitizedDeviceId) {
  throw new Error('Invalid device ID');
}
```

### 4. HTTPS強制とセキュリティヘッダー

**実装場所**: 
- `src/utils/security/httpsRedirect.ts`
- `public/index.html`

機能:
- 本番環境でのHTTPSリダイレクト
- セキュアコンテキストの検証
- Mixed Contentの検出
- セキュリティヘッダーのメタタグ設定

### 5. レート制限

**実装場所**: `src/utils/security/graphqlSecurity.ts`

デフォルト設定:
- 1分間に100リクエストまで
- 識別子ベースの制限

```typescript
if (!checkRateLimit(identifier)) {
  throw new Error('Rate limit exceeded');
}
```

## セキュリティベストプラクティス

### 開発時の注意事項

1. **センシティブ情報の取り扱い**
   - APIキーやシークレットをコードに直接記載しない
   - 環境変数を使用する
   - ログにセンシティブ情報を出力しない

2. **入力検証**
   - すべてのユーザー入力をサニタイズする
   - ホワイトリスト方式で検証する
   - 適切な範囲チェックを実装する

3. **エラーハンドリング**
   - 詳細なエラー情報を外部に漏らさない
   - セキュリティイベントをログに記録する
   - 適切なフォールバック処理を実装する

### デプロイ時の設定

1. **CloudFront/ALBでのセキュリティヘッダー設定**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://*.amazonaws.com
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

2. **WAF（Web Application Firewall）の設定**
   - SQLインジェクション対策
   - XSS対策
   - レート制限
   - 地域制限（必要に応じて）

3. **Cognito設定**
   - パスワードポリシーの強化
   - MFA（多要素認証）の有効化
   - アカウントロックアウトポリシー

## セキュリティ監査チェックリスト

- [ ] すべてのAPIエンドポイントが認証で保護されている
- [ ] 入力データが適切にサニタイズされている
- [ ] HTTPSが強制されている
- [ ] セキュリティヘッダーが設定されている
- [ ] レート制限が実装されている
- [ ] エラーメッセージにセンシティブ情報が含まれていない
- [ ] ログにセンシティブ情報が記録されていない
- [ ] 依存関係に既知の脆弱性がない

## インシデント対応

セキュリティインシデントが発生した場合:

1. 影響範囲の特定
2. 該当ユーザーの一時的なアクセス制限
3. ログの収集と分析
4. 脆弱性の修正
5. 影響を受けたユーザーへの通知
6. 再発防止策の実装

## 更新履歴

- 2025-01-27: 初版作成（タスク16実装）