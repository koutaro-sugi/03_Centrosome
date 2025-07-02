#!/bin/bash

# EC2自動起動スクリプト
# ラズパイ起動時にEC2インスタンスを自動的に起動する

# 設定
EC2_INSTANCE_ID="i-05649608631f67afe"  # EC2インスタンスID
AWS_REGION="ap-northeast-1"
LOG_FILE="/home/pi/ec2-startup.log"
MAX_RETRIES=5
RETRY_DELAY=30

# ログ関数
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# ネットワーク接続確認
wait_for_network() {
    log "ネットワーク接続を確認中..."
    local count=0
    while [ $count -lt 60 ]; do
        if ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1; then
            log "ネットワーク接続が確立されました"
            return 0
        fi
        count=$((count + 1))
        sleep 2
    done
    log "エラー: ネットワーク接続がタイムアウトしました"
    return 1
}

# EC2インスタンスの状態確認
check_ec2_state() {
    aws ec2 describe-instances \
        --instance-ids "$EC2_INSTANCE_ID" \
        --region "$AWS_REGION" \
        --query 'Reservations[0].Instances[0].State.Name' \
        --output text 2>/dev/null
}

# EC2インスタンスを起動
start_ec2_instance() {
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        log "EC2インスタンスの状態を確認中... (試行 $((retry_count + 1))/$MAX_RETRIES)"
        
        local state=$(check_ec2_state)
        
        if [ -z "$state" ]; then
            log "エラー: EC2インスタンスの状態を取得できませんでした"
            retry_count=$((retry_count + 1))
            sleep $RETRY_DELAY
            continue
        fi
        
        log "現在のEC2状態: $state"
        
        case "$state" in
            "running")
                log "EC2インスタンスは既に起動しています"
                return 0
                ;;
            "stopped")
                log "EC2インスタンスを起動しています..."
                if aws ec2 start-instances \
                    --instance-ids "$EC2_INSTANCE_ID" \
                    --region "$AWS_REGION" >/dev/null 2>&1; then
                    log "起動コマンドを送信しました"
                    
                    # 起動を待つ
                    local wait_count=0
                    while [ $wait_count -lt 30 ]; do
                        sleep 10
                        state=$(check_ec2_state)
                        if [ "$state" = "running" ]; then
                            log "EC2インスタンスが正常に起動しました"
                            return 0
                        fi
                        wait_count=$((wait_count + 1))
                        log "起動を待機中... ($state)"
                    done
                    
                    log "警告: EC2インスタンスの起動確認がタイムアウトしました"
                    return 1
                else
                    log "エラー: EC2起動コマンドが失敗しました"
                fi
                ;;
            "pending")
                log "EC2インスタンスは起動中です..."
                sleep 30
                ;;
            "stopping"|"terminated"|"terminating")
                log "エラー: EC2インスタンスは $state 状態です"
                return 1
                ;;
            *)
                log "警告: 不明な状態: $state"
                ;;
        esac
        
        retry_count=$((retry_count + 1))
        sleep $RETRY_DELAY
    done
    
    log "エラー: 最大試行回数に達しました"
    return 1
}

# メイン処理
main() {
    log "===== EC2自動起動スクリプトを開始 ====="
    
    # ネットワーク接続を待つ
    if ! wait_for_network; then
        exit 1
    fi
    
    # AWS CLIの存在確認
    if ! command -v aws >/dev/null 2>&1; then
        log "エラー: AWS CLIがインストールされていません"
        log "インストール: pip3 install awscli"
        exit 1
    fi
    
    # EC2インスタンスIDの確認
    if [ "$EC2_INSTANCE_ID" = "i-0123456789abcdef0" ]; then
        log "エラー: EC2インスタンスIDが設定されていません"
        log "スクリプトを編集してEC2_INSTANCE_IDを設定してください"
        exit 1
    fi
    
    # EC2を起動
    if start_ec2_instance; then
        log "EC2自動起動が完了しました"
        
        # MAVLinkサービスの起動を少し遅らせる
        log "30秒後にMAVLinkサービスを開始します..."
        sleep 30
        
        # MAVLinkサービスを再起動（オプション）
        if systemctl is-enabled mavlink-raspi.service >/dev/null 2>&1; then
            log "MAVLinkサービスを再起動中..."
            systemctl restart mavlink-raspi.service
        fi
        
        exit 0
    else
        log "EC2自動起動に失敗しました"
        exit 1
    fi
}

# スクリプト実行
main