# Centrosome SITL リモート制御統合アイデア

## 概要
CentrosomeのWebUIから自宅Windows WSL上のArduPilot SITLをリモート起動・制御する機能の実装アイデア。

## 🚀 アーキテクチャ案

### 基本構成
```
MacBook/Amplify (Centrosome) 
    ↓ [WebUI: Start SIM ボタン]
    ↓ API Call
Windows WSL (SITL)
    ↓ UDP
EC2 MAVLink Router (52.194.5.104)
    ↓ UDP
QGC/Centrosome (どこからでも)
```

### 通信経路
- **Tailscale VPN**: 100.76.23.68 (WSL直接アクセス)
- **EC2リレー**: UDP 14555 → 14556
- **WebSocket**: ポート 14560 (ブラウザ対応)

## 💡 実装アイデア

### 1. リモートSITL起動API
```javascript
// Centrosomeに追加するAPI
const startSimulation = async (config) => {
  const response = await fetch('/api/sitl/start', {
    method: 'POST',
    body: JSON.stringify({
      vehicle: 'quadplane',  // plane, copter, rover
      location: 'Tokyo_Tower',
      params: {
        lat: 35.658584,
        lng: 139.745431,
        alt: 100,
        heading: 0
      },
      options: {
        speedup: 1,
        console: true,
        map: false
      }
    })
  });
};
```

### 2. WSL側のAPIサーバー実装
```python
# Flask/FastAPIでSITL制御サーバー
from flask import Flask, request, jsonify
import subprocess
import psutil

app = Flask(__name__)
sitl_processes = {}

@app.route('/api/sitl/start', methods=['POST'])
def start_sitl():
    config = request.json
    instance_id = config.get('instance_id', 0)
    
    # SITLコマンド構築
    cmd = f"sim_vehicle.py -v ArduPlane -f {config['vehicle']} " \
          f"--custom-location={config['params']['lat']},{config['params']['lng']},{config['params']['alt']},{config['params']['heading']} " \
          f"--out=udp:52.194.5.104:14555 " \
          f"-I{instance_id}"
    
    # プロセス起動
    process = subprocess.Popen(cmd, shell=True)
    sitl_processes[instance_id] = process
    
    return jsonify({
        "status": "started",
        "instance_id": instance_id,
        "pid": process.pid
    })

@app.route('/api/sitl/stop/<instance_id>', methods=['POST'])
def stop_sitl(instance_id):
    if instance_id in sitl_processes:
        sitl_processes[instance_id].terminate()
        return jsonify({"status": "stopped"})
    return jsonify({"status": "not_found"}), 404

@app.route('/api/sitl/status', methods=['GET'])
def sitl_status():
    status = {}
    for instance_id, process in sitl_processes.items():
        status[instance_id] = {
            "running": process.poll() is None,
            "pid": process.pid
        }
    return jsonify(status)
```

### 3. Tailscale経由の安全な接続
```javascript
// Node.js実装例
const { NodeSSH } = require('node-ssh');

class SITLController {
  constructor() {
    this.ssh = new NodeSSH();
    this.connected = false;
  }

  async connect() {
    await this.ssh.connect({
      host: '100.76.23.68',  // Tailscale IP
      username: 'pilot',
      privateKey: process.env.SSH_PRIVATE_KEY
    });
    this.connected = true;
  }

  async startSITL(config) {
    if (!this.connected) await this.connect();
    
    const command = this.buildCommand(config);
    const result = await this.ssh.execCommand(command);
    return result;
  }

  buildCommand(config) {
    return `cd ~/Developer/ardupilot && sim_vehicle.py -v ${config.vehicle} ...`;
  }
}
```

## 🎮 Centrosome UI機能追加案

### 1. SIMコントロールパネル
```jsx
// React Component
const SITLControlPanel = () => {
  const [config, setConfig] = useState({
    vehicle: 'quadplane',
    location: 'custom',
    lat: 35.658584,
    lng: 139.745431,
    alt: 100
  });

  return (
    <div className="sitl-control-panel">
      <h3>SITL Simulator Control</h3>
      
      {/* 機体選択 */}
      <Select
        value={config.vehicle}
        onChange={(e) => setConfig({...config, vehicle: e.target.value})}
      >
        <Option value="plane">Fixed Wing</Option>
        <Option value="copter">Multicopter</Option>
        <Option value="quadplane">VTOL (QuadPlane)</Option>
        <Option value="rover">Ground Vehicle</Option>
      </Select>

      {/* 地図で位置選択 */}
      <MapPicker
        onLocationSelect={(lat, lng) => 
          setConfig({...config, lat, lng})
        }
      />

      {/* プリセット */}
      <PresetLocations>
        <Button onClick={() => setLocation('Tokyo_Tower')}>東京タワー</Button>
        <Button onClick={() => setLocation('Haneda_Airport')}>羽田空港</Button>
        <Button onClick={() => setLocation('Mt_Fuji')}>富士山</Button>
      </PresetLocations>

      <Button onClick={startSimulation}>Start Simulation</Button>
    </div>
  );
};
```

