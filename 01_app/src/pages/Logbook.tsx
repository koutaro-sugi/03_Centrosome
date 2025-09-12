import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  CircularProgress,
  Alert,
  IconButton,
  TextField,
  Dialog,
  DialogContent,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  LocationOn as LocationIcon,
} from "@mui/icons-material";
import { DataTableIcon } from "../components/icons/DataTableIcon";
import { aircraftAPI } from "../lib/aircraftApi";
import { pilotAPI } from "../lib/pilotApi";
import { flightLogAPI } from "../lib/flightLogApi";
import { Aircraft } from "../types/aircraft";
import { Pilot } from "../types/pilot";
import { LocationPicker } from "../components/LocationPicker";
import { SimpleLocationPicker } from "../components/SimpleLocationPicker";
import { useFlightLocation } from "../hooks/useFlightLocation";
import { SlideToConfirm } from "../components/SlideToConfirm";
import { toJSTISOString } from "../utils/dateTime";

// 点検項目の定義
const INSPECTION_ITEMS = [
  {
    id: "general",
    title: "機体全般",
    subtitle: "機器の取り付け状態（ネジ、コネクタ、ケーブル等）",
  },
  { id: "propeller", title: "プロペラ", subtitle: "外観、損傷、ゆがみ" },
  { id: "frame", title: "フレーム", subtitle: "外観、損傷、ゆがみ" },
  {
    id: "communication",
    title: "通信系統",
    subtitle: "機体と操縦装置の通信品質の健全性",
  },
  {
    id: "propulsion",
    title: "推進系統",
    subtitle: "モーター又は発動機の健全性",
  },
  {
    id: "power",
    title: "電源系統",
    subtitle: "機体及び操縦装置の電源の健全性",
  },
  { id: "control", title: "自動制御系統", subtitle: "飛行制御装置の健全性" },
  {
    id: "controller",
    title: "操縦装置",
    subtitle: "外観、スティックの健全性、スイッチの健全性",
  },
  {
    id: "battery",
    title: "バッテリー、燃料",
    subtitle: "バッテリーの充電状況、残燃料表示機能の健全性",
  },
];

// 飛行概要セレクトは廃止（飛行目的のフリーテキストに集約）

// チェックリスト項目の定義
const CHECKLIST_ITEMS = [
  { id: "aircraftPowerOn", title: "Aircraft Powered On", hasCheckbox: true },
  {
    id: "payloadRecognized",
    title: "Payload Recognized（GB200）",
    hasCheckbox: true,
  },
  {
    id: "cameraSettings",
    title: "カメラ設定（IR　ビデオ）",
    hasCheckbox: true,
  },
  { id: "attitudeDisplay", title: "姿勢計表示", hasCheckbox: true },
  { id: "simRecognition", title: "SIM認識成功", hasCheckbox: true },
  { id: "simAuthentication", title: "SIM認証成功", hasCheckbox: true },
  { id: "lteConnection", title: "LTE接続完了", hasCheckbox: true },
  { id: "allParametersReceived", title: "全パラメータ受信", hasCheckbox: true },
  { id: "airplaneModeOn", title: "機内モードON", hasCheckbox: true },
  {
    id: "vpnConnectionToken",
    title: "VPN接続（トークンコピー）",
    hasCheckbox: true,
  },
  { id: "airplaneModeOff", title: "機内モードOFF", hasCheckbox: true },
  { id: "vpnConnectionComplete", title: "VPN接続完了", hasCheckbox: true },
  { id: "planScreenSelection", title: "Plan画面→Plan選択", hasCheckbox: true },
  {
    id: "takeoffLocationCorrection",
    title: "離陸地点修正（機体アイコンへドラッグ）",
    hasCheckbox: true,
  },
  {
    id: "landingLocationCorrection",
    title: "着陸地点修正（離陸地点との距離 0,0）",
    hasCheckbox: true,
  },
  {
    id: "emergencyLandingCorrection",
    title: "緊急着陸地点修正（離陸地点との距離 0,0　高度再入力）",
    hasCheckbox: true,
  },
  { id: "planTransmission", title: "Plan送信", hasCheckbox: true },
  { id: "routeWeather", title: "Route Weather", hasCheckbox: true },
  { id: "parameterCheck", title: "Parameter Check", hasCheckbox: true },
  { id: "autoMode", title: "AUTOモード（LED青）", hasCheckbox: true },
  {
    id: "appChecklist",
    title: "アプリチェックリスト スクリーンキャプチャ　カメラ録画",
    hasCheckbox: true,
  },
  { id: "armTakeoff", title: "アーム・離陸 次画面へ", hasCheckbox: false },
];

type Screen = "initial" | "inspection" | "checklist" | "flight" | "postflight" | "summary";

