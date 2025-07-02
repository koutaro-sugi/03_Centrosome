# EC2自動起動サービス

ラズパイの電源投入時に自動的にEC2インスタンスを起動するサービスです。

## 機能

- ラズパイ起動時にEC2インスタンスを自動起動
- ネットワーク接続を待機してから実行
- リトライ機能（最大5回）
- 詳細なログ記録
- MAVLinkサービスとの連携

## インストール

```bash
cd ~/Raspi-Persona/telepath
chmod +x install-ec2-autostart.sh
./install-ec2-autostart.sh
```

## 設定

### 1. EC2インスタンスIDの設定

```bash
nano ~/Raspi-Persona/telepath/ec2-auto-start.sh
```

以下の行を編集：
```bash
EC2_INSTANCE_ID="i-0123456789abcdef0"  # 実際のインスタンスIDに変更
```

### 2. AWS認証情報の設定

```bash
aws configure
```

または、認証ファイルを直接作成：

```bash
mkdir -p ~/.aws
nano ~/.aws/credentials
```

```ini
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
region = ap-northeast-1
```

### 3. IAMポリシーの設定

ラズパイのIAMユーザーに以下の権限が必要です：

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:StartInstances",
                "ec2:DescribeInstances"
            ],
            "Resource": [
                "arn:aws:ec2:ap-northeast-1:YOUR_ACCOUNT_ID:instance/YOUR_INSTANCE_ID"
            ]
        }
    ]
}
```

## 使用方法

### サービスの管理

```bash
# サービス開始
sudo systemctl start ec2-auto-start.service

# サービス停止
sudo systemctl stop ec2-auto-start.service

# サービス状態確認
sudo systemctl status ec2-auto-start.service

# サービス有効化（自動起動ON）
sudo systemctl enable ec2-auto-start.service

# サービス無効化（自動起動OFF）
sudo systemctl disable ec2-auto-start.service
```

### ログの確認

```bash
# systemdログ
sudo journalctl -u ec2-auto-start.service -f

# アプリケーションログ
tail -f ~/ec2-startup.log
```

## 動作フロー

1. ラズパイ起動
2. ネットワーク接続を待機（最大2分）
3. EC2インスタンスの状態を確認
4. 停止中の場合は起動コマンドを送信
5. 起動完了を待機（最大5分）
6. MAVLinkサービスを再起動（オプション）

## トラブルシューティング

### EC2が起動しない場合

1. AWS認証情報を確認
```bash
aws ec2 describe-instances --instance-ids YOUR_INSTANCE_ID
```

2. ログを確認
```bash
sudo journalctl -u ec2-auto-start.service -n 50
cat ~/ec2-startup.log
```

3. 手動で実行してテスト
```bash
~/Raspi-Persona/telepath/ec2-auto-start.sh
```

### よくあるエラー

- **認証エラー**: AWS認証情報が正しく設定されているか確認
- **権限エラー**: IAMポリシーでEC2起動権限があるか確認
- **ネットワークエラー**: インターネット接続を確認
- **インスタンスIDエラー**: 正しいインスタンスIDが設定されているか確認

## カスタマイズ

`ec2-auto-start.sh`の以下の値を調整できます：

- `MAX_RETRIES`: 最大リトライ回数（デフォルト: 5）
- `RETRY_DELAY`: リトライ間隔（デフォルト: 30秒）
- `AWS_REGION`: AWSリージョン（デフォルト: ap-northeast-1）