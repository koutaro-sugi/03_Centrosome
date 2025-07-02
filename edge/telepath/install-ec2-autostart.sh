#!/bin/bash

# EC2自動起動サービスのインストールスクリプト

echo "EC2自動起動サービスをインストールします..."

# スクリプトの実行権限を付与
chmod +x ec2-auto-start.sh

# サービスファイルをシステムディレクトリにコピー
sudo cp ec2-auto-start.service /etc/systemd/system/

# AWS CLIのインストール確認
if ! command -v aws >/dev/null 2>&1; then
    echo "AWS CLIをインストールしています..."
    pip3 install --user awscli
    echo 'export PATH=$PATH:~/.local/bin' >> ~/.bashrc
fi

# AWS認証情報の設定確認
if [ ! -f ~/.aws/credentials ]; then
    echo ""
    echo "警告: AWS認証情報が設定されていません"
    echo "以下のコマンドを実行してAWS認証情報を設定してください:"
    echo "  aws configure"
    echo ""
    echo "または、~/.aws/credentials ファイルを作成してください:"
    echo "[default]"
    echo "aws_access_key_id = YOUR_ACCESS_KEY"
    echo "aws_secret_access_key = YOUR_SECRET_KEY"
    echo ""
fi

# EC2インスタンスIDの設定
echo ""
echo "重要: ec2-auto-start.sh を編集してEC2インスタンスIDを設定してください"
echo "  nano ~/Raspi-Persona/telepath/ec2-auto-start.sh"
echo ""
echo "EC2_INSTANCE_ID=\"i-0123456789abcdef0\" の部分を実際のインスタンスIDに変更"
echo ""

# サービスの有効化
sudo systemctl daemon-reload
sudo systemctl enable ec2-auto-start.service

echo ""
echo "インストールが完了しました！"
echo ""
echo "使用方法:"
echo "  - サービス開始: sudo systemctl start ec2-auto-start.service"
echo "  - サービス状態: sudo systemctl status ec2-auto-start.service"
echo "  - ログ確認: sudo journalctl -u ec2-auto-start.service -f"
echo ""
echo "注意事項:"
echo "1. EC2インスタンスIDを設定してください"
echo "2. AWS認証情報を設定してください"
echo "3. ラズパイにEC2を起動する権限（ec2:StartInstances, ec2:DescribeInstances）が必要です"
echo ""