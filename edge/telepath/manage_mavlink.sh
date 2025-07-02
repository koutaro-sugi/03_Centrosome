#!/bin/bash

# MAVLinkサービス管理スクリプト

case "$1" in
    start)
        echo "MAVLinkサービスを開始します..."
        sudo systemctl start mavlink-raspi.service
        sudo systemctl status mavlink-raspi.service
        ;;
    stop)
        echo "MAVLinkサービスを停止します..."
        sudo systemctl stop mavlink-raspi.service
        ;;
    restart)
        echo "MAVLinkサービスを再起動します..."
        sudo systemctl restart mavlink-raspi.service
        sudo systemctl status mavlink-raspi.service
        ;;
    status)
        sudo systemctl status mavlink-raspi.service
        ;;
    logs)
        sudo journalctl -u mavlink-raspi.service -f
        ;;
    test)
        echo "フライトコントローラー接続テスト..."
        if [ -e "/dev/ttyACM0" ]; then
            echo "✓ /dev/ttyACM0 が検出されました"
            ls -la /dev/ttyACM0
        else
            echo "✗ /dev/ttyACM0 が見つかりません"
            echo "利用可能なttyデバイス:"
            ls /dev/tty*
        fi
        
        echo "MAVProxyプロセス確認..."
        if pgrep -f "mavproxy.py" > /dev/null; then
            echo "✓ MAVProxyが実行中です"
            ps aux | grep mavproxy.py | grep -v grep
        else
            echo "✗ MAVProxyが実行されていません"
        fi
        
        echo "最新ログファイル確認..."
        LATEST_LOG=$(ls -t /home/pi/mavlink_logs/mavlink_*.log 2>/dev/null | head -1)
        if [ -n "$LATEST_LOG" ]; then
            echo "✓ 最新ログ: $LATEST_LOG"
            tail -5 "$LATEST_LOG"
        else
            echo "✗ ログファイルが見つかりません"
        fi
        ;;
    *)
        echo "使用方法: $0 {start|stop|restart|status|logs|test}"
        echo ""
        echo "コマンド説明:"
        echo "  start   - MAVLinkサービスを開始"
        echo "  stop    - MAVLinkサービスを停止"
        echo "  restart - MAVLinkサービスを再起動"
        echo "  status  - サービス状態を確認"
        echo "  logs    - リアルタイムログを表示"
        echo "  test    - 接続テストを実行"
        exit 1
        ;;
esac