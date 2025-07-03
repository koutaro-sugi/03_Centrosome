--------------------------------------------------------------------------------
QGC ファイルについて
QGroundControl (QGC) における.planファイルは、ミッションアイテム、およびオプションのジオフェンスやラリーポイントを含むJSONファイル形式で保存されます。これらのファイルは、車両の飛行計画を定義するために使用されます。
1. トップレベルのファイル形式
.planファイルの基本的なトップレベル構造は以下のフィールドで構成されます：
•
fileType: 常に "Plan" である必要があります。
•
groundStation: このファイルを作成したグランドステーションの名前を示します（例："QGroundControl"）。
•
version: ファイル形式のバージョンを示します。現在のバージョンは1です。
•
mission: この飛行計画に関連付けられたミッションオブジェクトです。少なくとも1つのミッションアイテムを含む必要があります。
•
geoFence: (オプション) この計画のジオフェンス情報です。
•
rallyPoints: (オプション) この計画のラリーポイント（安全地点）情報です。
2. ミッションオブジェクト ()
missionオブジェクトは、車両が実行する一連のタスクを定義します。その構造は以下の主要なフィールドを含みます：
•
version: ミッションオブジェクトのバージョン。現在のバージョンは2です。
•
firmwareType: このミッションが作成されたファームウェアのタイプ (MAV_AUTOPILOT enum値)。
•
globalPlanAltitudeMode: 計画全体の高度モード設定。高度モードを指定しない計画アイテムで使用されます。
•
vehicleType: このミッションが作成された車両タイプ (MAV_TYPE enum値)。
•
cruiseSpeed: 固定翼またはVTOL車両のデフォルトの前方速度（ウェイポイント間移動時）。
•
hoverSpeed: マルチローター車両のデフォルトの前方速度。
•
items: ミッションアイテムオブジェクトのリストです。SimpleItemとComplexItemの両方またはどちらか一方を含めることができます。このリストには少なくとも1つのミッションアイテムが必要です。
•
plannedHomePosition: マップに表示され、車両が接続されていないミッション計画時に使用される計画されたホームポジション。値は緯度、経度、AMSL高度の配列です。
3. ミッションアイテム ()
missionオブジェクト内のitemsリストには、2種類のミッションアイテムを含めることができます。
a. SimpleItem - シンプルなミッションアイテム
SimpleItemは、単一のMAVLink MISSION_ITEMコマンドを表します。主要なフィールドは以下の通りです：
•
type: "SimpleItem"。
•
Altitude: 高度。
•
AltitudeMode: 高度モード。
•
autoContinue: MISSION_ITEM.autoContinue。
•
command: このミッションアイテムのコマンド (MAV_CMD)。
•
frame: MAV_FRAME。
•
params: MISSION_ITEM.param1からparam7に対応するパラメータのリスト。値は特定のMAV_CMDに依存します。
b. ComplexItem - 複合ミッションアイテム
ComplexItemは、複数のMISSION_ITEMオブジェクトを単一のエンティティとしてカプセル化した高レベルの項目です。現在、以下の3つのタイプがあります：
•
Survey (測量)
◦
complexItemType: "survey"。
◦
polygon: 測量エリアを表すポリゴン配列。各点は緯度、経度ペアです。
◦
angle: トランセクトパスの角度（度）。
◦
flyAlternateTransects: trueの場合、車両は交互のトランセクトをスキップし、後でそれらを飛行します。固定翼機が急な旋回を避けるのに役立ちます。
◦
**TransectStyleComplexItem**が共通のベース定義として含まれます。
•
Corridor Scan (コリドー・スキャン)
◦
complexItemType: "CorridorScan"。
◦
polyline: コリドーの形状を定義する点のリスト。
◦
CorridorWidth: コリドーの幅。
◦
**TransectStyleComplexItem**が共通のベース定義として含まれます。
•
Structure Scan (構造物スキャン)
◦
complexItemType: "StructureScan"。
◦
polygon: スキャン対象の構造物の基部を表すポリゴン。
◦
Altitude: 高度。
◦
StructureHeight: 構造物の高さ。
◦
Layers: スキャンする層の数。
◦
altitudeRelative: trueの場合、altitudeはホームからの相対高度です。
◦
CameraCalc: カメラ情報が含まれます。
c. TransectStyleComplexItem
TransectStyleComplexItemは、SurveyとCorridorScanの複合アイテムに共通のベース定義を含みます。主要なフィールドは以下の通りです：
•
CameraCalc: カメラ情報。
•
FollowTerrain: trueの場合、地形追従を有効にします。
•
TurnAroundDistance: 次のトランセクトのために旋回する前に、ポリゴンの端を越えて飛行する距離。
d. CameraCalc
CameraCalcオブジェクトは、測量、コリドー、または構造物スキャンで使用されるカメラ情報を含みます。主要なフィールドは以下の通りです：
•
CameraName: 使用するカメラの名前 (QGroundControlに既知のカメラ名、または "Manual (no camera specs)"、"Custom Camera")。
•
FocalLength: カメラレンズの焦点距離（ミリメートル）。
•
SensorWidth: センサー幅（ミリメートル）。
•
SensorHeight: センサー高さ（ミリメートル）。
•
FrontalOverlap: 正面画像オーバーラップの割合。
•
SideOverlap: 側面画像オーバーラップの割合。
•
DistanceToSurface: 地表までの距離。
•
DistanceToSurfaceRelative: trueの場合、DistanceToSurfaceは相対距離。
•
ImageWidth, ImageHeight: 画像のピクセルサイズ。
•
Landscape: trueの場合、カメラは車両に横向きに設置されています。
4. ジオフェンス ()
ジオフェンス情報はオプションであり、計画は任意の数のポリゴンと円で定義されたジオフェンスを含むことができます。
a. Circle Geofence (円形ジオフェンス)
各円形ジオフェンスは、中心（緯度、経度）と半径を定義し、特定のジオフェンスが有効かどうかの情報（inclusion）を含みます。
•
center: 円の中心（緯度、経度）。
•
radius: 円の半径。
•
inclusion: ジオフェンスが有効（true）か無効（false）か。
b. Polygon Geofence (ポリゴンジオフェンス)
各ポリゴンジオフェンスは、時計回りの巻き順で定義された点のセットを含みます（領域を囲む必要があります）。
•
polygon: ポリゴンを構成する点のリスト。各点は緯度と経度を含み、時計回りに並んでいます。
•
inclusion: ジオフェンスが有効（true）か無効（false）か。
5. ラリーポイント ()
ラリーポイント情報はオプションであり、計画は任意の数のラリーポイントを含むことができます。各ラリーポイントは、緯度、経度、および高度（ホームポジションからの相対高度）を持ちます。
•
points: ラリーポイントのリスト。各点は緯度、経度、高度の配列です。

--------------------------------------------------------------------------------