### 2. シナリオビルダー
```javascript
// ミッションシナリオ定義
const scenarios = {
  delivery: {
    name: "配送ミッション",
    waypoints: [
      { lat: 35.658584, lng: 139.745431, alt: 50 },
      { lat: 35.660000, lng: 139.750000, alt: 100 },
      { lat: 35.655000, lng: 139.755000, alt: 50 }
    ],
    vehicle: "quadplane",
    weather: { wind: 5, direction: 270 }
  },
  
  surveillance: {
    name: "監視パトロール",
    pattern: "circle",
    center: { lat: 35.658584, lng: 139.745431 },
    radius: 1000,
    altitude: 150
  }
};
```

### 3. マルチ機体対応
```javascript
// 複数機体同時制御
const SwarmControl = {
  async launchSwarm(config) {
    const instances = [];
    
    for (let i = 0; i < config.droneCount; i++) {
      const instance = await this.startInstance({
        vehicle: config.vehicle,
        instanceId: i,
        position: this.calculateFormation(i, config.formation),
        masterPort: 14550 + i * 10
      });
      instances.push(instance);
    }
    
    return instances;
  },

  calculateFormation(index, formationType) {
    // V字、ライン、グリッドなどのフォーメーション計算
  }
};
```

## 🔧 技術的実装の選択肢

### Option 1: SSH経由の直接制御
- **メリット**: シンプル、既存のSSH鍵で認証
- **デメリット**: リアルタイム性に欠ける

### Option 2: WebSocket制御サーバー
- **メリット**: リアルタイム、双方向通信
- **デメリット**: 常時起動のサーバーが必要

### Option 3: メッセージキュー (Redis/RabbitMQ)
- **メリット**: 非同期処理、スケーラブル
- **デメリット**: インフラが複雑

### Option 4: GitHub Actions風トリガー
- **メリット**: 履歴管理、再現性
- **デメリット**: 即時性がない

## 🎯 拡張アイデア

### 1. Docker化
```dockerfile
FROM ardupilot/ardupilot-dev-base:latest
RUN apt-get update && apt-get install -y python3-pip
RUN pip3 install MAVProxy
EXPOSE 5760 14550-14560
CMD ["sim_vehicle.py"]
```

### 2. 状態管理とテレメトリー
```javascript
// Zustand store
const useSITLStore = create((set) => ({
  instances: {},
  telemetry: {},
  
  updateTelemetry: (instanceId, data) => set((state) => ({
    telemetry: {
      ...state.telemetry,
      [instanceId]: data
    }
  })),
  
  addInstance: (instance) => set((state) => ({
    instances: {
      ...state.instances,
      [instance.id]: instance
    }
  }))
}));
```

### 3. 録画・再生機能
- SITLセッションの記録
- テレメトリーデータの保存
- 後からの解析・共有

### 4. CI/CD統合
```yaml
# .github/workflows/sitl-test.yml
name: SITL Integration Test
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run SITL Test
        run: |
          sim_vehicle.py -v copter --speedup 10
          python run_mission_test.py
```

## 実装優先順位

1. **Phase 1**: 基本的なリモート起動
   - SSH経由でのSITL起動
   - 単一機体のサポート
   - 基本的なUIコンポーネント

2. **Phase 2**: 高度な制御
   - WebSocket通信
   - リアルタイムテレメトリー
   - 複数機体対応

3. **Phase 3**: エンタープライズ機能
   - Docker化
   - スケーラビリティ
   - 録画・解析機能

## セキュリティ考慮事項

- Tailscale VPNでの暗号化通信
- SSH鍵認証
- APIエンドポイントの認証
- Rate limiting
- 実行可能コマンドの制限

## リソース

- ArduPilot SITL: https://ardupilot.org/dev/docs/sitl-simulator-software-in-the-loop.html
- MAVLink Router: https://github.com/mavlink-router/mavlink-router
- Tailscale: https://tailscale.com/