export const Logbook: React.FC = () => {
  // TODO: 実際のユーザーIDを使用
  const userId = "test-user-001";

  // 画面制御
  const [currentScreen, setCurrentScreen] = useState<Screen>("initial");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初期画面の状態
  const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [selectedAircraft, setSelectedAircraft] = useState<string>("");
  const [selectedPilot, setSelectedPilot] = useState<string>("");
  const [dipsApplied, setDipsApplied] = useState(false);
  const [previousAircraft, setPreviousAircraft] = useState<string>("");
  const [takeoffLocation, setTakeoffLocation] = useState<any>(null);
  const [landingLocation, setLandingLocation] = useState<any>(null);
  const [showLocationPicker, setShowLocationPicker] = useState<
    "takeoff" | "landing" | null
  >(null);
  const [showSimpleLocationPicker, setShowSimpleLocationPicker] = useState<
    "takeoff" | "landing" | null
  >(null);
  const [sameLocation, setSameLocation] = useState(false);

  // 点検画面の状態
  const [inspectionChecks, setInspectionChecks] = useState<
    Record<string, boolean>
  >({});
  const [inspectionNotes, setInspectionNotes] = useState<
    Record<string, string>
  >({});
  const [editingNote, setEditingNote] = useState<string | null>(null);

  // チェックリスト画面の状態
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>(
    {}
  );

  // 飛行記録画面の状態
  // 旧: flightPurpose/customPurpose は廃止（飛行の目的＝フリーテキストへ集約）
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(
    null
  );
  const [recordingTime, setRecordingTime] = useState(0);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [checkCompletedTime, setCheckCompletedTime] = useState<Date | null>(
    null
  );
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [specialFlights, setSpecialFlights] = useState<string[]>([]);
  const [flightPurposeText, setFlightPurposeText] = useState<string>("");
  const [postFlightChecks, setPostFlightChecks] = useState<Record<string, boolean>>({});
  const [postFlightNotes, setPostFlightNotes] = useState<string>("");
  const [sotenProcedures, setSotenProcedures] = useState<{ cameraStop: boolean; screenStop: boolean }>({ cameraStop: false, screenStop: false });
  const [editLocations, setEditLocations] = useState(false);
  const [editSpecialFlights, setEditSpecialFlights] = useState(false);
  const [editPurpose, setEditPurpose] = useState(false);
  const [originalSpecialFlights, setOriginalSpecialFlights] = useState<string[] | null>(null);
  const [originalFlightPurposeText, setOriginalFlightPurposeText] = useState<string | null>(null);
  const [originalTakeoffAddress, setOriginalTakeoffAddress] = useState<string | null>(null);
  const [originalLandingAddress, setOriginalLandingAddress] = useState<string | null>(null);
  const [originalTakeoffLocation, setOriginalTakeoffLocation] = useState<any | null>(null);
  const [originalLandingLocation, setOriginalLandingLocation] = useState<any | null>(null);
  // サマリーの離陸行の幅を計測して矢印のセンタリングに利用（フォールバックは左寄せ）
  const takeoffLineRef = useRef<HTMLDivElement | null>(null);
  const [takeoffLineWidth, setTakeoffLineWidth] = useState<number | null>(null);

  const SPECIAL_FLIGHT_OPTIONS: string[] = [
    "空港周辺空域",
    "制限表面",
    "緊急用務空域",
    "150ｍ以上",
    "DID",
    "夜間",
    "目視外",
    "人・物30ｍ",
    "催し物上空",
    "危険物",
    "物件投下",
  ];

  const isSotenSelected = React.useMemo(() => {
    const a = aircrafts.find((x) => x.aircraftId === selectedAircraft);
    const model = (a?.model || "").toUpperCase();
    return model.includes("SOTEN");
  }, [aircrafts, selectedAircraft]);

  // カバー付きボタンの状態
  const [buttonCoverOpen, setButtonCoverOpen] = useState(false);

  // 地点管理
  const { createLocation, incrementUsage } = useFlightLocation(userId);

  // 住所から地名を抽出するヘルパー関数
  const extractPlaceName = (address: string): string => {
    // 日本を除去
    const cleanAddress = address.replace(/^日本/, "");

    // 住所パターンをマッチング（都道府県、市区町村、番地を抽出）
    const detailPattern = /^(.+?[都道府県])(.+?[市区町村])(.+?)$/;
    const match = cleanAddress.match(detailPattern);

    if (match) {
      // 市区町村+番地（丁目まで）を返す
      const cityAndDetail = match[2] + match[3];
      // 数字の後の詳細は省略
      const simplifiedDetail = cityAndDetail.replace(/(\d+丁目).*$/, "$1");
      return simplifiedDetail;
    }

    // パターンにマッチしない場合は、最初の15文字を返す
    return (
      cleanAddress.substring(0, 15) + (cleanAddress.length > 15 ? "..." : "")
    );
  };

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [aircraftList, pilotList] = await Promise.all([
          aircraftAPI.listByUser(userId),
          pilotAPI.listByUser(userId),
        ]);
        setAircrafts(aircraftList);
        setPilots(pilotList);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  // Guard: 非SOTENでchecklistに入った場合はflightに戻す
  useEffect(() => {
    if (currentScreen === 'checklist' && !isSotenSelected) {
      setCurrentScreen('flight');
    }
  }, [currentScreen, isSotenSelected]);

  // Summary originals snapshot for change highlighting
  useEffect(() => {
    if (currentScreen === 'summary') {
      if (originalSpecialFlights === null) setOriginalSpecialFlights([...specialFlights]);
      if (originalFlightPurposeText === null) setOriginalFlightPurposeText(flightPurposeText || '');
      if (originalTakeoffAddress === null) setOriginalTakeoffAddress(takeoffLocation?.address || '');
      if (originalLandingAddress === null) setOriginalLandingAddress(landingLocation?.address || '');
      if (originalTakeoffLocation === null) setOriginalTakeoffLocation(takeoffLocation ? { ...takeoffLocation } : null);
      if (originalLandingLocation === null) setOriginalLandingLocation(landingLocation ? { ...landingLocation } : null);
      // 幅計測
      const measure = () => {
        if (takeoffLineRef.current) {
          setTakeoffLineWidth(takeoffLineRef.current.offsetWidth);
        }
      };
      // 少し遅延させてレイアウト確定後に計測
      setTimeout(measure, 0);
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    } else {
      setEditLocations(false);
      setEditSpecialFlights(false);
      setEditPurpose(false);
      if (originalSpecialFlights !== null) setOriginalSpecialFlights(null);
      if (originalFlightPurposeText !== null) setOriginalFlightPurposeText(null);
      if (originalTakeoffAddress !== null) setOriginalTakeoffAddress(null);
      if (originalLandingAddress !== null) setOriginalLandingAddress(null);
      if (originalTakeoffLocation !== null) setOriginalTakeoffLocation(null);
      if (originalLandingLocation !== null) setOriginalLandingLocation(null);
      setTakeoffLineWidth(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen]);

  // 日の出・日没時刻の計算
  const calculateSunTimes = (date: Date, lat: number, lon: number) => {
    // 簡易的な計算（実際の日の出・日没時刻はより複雑な計算が必要）
    const dayOfYear = Math.floor(
      (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) /
        1000 /
        60 /
        60 /
        24
    );
    const p = Math.asin(
      0.39795 * Math.cos((0.98563 * (dayOfYear - 173) * Math.PI) / 180)
    );
    const sunrise =
      -lon -
      (Math.acos(-Math.tan((lat * Math.PI) / 180) * Math.tan(p)) * 180) /
        Math.PI;
    const sunset =
      -lon +
      (Math.acos(-Math.tan((lat * Math.PI) / 180) * Math.tan(p)) * 180) /
        Math.PI;

    const sunriseTime = new Date(date);
    sunriseTime.setHours(12 + sunrise / 15, (sunrise % 15) * 4, 0, 0);

    const sunsetTime = new Date(date);
    sunsetTime.setHours(12 + sunset / 15, (sunset % 15) * 4, 0, 0);

    return { sunrise: sunriseTime, sunset: sunsetTime };
  };

  // 着陸地点の緯度経度を使用（未選択の場合は東京のデフォルト値）
  const defaultLat =
    landingLocation?.lat || landingLocation?.coordinates?.lat || 35.6762;
  const defaultLon =
    landingLocation?.lon || landingLocation?.coordinates?.lon || 139.6503;
  const sunTimes = calculateSunTimes(currentTime, defaultLat, defaultLon);

  // 残り時間の計算
  const getTimeRemaining = (targetTime: Date) => {
    const diff = targetTime.getTime() - currentTime.getTime();
    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    } else {
      return `${minutes}分`;
    }
  };

  // 現在時刻の更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 記録時間の更新
  useEffect(() => {
    if (isRecording && recordingStartTime) {
      const timer = setInterval(() => {
        setRecordingTime(
          Math.floor((Date.now() - recordingStartTime.getTime()) / 1000)
        );
      }, 100);
      return () => clearInterval(timer);
    }
  }, [isRecording, recordingStartTime]);

  // 点検画面へ進む
  const handleProceedToInspection = () => {
    if (
      !selectedAircraft ||
      !selectedPilot ||
      !takeoffLocation ||
      !landingLocation
    ) {
      setError("全ての項目を入力してください");
      return;
    }

    // 機体が変更された場合、点検チェックをリセット
    if (previousAircraft && previousAircraft !== selectedAircraft) {
      setInspectionChecks({});
      setInspectionNotes({});
    }

    // 現在の機体を記録
    setPreviousAircraft(selectedAircraft);
    setCurrentScreen("inspection");
  };

  // チェックリスト画面へ進む
  const handleInspectionComplete = () => {
    const allChecked = INSPECTION_ITEMS.every(
      (item) => inspectionChecks[item.id]
    );
    if (!allChecked) {
      setError("全ての点検項目をチェックしてください");
      return;
    }
    // SOTENシリーズのみチェックリスト画面へ、それ以外は飛行開始へスキップ
    setCurrentScreen(isSotenSelected ? "checklist" : "flight");
  };

  // 飛行開始画面へ進む
  const handleChecklistComplete = () => {
    const checkableItems = CHECKLIST_ITEMS.filter((item) => item.hasCheckbox);
    const allChecked = checkableItems.every((item) => checklistItems[item.id]);
    if (!allChecked) {
      setError("全てのチェックリスト項目をチェックしてください");
      return;
    }
    setCheckCompletedTime(new Date());
    setCurrentScreen("flight");
  };

  // 記録開始/停止
  const handleRecordToggle = async () => {
    if (!isRecording) {
      // カバーが開いている場合のみ記録開始
      if (buttonCoverOpen) {
        try {
          // 地点の使用回数を増やす
          if (takeoffLocation?.locationId) {
            await incrementUsage(takeoffLocation.locationId);
          }
          if (
            landingLocation?.locationId &&
            landingLocation.locationId !== takeoffLocation?.locationId
          ) {
            await incrementUsage(landingLocation.locationId);
          }

          setIsRecording(true);
          setRecordingStartTime(new Date());
          setButtonCoverOpen(false);
        } catch (error) {
          console.error("Failed to start recording:", error);
        }
      }
    } else {
      // 記録停止の確認
      setShowStopConfirm(true);
    }
  };

  // 記録停止の確認
  const handleStopConfirm = async () => {
    try {
      // 記録停止 → ポストフライトへ（保存はまだ行わない）
      setIsRecording(false);
      setShowStopConfirm(false);
      // プリフライトのチェックは毎回クリア
      setChecklistItems({});
      setCurrentScreen("postflight");
      return;
    } catch (error) {
      console.error("Failed to stop recording:", error);
    }
  };

  // 全入力リセットして初期画面へ
  const resetAllAndGoHome = () => {
    setSelectedAircraft("");
    setSelectedPilot("");
    setDipsApplied(false);
    setPreviousAircraft("");
    setTakeoffLocation(null);
    setLandingLocation(null);
    setSameLocation(false);
    setInspectionChecks({});
    setInspectionNotes({});
    setEditingNote(null);
    setChecklistItems({});
    setFlightPurposeText("");
    setSpecialFlights([]);
    setPostFlightChecks({});
    setSotenProcedures({ cameraStop: false, screenStop: false });
    setButtonCoverOpen(false);
    setIsRecording(false);
    setRecordingStartTime(null);
    setRecordingTime(0);
    setShowStopConfirm(false);
    setShowCompleteConfirm(false);
    setCheckCompletedTime(null);
    setError(null);
    setEditLocations(false);
    setEditSpecialFlights(false);
    setEditPurpose(false);
    setOriginalSpecialFlights(null);
    setOriginalFlightPurposeText(null);
    setOriginalTakeoffAddress(null);
    setOriginalLandingAddress(null);
    setOriginalTakeoffLocation(null);
    setOriginalLandingLocation(null);
    setCurrentScreen("initial");
  };

  // フライト保存とホームへ戻る
  const handleSaveAndReturnHome = async () => {
    try {
      // パイロットと機体の情報を取得
      const pilot = pilots.find((p) => p.pilotId === selectedPilot);
      const aircraft = aircrafts.find((a) => a.aircraftId === selectedAircraft);

      // 飛行記録を保存
      const flightRecord = {
        // 必須フィールド
        flightDate: toJSTISOString(recordingStartTime!).split("T")[0],
        pilotName: pilot?.name || "",
        registrationNumber: aircraft?.registrationNumber || "",

        // オプションフィールド
        pilotId: selectedPilot || "",
        aircraftId: selectedAircraft || "",
        date: toJSTISOString(recordingStartTime!).split("T")[0],
        squawk: currentTime
          .toTimeString()
          .split(" ")[0]
          .replace(/:/g, "")
          .substring(0, 4),
        flightType: specialFlights && specialFlights.length ? specialFlights : undefined,
        timeBeforeEngine: checkCompletedTime
          ? Math.floor(
              (recordingStartTime!.getTime() - checkCompletedTime.getTime()) /
                60000
            ).toString()
          : "0",
        takeoffLocation: takeoffLocation
          ? {
              locationId: takeoffLocation.locationId,
              name:
                takeoffLocation.name ||
                extractPlaceName(takeoffLocation.address),
              address: takeoffLocation.address,
              coordinates: {
                lat: takeoffLocation.lat ?? takeoffLocation.coordinates?.lat,
                lon: takeoffLocation.lon ?? takeoffLocation.coordinates?.lon,
              },
              uasportCode: takeoffLocation.uasportCode,
            }
          : undefined,
        landingLocation: landingLocation
          ? {
              locationId: landingLocation.locationId,
              name:
                landingLocation.name ||
                extractPlaceName(landingLocation.address),
              address: landingLocation.address,
              coordinates: {
                lat: landingLocation.lat ?? landingLocation.coordinates?.lat,
                lon: landingLocation.lon ?? landingLocation.coordinates?.lon,
              },
              uasportCode: landingLocation.uasportCode,
            }
          : undefined,
        flightStartTime: toJSTISOString(recordingStartTime!),
        flightEndTime: toJSTISOString(new Date()),
        takeoffTime: toJSTISOString(recordingStartTime!),
        landingTime: toJSTISOString(new Date()),
        flightDuration: Math.floor(recordingTime / 60),
        flightPurpose: flightPurposeText,
        remarks: "",
      };

      const saved = await flightLogAPI.create(userId, flightRecord);
      console.log("Flight record saved:", flightRecord);

      // Google Sheetsへの書き込み
      try {
        // まず outputs を試し、なければ環境変数フォールバック
        let url: string | undefined;
        let parentFolderId: string | undefined;
        try {
          const outputsRes = await fetch("/amplify_outputs.json", { cache: "no-store" });
          if (outputsRes.ok) {
            const outputs = await outputsRes.json();
            url = outputs?.custom?.logbookToSheetsUrl;
            parentFolderId = outputs?.custom?.parentFolderId || undefined;
          }
        } catch {}
        if (!url) url = process.env.REACT_APP_LOGBOOK_TO_SHEETS_URL;
        if (!url) throw new Error("logbookToSheetsUrl 未設定（outputs/env）");

        // 非同期で発火し、画面遷移はブロックしない
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flightLog: saved,
            registrationNumber: (saved.registrationNumber || "").trim(),
            aircraftName: aircraft?.name || "",
            folderId: parentFolderId,
          }),
        })
          .then(async (response) => {
            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`
              );
            }
            const result = await response.json();
            console.log("Flight record synced to Google Sheets:", result);
          })
          .catch((sheetsError) => {
            console.error("Failed to sync to Google Sheets:", sheetsError);
          });
      } catch (sheetsError) {
        console.error("Failed to sync to Google Sheets:", sheetsError);
        // UIブロックしないため、ここではアラートを出さない
      }

      // 初期化とホームへ戻る
      resetAllAndGoHome();
    } catch (error) {
      console.error("Failed to save flight record:", error);
      alert("飛行記録の保存に失敗しました");
    }
  };

  // 時間のフォーマット
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // スマホ用のスタイル
  const mobileContainer = {
    height: "100dvh",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f5f5f5",
    overflow: "hidden",
  };

  if (loading) {
    return (
      <Box
        sx={{
          ...mobileContainer,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // 初期画面
  if (currentScreen === "initial") {
    return (
      <Box sx={mobileContainer}>
        <Box
          sx={{
            p: 2,
            backgroundColor: "#fff",
            boxShadow: 1,
            textAlign: "center",
          }}
        >
          <Typography variant="h5" fontWeight="bold">
            飛行記録
          </Typography>
        </Box>

        <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
          <Stack spacing={2}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <FormControl fullWidth>
              <InputLabel>機体</InputLabel>
              <Select
                value={selectedAircraft}
                onChange={(e) => setSelectedAircraft(e.target.value)}
                label="機体"
              >
                {aircrafts
                  .sort((a, b) => a.manufacturer.localeCompare(b.manufacturer))
                  .map((aircraft) => (
                    <MenuItem
                      key={aircraft.aircraftId}
                      value={aircraft.aircraftId}
                    >
                      {aircraft.manufacturer} {aircraft.model}{" "}
                      {aircraft.name && `"${aircraft.name}"`}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>操縦者</InputLabel>
              <Select
                value={selectedPilot}
                onChange={(e) => setSelectedPilot(e.target.value)}
                label="操縦者"
              >
                {pilots.map((pilot) => (
                  <MenuItem key={pilot.pilotId} value={pilot.pilotId}>
                    {pilot.name}
                    {pilot.licenseNumber && ` (${pilot.licenseNumber})`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Paper sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Typography variant="subtitle1" fontWeight="bold">
                  離着陸地点
                </Typography>

                <Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<LocationIcon />}
                      onClick={() => setShowLocationPicker("takeoff")}
                      sx={{ justifyContent: "flex-start", textAlign: "left" }}
                    >
                      {takeoffLocation ? (
                        <Box>
                          <Typography variant="body2">
                            {takeoffLocation.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {takeoffLocation.address
                              .replace(/^日本、/, "")
                              .replace(/^日本/, "")}
                          </Typography>
                        </Box>
                      ) : (
                        "離陸地点を選択"
                      )}
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => setShowSimpleLocationPicker("takeoff")}
                      sx={{
                        minWidth: "auto",
                        px: 1.5,
                        py: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <DataTableIcon />
                    </Button>
                  </Stack>
                </Box>

                <Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<LocationIcon />}
                      onClick={() => setShowLocationPicker("landing")}
                      sx={{ justifyContent: "flex-start", textAlign: "left" }}
                    >
                      {landingLocation ? (
                        <Box>
                          <Typography variant="body2">
                            {landingLocation.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {landingLocation.address
                              .replace(/^日本、/, "")
                              .replace(/^日本/, "")}
                          </Typography>
                        </Box>
                      ) : (
                        "着陸地点を選択"
                      )}
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => setShowSimpleLocationPicker("landing")}
                      sx={{
                        minWidth: "auto",
                        px: 1.5,
                        py: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <DataTableIcon />
                    </Button>
                  </Stack>
                </Box>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={sameLocation}
                      onChange={(e) => {
                        setSameLocation(e.target.checked);
                        if (e.target.checked && takeoffLocation) {
                          setLandingLocation(takeoffLocation);
                        }
                      }}
                    />
                  }
                  label="着陸地点も同じ場所にする"
                />
              </Stack>
            </Paper>

            <FormControlLabel
              control={
                <Checkbox
                  checked={dipsApplied}
                  onChange={(e) => setDipsApplied(e.target.checked)}
                />
              }
              label="DIPS申請済み"
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleProceedToInspection}
              disabled={
                !selectedAircraft ||
                !selectedPilot ||
                !takeoffLocation ||
                !landingLocation
              }
              sx={{ py: 2, mt: 2 }}
            >
              点検へ進む
            </Button>
          </Stack>
        </Box>

        <LocationPicker
          open={showLocationPicker === "takeoff"}
          onClose={() => setShowLocationPicker(null)}
          userId={userId}
          onConfirm={async (location) => {
            console.log("[Logbook] Takeoff location confirm:", location);
            // 既存地点がLocationPickerで見つかった場合
            if (location.nearbyLocationId) {
              console.log(
                "[Logbook] Using nearby location:",
                location.nearbyLocationId
              );
              try {
                // 既存地点の情報を取得（TODO: getLocation APIが必要）
                setTakeoffLocation({
                  locationId: location.nearbyLocationId,
                  name: location.name,
                  address: location.address,
                  lat: location.coordinates.lat,
                  lon: location.coordinates.lon,
                  coordinates: location.coordinates,
                });
                if (sameLocation) {
                  setLandingLocation({
                    locationId: location.nearbyLocationId,
                    name: location.name,
                    address: location.address,
                    lat: location.coordinates.lat,
                    lon: location.coordinates.lon,
                    coordinates: location.coordinates,
                  });
                }
                // 使用回数を増やす
                await incrementUsage(location.nearbyLocationId);
              } catch (error) {
                console.error("Failed to use nearby location:", error);
              }
            } else if (location.saveToDatabase) {
              console.log("[Logbook] Saving new location to database");
              try {
                // LocationPickerで既に10mチェック済みなので、直接保存
                const savedLocation = await createLocation({
                  name: location.name, // LocationPickerでカスタマイズされた名前を使用
                  address: location.address,
                  coordinates: {
                    lat: location.coordinates.lat,
                    lon: location.coordinates.lon,
                  },
                  tags: location.tag ? [location.tag] : [],
                });
                console.log("[Logbook] Location saved:", savedLocation);
                // 保存した地点のIDを含めて設定
                setTakeoffLocation({
                  locationId: savedLocation.locationId,
                  name: savedLocation.name,
                  address: savedLocation.address,
                  lat: savedLocation.coordinates.lat,
                  lon: savedLocation.coordinates.lon,
                  coordinates: savedLocation.coordinates,
                });
                if (sameLocation) {
                  setLandingLocation({
                    locationId: savedLocation.locationId,
                    name: savedLocation.name,
                    address: savedLocation.address,
                    lat: savedLocation.coordinates.lat,
                    lon: savedLocation.coordinates.lon,
                    coordinates: savedLocation.coordinates,
                  });
                }
              } catch (error) {
                console.error("Failed to save location:", error);
                // 保存に失敗してもlocationIdなしで設定
                setTakeoffLocation({
                  name: location.name,
                  address: location.address,
                  lat: location.coordinates.lat,
                  lon: location.coordinates.lon,
                  coordinates: location.coordinates,
                });
                if (sameLocation) {
                  setLandingLocation({
                    name: location.name,
                    address: location.address,
                    lat: location.coordinates.lat,
                    lon: location.coordinates.lon,
                    coordinates: location.coordinates,
                  });
                }
              }
            } else {
              setTakeoffLocation({
                name: location.name,
                address: location.address,
                lat: location.coordinates.lat,
                lon: location.coordinates.lon,
                coordinates: location.coordinates,
              });
              if (sameLocation) {
                setLandingLocation({
                  name: location.name,
                  address: location.address,
                  lat: location.coordinates.lat,
                  lon: location.coordinates.lon,
                  coordinates: location.coordinates,
                });
              }
            }
            setShowLocationPicker(null);
          }}
          title="離陸地点を選択"
        />

        <LocationPicker
          open={showLocationPicker === "landing"}
          onClose={() => setShowLocationPicker(null)}
          userId={userId}
          onConfirm={async (location) => {
            console.log("[Logbook] Landing location confirm:", location);
            // 既存地点がLocationPickerで見つかった場合
            if (location.nearbyLocationId) {
              console.log(
                "[Logbook] Using nearby location:",
                location.nearbyLocationId
              );
              try {
                // 既存地点の情報を取得（TODO: getLocation APIが必要）
                setLandingLocation({
                  locationId: location.nearbyLocationId,
                  name: location.name,
                  address: location.address,
                  lat: location.coordinates.lat,
                  lon: location.coordinates.lon,
                  coordinates: location.coordinates,
                });
                // 使用回数を増やす
                await incrementUsage(location.nearbyLocationId);
              } catch (error) {
                console.error("Failed to use nearby location:", error);
              }
            } else if (location.saveToDatabase) {
              console.log("[Logbook] Saving new location to database");
              try {
                // LocationPickerで既に10mチェック済みなので、直接保存
                const savedLocation = await createLocation({
                  name: extractPlaceName(location.address),
                  address: location.address,
                  coordinates: {
                    lat: location.coordinates.lat,
                    lon: location.coordinates.lon,
                  },
                  tags: location.tag ? [location.tag] : [],
                });
                console.log("[Logbook] Location saved:", savedLocation);
                // 保存した地点のIDを含めて設定
                setLandingLocation({
                  locationId: savedLocation.locationId,
                  name: savedLocation.name,
                  address: savedLocation.address,
                  lat: savedLocation.coordinates.lat,
                  lon: savedLocation.coordinates.lon,
                  coordinates: savedLocation.coordinates,
                });
              } catch (error) {
                console.error("Failed to save location:", error);
                // 保存に失敗してもlocationIdなしで設定
                setLandingLocation({
                  name: location.name,
                  address: location.address,
                  lat: location.coordinates.lat,
                  lon: location.coordinates.lon,
                  coordinates: location.coordinates,
                });
              }
            } else {
              console.log("[Logbook] Not saving to database");
              setLandingLocation({
                name: location.name,
                address: location.address,
                lat: location.coordinates.lat,
                lon: location.coordinates.lon,
                coordinates: location.coordinates,
              });
            }
            setShowLocationPicker(null);
          }}
          title="着陸地点を選択"
        />

        <SimpleLocationPicker
          open={showSimpleLocationPicker === "takeoff"}
          onClose={() => setShowSimpleLocationPicker(null)}
          onConfirm={(location) => {
            setTakeoffLocation(location);
            if (sameLocation) {
              setLandingLocation(location);
            }
            setShowSimpleLocationPicker(null);
          }}
          title="離陸地点を選択"
          userId={userId}
        />

        <SimpleLocationPicker
          open={showSimpleLocationPicker === "landing"}
          onClose={() => setShowSimpleLocationPicker(null)}
          onConfirm={(location) => {
            setLandingLocation(location);
            setShowSimpleLocationPicker(null);
          }}
          title="着陸地点を選択"
          userId={userId}
        />
      </Box>
    );
  }

  // 点検画面
  if (currentScreen === "inspection") {
    return (
      <Box sx={mobileContainer}>
        <Box
          sx={{
            p: 2,
            backgroundColor: "#fff",
            boxShadow: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          <IconButton
            onClick={() => setCurrentScreen("initial")}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight="bold">
            飛行前点検
          </Typography>
        </Box>

        <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
          <Stack spacing={1}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* 一括チェック */}
            <Paper
              sx={{
                p: 2,
                bgcolor: INSPECTION_ITEMS.every(
                  (item) => inspectionChecks[item.id]
                )
                  ? "success.main"
                  : "primary.main",
                color: "white",
                cursor: "pointer",
                transition: "all 0.3s",
                "&:hover": {
                  bgcolor: INSPECTION_ITEMS.every(
                    (item) => inspectionChecks[item.id]
                  )
                    ? "success.dark"
                    : "primary.dark",
                },
              }}
              onClick={() => {
                const allChecked = INSPECTION_ITEMS.every(
                  (item) => inspectionChecks[item.id]
                );
                const newChecks: Record<string, boolean> = {};
                INSPECTION_ITEMS.forEach((item) => {
                  newChecks[item.id] = !allChecked;
                });
                setInspectionChecks(newChecks);
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Checkbox
                  checked={INSPECTION_ITEMS.every(
                    (item) => inspectionChecks[item.id]
                  )}
                  onChange={(e) => {
                    e.stopPropagation();
                    const newChecks: Record<string, boolean> = {};
                    INSPECTION_ITEMS.forEach((item) => {
                      newChecks[item.id] = e.target.checked;
                    });
                    setInspectionChecks(newChecks);
                  }}
                  sx={{
                    color: "white",
                    "&.Mui-checked": {
                      color: "white",
                    },
                  }}
                />
                <Typography variant="body1" fontWeight="bold" sx={{ ml: 1 }}>
                  点検済み（全項目チェック）
                </Typography>
              </Box>
            </Paper>

            {INSPECTION_ITEMS.map((item) => (
              <Paper
                key={item.id}
                sx={{
                  p: 2,
                  backgroundColor: inspectionChecks[item.id]
                    ? "#e8f5e9"
                    : "#fff",
                  transition: "background-color 0.3s",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.subtitle}
                    </Typography>
                    {inspectionNotes[item.id] && (
                      <Typography
                        variant="body2"
                        sx={{ mt: 1, color: "info.main" }}
                      >
                        備考: {inspectionNotes[item.id]}
                      </Typography>
                    )}
                  </Box>
                  <IconButton
                    onClick={() =>
                      setEditingNote(editingNote === item.id ? null : item.id)
                    }
                    size="small"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <Checkbox
                    checked={inspectionChecks[item.id] || false}
                    onChange={(e) =>
                      setInspectionChecks({
                        ...inspectionChecks,
                        [item.id]: e.target.checked,
                      })
                    }
                    size="large"
                    sx={{
                      color: "grey.400",
                      "&.Mui-checked": { color: "success.main" },
                    }}
                  />
                </Stack>

                {editingNote === item.id && (
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="特記事項を入力"
                      value={inspectionNotes[item.id] || ""}
                      onChange={(e) =>
                        setInspectionNotes({
                          ...inspectionNotes,
                          [item.id]: e.target.value,
                        })
                      }
                      onBlur={() => setEditingNote(null)}
                      autoFocus
                    />
                  </Box>
                )}
              </Paper>
            ))}
          </Stack>
        </Box>

        <Box sx={{ p: 2, backgroundColor: '#fff', boxShadow: '0 -2px 4px rgba(0,0,0,0.1)', position: 'sticky', bottom: 0, pb: 'calc(16px + env(safe-area-inset-bottom))' }}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleInspectionComplete}
            disabled={
              !INSPECTION_ITEMS.every((item) => inspectionChecks[item.id])
            }
            sx={{ py: 2 }}
          >
            チェックリストへ進む
          </Button>
        </Box>
      </Box>
    );
  }

  // チェックリスト画面
  if (currentScreen === "checklist") {
    return (
      <Box sx={mobileContainer}>
        <Box
          sx={{
            p: 2,
            backgroundColor: "#fff",
            boxShadow: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          <IconButton
            onClick={() => setCurrentScreen("inspection")}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight="bold">
            チェックリスト
          </Typography>
        </Box>

        <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
          <Stack spacing={1}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {CHECKLIST_ITEMS.map((item, index) => (
              <Paper
                key={item.id}
                sx={{
                  p: 2,
                  backgroundColor:
                    item.hasCheckbox && checklistItems[item.id]
                      ? "#e8f5e9"
                      : "#fff",
                  transition: "background-color 0.3s",
                  cursor: item.hasCheckbox ? "pointer" : "default",
                  "&:hover": item.hasCheckbox
                    ? {
                        backgroundColor: checklistItems[item.id]
                          ? "#e8f5e9"
                          : "#f5f5f5",
                      }
                    : {},
                }}
                onClick={() => {
                  if (item.hasCheckbox) {
                    setChecklistItems({
                      ...checklistItems,
                      [item.id]: !checklistItems[item.id],
                    });
                  }
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box sx={{ minWidth: 40, textAlign: "center" }}>
                    <Typography variant="caption" color="text.secondary">
                      {index + 1}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      sx={{
                        color: "text.primary",
                      }}
                    >
                      {item.title}
                    </Typography>
                  </Box>
                  {item.hasCheckbox && (
                    <Checkbox
                      checked={checklistItems[item.id] || false}
                      onChange={(e) => {
                        e.stopPropagation();
                        setChecklistItems({
                          ...checklistItems,
                          [item.id]: e.target.checked,
                        });
                      }}
                      size="large"
                      sx={{
                        color: "grey.400",
                        "&.Mui-checked": { color: "success.main" },
                      }}
                    />
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>

        <Box
          sx={{
            p: 2,
            backgroundColor: "#fff",
            boxShadow: "0 -2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleChecklistComplete}
            disabled={
              !CHECKLIST_ITEMS.filter((item) => item.hasCheckbox).every(
                (item) => checklistItems[item.id]
              )
            }
            sx={{ py: 2 }}
          >
            飛行開始へ進む
          </Button>
        </Box>
      </Box>
    );
  }

  // ポストフライト画面（SOTEN手順 + 点検）
  if (currentScreen === "postflight") {
    const POST_CHECKS = [
      { id: 'clean', label: '機体にゴミ等の付着はないか' },
      { id: 'mount', label: '各機器は確実に取り付けられているか（ネジ等の脱落やゆるみ等）' },
      { id: 'damage', label: '機体（プロペラ、フレーム等）に損傷やゆがみはないか' },
      { id: 'heat', label: '各機器の異常な発熱はないか' },
    ];
    const postChecklistAll = POST_CHECKS.every((c) => postFlightChecks[c.id]);
    const sotenOK = !isSotenSelected || (sotenProcedures.cameraStop && sotenProcedures.screenStop);
    const remarksRequired = !postChecklistAll;
    const canComplete = sotenOK && (postChecklistAll || postFlightNotes.trim().length > 0);
    return (
      <Box sx={mobileContainer}>
        <Box sx={{ p: 2, bgcolor: '#fff', boxShadow: 1 }}>
          <Typography variant="h6" fontWeight="bold" align="center">
            ポストフライト
          </Typography>
        </Box>
        <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
          {isSotenSelected && (
            <Paper sx={{ p: 2, mb: 2, borderLeft: '4px solid #1976d2' }}>
              <Typography variant="subtitle1" fontWeight="bold">SOTENプロシージャー</Typography>
              <Stack>
                <FormControlLabel control={<Checkbox checked={sotenProcedures.cameraStop} onChange={(e)=>setSotenProcedures(p=>({...p,cameraStop:e.target.checked}))} />} label="カメラ録画停止" />
                <FormControlLabel control={<Checkbox checked={sotenProcedures.screenStop} onChange={(e)=>setSotenProcedures(p=>({...p,screenStop:e.target.checked}))} />} label="スクリーンキャプチャ停止" />
              </Stack>
            </Paper>
          )}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
              飛行後点検
            </Typography>
            <Stack>
              {POST_CHECKS.map((item) => (
                <FormControlLabel
                  key={item.id}
                  control={
                    <Checkbox
                      checked={!!postFlightChecks[item.id]}
                      onChange={(e) =>
                        setPostFlightChecks({ ...postFlightChecks, [item.id]: e.target.checked })
                      }
                    />
                  }
                  label={item.label}
                />
              ))}
            </Stack>
            <TextField
              fullWidth
              multiline
              minRows={2}
              sx={{ mt: 2 }}
              label={remarksRequired ? '特記事項（未チェック項目がある場合は必須）' : '特記事項'}
              value={postFlightNotes}
              onChange={(e)=>setPostFlightNotes(e.target.value)}
              error={remarksRequired && postFlightNotes.trim().length === 0}
              helperText={remarksRequired && postFlightNotes.trim().length === 0 ? '未チェック項目があるため、特記事項を記入してください' : undefined}
            />
          </Paper>
        </Box>
        <Box sx={{ p: 2, bgcolor: '#fff', boxShadow: '0 -2px 4px rgba(0,0,0,0.1)', position: 'sticky', bottom: 0, pb: 'calc(16px + env(safe-area-inset-bottom))' }}>
          <Button fullWidth variant="contained" size="large" onClick={()=>setShowCompleteConfirm(true)} disabled={!canComplete}>フライト完了</Button>
        </Box>
        <Dialog open={showCompleteConfirm} onClose={()=>setShowCompleteConfirm(false)} maxWidth="xs" fullWidth>
          <DialogContent>
            <Stack spacing={2}>
              <Typography variant="h6" align="center">フライト完了</Typography>
              <Typography variant="body2" align="center" color="text.secondary">点検が完了していればスライドしてください</Typography>
              <SlideToConfirm
                onConfirm={() => {
                  if (!canComplete) {
                    setError('SOTENプロシージャーおよび飛行後点検の要件を満たしてください');
                    return;
                  }
                  setError(null);
                  setShowCompleteConfirm(false);
                  setCurrentScreen('summary');
                }}
                text="スライドしてフライト完了"
              />
            </Stack>
          </DialogContent>
        </Dialog>
      </Box>
    );
  }

  // フライト概要（サマリー）
  if (currentScreen === "summary") {
    return (
      <Box sx={mobileContainer}>
        <Box sx={{ p: 2, bgcolor: '#fff', boxShadow: 1 }}>
          <Typography variant="h6" fontWeight="bold" align="center">フライト概要</Typography>
        </Box>
        <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
          <Stack spacing={1.5}>
            <Paper sx={{ p: 1.5, position: 'relative', border: editLocations ? '2px solid' : undefined, borderColor: editLocations ? 'primary.main' : undefined }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2" color="text.secondary">飛行場所</Typography>
                <IconButton size="small" onClick={()=>setEditLocations(v=>!v)} aria-label="編集"><EditIcon fontSize="small" /></IconButton>
              </Stack>
              <Stack spacing={0.5}>
                <Box ref={takeoffLineRef} sx={{ display: 'inline-block' }}>
                  <Typography variant="body2">離陸場所：{takeoffLocation ? extractPlaceName(takeoffLocation.address) : '未選択'}</Typography>
                </Box>
                <Box sx={{ width: takeoffLineWidth ? `${takeoffLineWidth}px` : 'auto', textAlign: takeoffLineWidth ? 'center' : 'left' }}>
                  <Typography variant="body2">↓</Typography>
                </Box>
                <Typography variant="body2">着陸場所：{landingLocation ? extractPlaceName(landingLocation.address) : '未選択'}</Typography>
              </Stack>
              {editLocations && (
                <>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <IconButton size="small" onClick={() => setShowSimpleLocationPicker('takeoff')}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => setShowSimpleLocationPicker('landing')}><EditIcon fontSize="small" /></IconButton>
                  </Stack>
                  <Box sx={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => {
                      setTakeoffLocation(originalTakeoffLocation);
                      setLandingLocation(originalLandingLocation);
                      setEditLocations(false);
                    }}>キャンセル</Button>
                    <Button size="small" variant="contained" onClick={() => {
                      setOriginalTakeoffLocation(takeoffLocation ? { ...takeoffLocation } : null);
                      setOriginalLandingLocation(landingLocation ? { ...landingLocation } : null);
                      setOriginalTakeoffAddress(takeoffLocation?.address || '');
                      setOriginalLandingAddress(landingLocation?.address || '');
                      setEditLocations(false);
                    }}>保存</Button>
                  </Box>
                </>
              )}
            </Paper>

            <Paper sx={{ p: 1.5, position: 'relative', border: editSpecialFlights ? '2px solid' : undefined, borderColor: editSpecialFlights ? 'primary.main' : undefined }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>飛行時間</Typography>
              <Typography variant="body1">{formatTime(recordingTime)}</Typography>
            </Paper>

            <Paper sx={{ p: 1.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2" color="text.secondary">特定飛行</Typography>
                <IconButton size="small" onClick={()=>setEditSpecialFlights(v=>!v)} aria-label="編集"><EditIcon fontSize="small" /></IconButton>
              </Stack>
              <Stack>
                {SPECIAL_FLIGHT_OPTIONS.map((label) => {
                  const changed = originalSpecialFlights ? (originalSpecialFlights.includes(label) !== specialFlights.includes(label)) : false;
                  return (
                    <FormControlLabel
                      key={label}
                      control={
                        <Checkbox
                          checked={specialFlights.includes(label)}
                          onChange={(e) => {
                            if (!editSpecialFlights) return;
                            setSpecialFlights((prev) => e.target.checked ? [...prev, label] : prev.filter((v) => v !== label));
                          }}
                          sx={changed ? { color: 'warning.main', '&.Mui-checked': { color: 'warning.main' } } : undefined}
                        />
                      }
                      label={label}
                      sx={changed ? { color: 'warning.main' } : undefined}
                    />
                  );
                })}
              </Stack>
              {specialFlights.length === 0 && (
                <Typography variant="caption" color="text.secondary">該当しない</Typography>
              )}
              {editSpecialFlights && (
                <Box sx={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined" onClick={() => {
                    if (originalSpecialFlights) setSpecialFlights([...originalSpecialFlights]);
                    setEditSpecialFlights(false);
                  }}>キャンセル</Button>
                  <Button size="small" variant="contained" onClick={() => {
                    setOriginalSpecialFlights([...specialFlights]);
                    setEditSpecialFlights(false);
                  }}>保存</Button>
                </Box>
              )}
            </Paper>

            <Paper sx={{ p: 1.5, position: 'relative', border: editPurpose ? '2px solid' : undefined, borderColor: editPurpose ? 'primary.main' : undefined }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2" color="text.secondary">飛行目的</Typography>
                <IconButton size="small" onClick={()=>setEditPurpose(v=>!v)} aria-label="編集"><EditIcon fontSize="small" /></IconButton>
              </Stack>
              <TextField
                fullWidth
                value={flightPurposeText}
                onChange={(e) => setFlightPurposeText(e.target.value)}
                InputProps={{ readOnly: !editPurpose }}
                sx={
                  originalFlightPurposeText !== null && flightPurposeText !== originalFlightPurposeText
                    ? { '& .MuiOutlinedInput-root fieldset': { borderColor: 'warning.main' } }
                    : undefined
                }
              />
              {editPurpose && (
                <Box sx={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined" onClick={() => {
                    if (originalFlightPurposeText !== null) setFlightPurposeText(originalFlightPurposeText);
                    setEditPurpose(false);
                  }}>キャンセル</Button>
                  <Button size="small" variant="contained" onClick={() => {
                    setOriginalFlightPurposeText(flightPurposeText || '');
                    setEditPurpose(false);
                  }}>保存</Button>
                </Box>
              )}
            </Paper>
          </Stack>
        </Box>
        {(() => {
          const hasSummaryEdits = !!(
            (originalSpecialFlights && (originalSpecialFlights.length !== specialFlights.length || originalSpecialFlights.some(v=>!specialFlights.includes(v)))) ||
            (originalFlightPurposeText !== null && originalFlightPurposeText !== (flightPurposeText || '')) ||
            (originalTakeoffAddress !== null && originalTakeoffAddress !== (takeoffLocation?.address || '')) ||
            (originalLandingAddress !== null && originalLandingAddress !== (landingLocation?.address || ''))
          );
          return (
            <Box sx={{ p: 2, bgcolor: '#fff', boxShadow: '0 -2px 4px rgba(0,0,0,0.1)', position: 'sticky', bottom: 0, pb: 'calc(16px + env(safe-area-inset-bottom))' }}>
              <Button fullWidth variant="contained" size="large" onClick={handleSaveAndReturnHome}>
                {hasSummaryEdits ? '修正内容を保存してホームに戻る' : 'ホームに戻る'}
              </Button>
            </Box>
          );
        })()}
      </Box>
    );
  }

  // 飛行開始画面
  return (
    <Box sx={mobileContainer}>
      <Box
        sx={{
          p: 2,
          backgroundColor: "#fff",
          boxShadow: 1,
          position: "relative",
          textAlign: "center",
        }}
      >
        <IconButton
          onClick={() => setCurrentScreen("checklist")}
          sx={{
            position: "absolute",
            left: 8,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight="bold">
          飛行開始
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        <Stack spacing={1.5}>
          <Paper sx={{ p: 1.5 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              機体
            </Typography>
            <Typography variant="body1">
              {(() => {
                const aircraft = aircrafts.find(
                  (a) => a.aircraftId === selectedAircraft
                );
                if (!aircraft) return "未選択";
                return `${aircraft.manufacturer} ${aircraft.model} ${aircraft.name && `"${aircraft.name}"`}`;
              })()}
            </Typography>
          </Paper>

          <Paper sx={{ p: 1.5 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              飛行者
            </Typography>
            <Typography variant="body1">
              {(() => {
                const pilot = pilots.find((p) => p.pilotId === selectedPilot);
                if (!pilot) return "未選択";
                return pilot.name;
              })()}
            </Typography>
          </Paper>

          {/* 特定飛行の種類（複数選択） */}
          <Paper sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
              特定飛行
            </Typography>
            <Stack spacing={0.5}>
              {SPECIAL_FLIGHT_OPTIONS.map((label) => (
                <FormControlLabel
                  key={label}
                  control={
                    <Checkbox
                      checked={specialFlights.includes(label)}
                      onChange={(e) => {
                        setSpecialFlights((prev) =>
                          e.target.checked
                            ? [...prev, label]
                            : prev.filter((v) => v !== label)
                        );
                      }}
                    />
                  }
                  label={label}
                />
              ))}
            </Stack>
          </Paper>

          {/* 飛行の目的（フリーテキスト） */}
          <Paper sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
              飛行の目的
            </Typography>
            <TextField
              fullWidth
              placeholder="例: 橋梁点検"
              value={flightPurposeText}
              onChange={(e) => setFlightPurposeText(e.target.value)}
            />
          </Paper>

          <Paper sx={{ p: 1.5 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              飛行経路
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: "0.7rem" }}
                >
                  離陸
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {takeoffLocation
                    ? extractPlaceName(takeoffLocation.address)
                    : "未選択"}
                </Typography>
              </Box>
              <Typography variant="body1">→</Typography>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: "0.7rem" }}
                >
                  着陸
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {landingLocation
                    ? extractPlaceName(landingLocation.address)
                    : "未選択"}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* 飛行概要セレクトは廃止（飛行目的のフリーテキストに集約） */}

          <Paper sx={{ p: 2, textAlign: "center", backgroundColor: "#f5f5f5" }}>
            <Typography variant="caption" color="text.secondary">
              現在時刻
            </Typography>
            <Typography variant="h3" fontWeight="300">
              {currentTime.toLocaleTimeString("ja-JP", { hour12: false })}
            </Typography>

            {/* 日の出・日没情報 */}
            <Box
              sx={{ mt: 2, display: "flex", justifyContent: "center", gap: 3 }}
            >
              {currentTime < sunTimes.sunrise && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <img
                    src="/SVG/sunrise.svg"
                    alt="日の出"
                    style={{ width: 32, height: 32 }}
                  />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {sunTimes.sunrise.toLocaleTimeString("ja-JP", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      あと{getTimeRemaining(sunTimes.sunrise)}
                    </Typography>
                  </Box>
                </Box>
              )}

              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <img
                  src="/SVG/sunset.svg"
                  alt="日の入り"
                  style={{ width: 32, height: 32 }}
                />
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {sunTimes.sunset.toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Typography>
                  {currentTime < sunTimes.sunset && (
                    <Typography variant="body2" color="text.secondary">
                      あと{getTimeRemaining(sunTimes.sunset)}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Paper>

          {isRecording && (
            <Paper
              sx={{ p: 2, textAlign: "center", backgroundColor: "#ffebee" }}
            >
              <Typography variant="h4" color="error">
                {formatTime(recordingTime)}
              </Typography>
              <Typography variant="caption" color="error">
                記録中
              </Typography>
            </Paper>
          )}
        </Stack>
      </Box>

      <Box sx={{ p: 2, backgroundColor: '#fff', boxShadow: '0 -2px 4px rgba(0,0,0,0.1)', position: 'sticky', bottom: 0, pb: 'calc(16px + env(safe-area-inset-bottom))' }}>
        <Box sx={{ position: "relative" }}>
          {!isRecording && (
            <Button
              fullWidth
              variant={buttonCoverOpen ? "contained" : "outlined"}
              size="large"
              onClick={() => setButtonCoverOpen(!buttonCoverOpen)}
              disabled={flightPurposeText.trim().length === 0}
              sx={{
                py: 3,
                fontSize: "1.2rem",
                transition: "all 0.3s",
              }}
            >
              {buttonCoverOpen ? "記録開始" : "記録開始（タップして準備）"}
            </Button>
          )}

          {buttonCoverOpen && !isRecording && (
            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              startIcon={<PlayIcon />}
              onClick={handleRecordToggle}
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                py: 3,
                fontSize: "1.2rem",
                animation: "pulse 1s infinite",
                "@keyframes pulse": {
                  "0%": { opacity: 0.8 },
                  "50%": { opacity: 1 },
                  "100%": { opacity: 0.8 },
                },
              }}
            >
              記録開始
            </Button>
          )}

          {isRecording && (
            <Button
              fullWidth
              variant="contained"
              color="error"
              size="large"
              startIcon={<StopIcon />}
              onClick={handleRecordToggle}
              sx={{
                py: 3,
                fontSize: "1.2rem",
              }}
            >
              記録停止
            </Button>
          )}
        </Box>
      </Box>

      <Dialog
        open={showStopConfirm}
        onClose={() => setShowStopConfirm(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogContent>
          <Stack spacing={3}>
            <Typography variant="h6" align="center">
              記録を終了
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary">
              記録を停止します。次にポストフライト点検を実施します。
            </Typography>
            <Box sx={{ px: 2 }}>
              <SlideToConfirm
                onConfirm={() => {
                  handleStopConfirm();
                  setShowStopConfirm(false);
                }}
                text="スライドして停止"
              />
            </Box>
            <Typography
              variant="button"
              onClick={() => {
                setShowStopConfirm(false);
              }}
              sx={{
                textAlign: "center",
                color: "primary.main",
                cursor: "pointer",
              }}
            >
              キャンセル
            </Typography>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
