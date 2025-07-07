# 2025-07-06 - UASポート管理システム実装

## 概要
フライトプランの出発地・目的地を明確に識別するため、UASポート（無人航空機システムポート）を独立したエンティティとして管理するシステムを実装。

## 背景と課題

### 現状の問題点
1. **曖昧な地名表示**: "GOTO - NAGASAKI"のような表示では、どの「NAGASAKI」なのか不明確
2. **データ構造の課題**: 緯度経度情報がplanDataのJSON文字列内に埋没
3. **体系的な管理の欠如**: ポートという概念が存在せず、一元管理が困難

### 解決策
UASPORTエンティティを新規作成し、PLANエンティティから参照する構造に変更。

## 実装内容

### 1. データモデル設計

#### UASPORTエンティティ
```typescript
interface UASPort {
  PK: string;              // UASPORT#[uaport_code]
  SK: string;              // METADATA#[uaport_code]
  entityType: 'UASPORT';
  uaport_code: string;     // 一意の4文字コード (例: "UNAG")
  common_name: string;     // 通称地名 (例: "長崎")
  full_address: string;    // 正式住所
  location: {
    lat: number;
    lon: number;
  };
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  createdAt: string;
  updatedAt: string;
}
```
↑Locationはポリゴンの頂点で定義というのはどう？
#### GSI設計
- IndexName: GSI1
- GSI1PK: entityType
- GSI1SK: common_name
- 用途: 全UASポートを通称地名順で効率的に取得

#### PLANエンティティの拡張
```typescript
interface FlightPlan {
  // 既存フィールド...
  departure_code?: string;    // 追加: 出発地のUASポートコード
  destination_code?: string;  // 追加: 目的地のUASポートコード
}
```

### 2. 実装ファイル一覧

#### 新規作成ファイル
1. **型定義**
   - `/src/types/uasport.ts` - UASPortエンティティの型定義

2. **サービス層**
   - `/src/services/uasportService.ts` - DynamoDB操作サービス
   - `/src/contexts/DynamoDBContext.tsx` - DynamoDBクライアント管理

3. **Hooks**
   - `/src/hooks/useUASPorts.ts` - UASポート管理用React Hook

4. **コンポーネント**
   - `/src/components/UASPortSelector.tsx` - ポート選択UIコンポーネント
   - `/src/pages/UASPortManagement.tsx` - 管理画面

5. **初期データ**
   - `/src/scripts/initializeUASPorts.ts` - 長崎県内10箇所の初期データ

#### 修正ファイル
1. `/src/lib/dynamodb.ts` - FlightPlan型にdeparture_code/destination_codeを追加
2. `/src/components/PlansSidebar.tsx` - 表示をコード形式に変更

### 3. 初期UASポートデータ

| コード  | 通称名 | 住所            |
| ---- | --- | ------------- |
| UNAG | 長崎  | 長崎県長崎市元船町17-3 |
| UFUJ | 五島  | 長崎県五島市吉久木町    |
| USAS | 佐世保 | 長崎県佐世保市三浦町    |
| UIKI | 壱岐  | 長崎県壱岐市芦辺町     |
| UTSU | 対馬  | 長崎県対馬市厳原町     |
| UOMA | 大村  | 長崎県大村市箕島町     |
| UISE | 諫早  | 長崎県諫早市宗方町     |
| UHIR | 平戸  | 長崎県平戸市岩の上町    |
| USHI | 島原  | 長崎県島原市下川尻町    |
| UMIN | 南島原 | 長崎県南島原市口之津町   |
|      |     |               |
↑これいらない。初期データいらない。こっちで用意します。
### 4. UI/UXの改善

#### Before
- 表示: "GOTO - NAGASAKI"
- 入力: 自由記述のテキストボックス

#### After
- 表示: "UFUJ - UNAG"
- 説明: "Flight plan from UFUJ (五島) to UNAG (長崎)"
- 入力: ドロップダウンリストから選択
↑この記述よくわかんない。。。どの画面のこと？
## 技術的な詳細

### DynamoDB操作
- PutItemでの新規作成（重複チェック付き）
- QueryによるGSI1を使った一覧取得
- UpdateItemでの更新
- DeleteItemでの削除

### エラー修正
- `import.meta.env`を`process.env.REACT_APP_*`に変更（Create React App対応）

## メリット

1. **誤認の撲滅**: 曖昧な地名がなくなり、運航の安全性が向上
2. **データの一元管理**: ポート情報の変更が全関連データに反映
3. **優れたUX**: 直感的で間違いのない操作が可能

## 今後の展開可能性

1. ポート間の経路情報管理
2. ポートの利用可能時間帯設定
3. 気象条件によるポート利用制限
4. ポート利用統計の収集と分析

## ロールバック手順

もし実装を取り消す場合：

1. 新規作成ファイルの削除
   ```bash
   rm -rf src/types/uasport.ts
   rm -rf src/services/uasportService.ts
   rm -rf src/contexts/DynamoDBContext.tsx
   rm -rf src/hooks/useUASPorts.ts
   rm -rf src/components/UASPortSelector.tsx
   rm -rf src/pages/UASPortManagement.tsx
   rm -rf src/scripts/initializeUASPorts.ts
   ```

2. 修正ファイルの復元
   - `/src/lib/dynamodb.ts`から`departure_code`と`destination_code`を削除
   - `/src/components/PlansSidebar.tsx`の表示ロジックを元に戻す

## 関連リンク
- [[../Overview|プロジェクト概要へ戻る]]
- [[../Current Tasks|現在のタスクへ戻る]]