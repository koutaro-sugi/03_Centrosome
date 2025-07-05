// MAVLink GPS_RAW_INT メッセージデバッグスクリプト
// EC2のWebSocketに接続してGPS_RAW_INTメッセージの構造を確認

const WebSocket = require('ws');

const ws = new WebSocket('ws://52.194.5.104:8080');

ws.on('open', () => {
  console.log('Connected to EC2 WebSocket');
});

ws.on('message', (data) => {
  const buffer = new Uint8Array(data);
  
  // MAVLinkマジックバイトを探す
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0xFE || buffer[i] === 0xFD) {
      const isV2 = buffer[i] === 0xFD;
      const headerSize = isV2 ? 10 : 6;
      
      if (i + headerSize <= buffer.length) {
        const msgId = isV2 ? 
          buffer[i + 7] | (buffer[i + 8] << 8) | (buffer[i + 9] << 16) :
          buffer[i + 5];
        
        // GPS_RAW_INT (ID: 24)
        if (msgId === 24) {
          const payloadLen = buffer[i + 1];
          const payloadStart = i + headerSize;
          
          if (payloadStart + payloadLen <= buffer.length) {
            const payload = buffer.slice(payloadStart, payloadStart + payloadLen);
            
            console.log('\n=== GPS_RAW_INT Message Found ===');
            console.log('MAVLink Version:', isV2 ? 'v2' : 'v1');
            console.log('Payload length:', payloadLen);
            console.log('Payload hex:', Array.from(payload).map(b => b.toString(16).padStart(2, '0')).join(' '));
            
            // 各フィールドを表示
            const view = new DataView(payload.buffer, payload.byteOffset, payload.length);
            
            console.log('\nField positions:');
            console.log('time_usec (0-7):', view.getBigUint64(0, true));
            console.log('lat (8-11):', view.getInt32(8, true), '=> degrees:', view.getInt32(8, true) / 1e7);
            const lonRaw = view.getInt32(12, true);
            console.log('lon (12-15):', lonRaw, '=> degrees:', lonRaw / 1e7);
            console.log('lon hex:', lonRaw.toString(16));
            console.log('lon binary:', lonRaw.toString(2).padStart(32, '0'));
            console.log('alt (16-19):', view.getInt32(16, true), 'mm');
            console.log('eph (20-21):', view.getUint16(20, true));
            console.log('epv (22-23):', view.getUint16(22, true));
            console.log('vel (24-25):', view.getUint16(24, true), 'cm/s');
            console.log('cog (26-27):', view.getUint16(26, true));
            console.log('fix_type (28):', payload[28]);
            console.log('satellites_visible (29):', payload[29]);
            
            // 最初の1メッセージだけ表示して終了
            process.exit(0);
          }
        }
      }
    }
  }
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err);
});

setTimeout(() => {
  console.log('No GPS_RAW_INT message found in 10 seconds');
  process.exit(1);
}, 10000);