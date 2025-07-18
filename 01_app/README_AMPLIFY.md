# Amplify Gen2 デプロイ手順

## 目次
1. [前提条件](#前提条件)
2. [初回セットアップ](#初回セットアップ)
3. [デプロイ手順](#デプロイ手順)
4. [認証機能の有効化](#認証機能の有効化)
5. [トラブルシューティング](#トラブルシューティング)

## 前提条件

- AWS アカウント
- Node.js 18以上
- Git がインストールされていること

## 初回セットアップ

1. **AWS CLIの設定**（まだの場合）
   ```bash
   aws configure
   ```

2. **Amplifyサンドボックスの起動**（ローカルテスト用）
   ```bash
   npx ampx sandbox
   ```
   このコマンドで `amplify_outputs.json` が自動生成されます。

## デプロイ手順

### 1. Git にコミット
```bash
git add .
git commit -m "feat: Add Amplify Gen2 configuration"
git push origin main
```

### 2. Amplify Consoleでアプリを作成

1. [AWS Amplify Console](https://console.aws.amazon.com/amplify/) にアクセス
2. 「新しいアプリケーション」→「ウェブアプリケーションをホスト」を選択
3. GitHubリポジトリを接続
4. ブランチを選択（main）
5. 「Gen 2」を選択
6. ビルド設定は自動検出されるはずですが、以下を確認：
   - フレームワーク: React
   - ビルドコマンド: `npm run build`
   - 出力ディレクトリ: `build`

### 3. 環境変数の設定

Amplify Console の「環境変数」セクションで以下を設定：

```
REACT_APP_MAPBOX_ACCESS_TOKEN=your_mapbox_token
REACT_APP_AWS_REGION=ap-northeast-1
REACT_APP_DYNAMODB_TABLE_NAME=your_table_name
```

### 4. デプロイ

「保存してデプロイ」をクリックすると自動的にビルドとデプロイが開始されます。

## 認証機能の有効化

現在は認証機能がコメントアウトされています。有効化する手順：

1. **App.tsxの編集**
   ```tsx
   // コメントを解除
   import amplifyconfig from './amplifyconfiguration';
   
   Amplify.configure(amplifyconfig);
   ```

2. **AuthWrapperのコメントを解除**
   ```tsx
   <AuthWrapper>
     <FlightPlanProvider>
       <Router>
         <AppLayout />
       </Router>
     </FlightPlanProvider>
   </AuthWrapper>
   ```

3. **userIdの取得方法を変更**
   
   各ページで `userId = 'test-user-001'` となっている部分を以下に変更：
   ```tsx
   import { getCurrentUser } from 'aws-amplify/auth';
   
   // コンポーネント内で
   const [userId, setUserId] = useState<string>('');
   
   useEffect(() => {
     const fetchUser = async () => {
       try {
         const user = await getCurrentUser();
         setUserId(user.userId);
       } catch (error) {
         console.error('User not authenticated');
       }
     };
     fetchUser();
   }, []);
   ```

## トラブルシューティング

### amplify_outputs.json が見つからない

```bash
npx ampx generate outputs --app-id <your-app-id> --branch main
```

### ビルドエラー

1. Node.jsのバージョンを確認（18以上必要）
2. `npm ci` でクリーンインストール
3. ローカルで `npm run build` が成功するか確認

### 認証エラー

1. Cognito User Poolが正しく作成されているか確認
2. amplify_outputs.json に認証設定が含まれているか確認