import React, { useState, useEffect } from "react";
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

// 飛行概要の選択肢
const FLIGHT_PURPOSES = ["空撮", "監視", "輸送", "テストフライト", "その他"];

type Screen = "initial" | "inspection" | "flight";

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

  // 飛行記録画面の状態
  const [flightPurpose, setFlightPurpose] = useState<string>("");
  const [customPurpose, setCustomPurpose] = useState<string>("");
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

  // 飛行開始画面へ進む
  const handleInspectionComplete = () => {
    const allChecked = INSPECTION_ITEMS.every(
      (item) => inspectionChecks[item.id]
    );
    if (!allChecked) {
      setError("全ての点検項目をチェックしてください");
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
      // パイロットと機体の情報を取得
      const pilot = pilots.find((p) => p.pilotId === selectedPilot);
      const aircraft = aircrafts.find((a) => a.aircraftId === selectedAircraft);

      // 飛行記録を保存
      const flightRecord = {
        // 必須フィールド
        flightDate: recordingStartTime!.toISOString().split("T")[0],
        pilotName: pilot?.name || "",
        registrationNumber: aircraft?.registrationNumber || "",

        // オプションフィールド
        pilotId: selectedPilot || "",
        aircraftId: selectedAircraft || "",
        date: recordingStartTime!.toISOString().split("T")[0],
        squawk: currentTime
          .toTimeString()
          .split(" ")[0]
          .replace(/:/g, "")
          .substring(0, 4),
        flightTypes: dipsApplied ? ["DIPS"] : [],
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
        flightStartTime: recordingStartTime!.toISOString(),
        flightEndTime: new Date().toISOString(),
        takeoffTime: recordingStartTime!.toISOString(),
        landingTime: new Date().toISOString(),
        flightDuration: Math.floor(recordingTime / 60),
        flightPurpose:
          flightPurpose === "other" ? customPurpose : flightPurpose,
        remarks: "",
      };

      await flightLogAPI.create(userId, flightRecord);
      console.log("Flight record saved:", flightRecord);

      setIsRecording(false);
      setShowStopConfirm(false);
      // 初期画面に戻る
      setCurrentScreen("initial");
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
    height: "100vh",
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
            onClick={handleInspectionComplete}
            disabled={
              !INSPECTION_ITEMS.every((item) => inspectionChecks[item.id])
            }
            sx={{ py: 2 }}
          >
            点検完了
          </Button>
        </Box>
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
          onClick={() => setCurrentScreen("initial")}
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

          <FormControl
            fullWidth
            error={!flightPurpose}
            sx={{
              "& .MuiOutlinedInput-root": {
                "&.Mui-error": {
                  backgroundColor: "#ffebee",
                  "& fieldset": {
                    borderColor: "error.main",
                    borderWidth: 2,
                  },
                },
              },
            }}
          >
            <InputLabel>飛行概要 {!flightPurpose && "(必須)"}</InputLabel>
            <Select
              value={flightPurpose}
              onChange={(e) => setFlightPurpose(e.target.value)}
              label={`飛行概要${!flightPurpose ? " (必須)" : ""}`}
            >
              {FLIGHT_PURPOSES.map((purpose) => (
                <MenuItem key={purpose} value={purpose}>
                  {purpose}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {flightPurpose === "その他" && (
            <TextField
              fullWidth
              label="飛行概要（その他）"
              value={customPurpose}
              onChange={(e) => setCustomPurpose(e.target.value)}
            />
          )}

          <Paper sx={{ p: 2, textAlign: "center", backgroundColor: "#f5f5f5" }}>
            <Typography variant="h3" fontWeight="300">
              {currentTime.toLocaleTimeString("ja-JP", { hour12: false })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              現在時刻
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

      <Box
        sx={{
          p: 2,
          backgroundColor: "#fff",
          boxShadow: "0 -2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <Box sx={{ position: "relative" }}>
          {!isRecording && (
            <Button
              fullWidth
              variant={buttonCoverOpen ? "contained" : "outlined"}
              size="large"
              onClick={() => setButtonCoverOpen(!buttonCoverOpen)}
              disabled={
                !flightPurpose || (flightPurpose === "その他" && !customPurpose)
              }
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
              飛行記録を保存して終了しますか？
            </Typography>
            <Box sx={{ px: 2 }}>
              <SlideToConfirm
                onConfirm={() => {
                  handleStopConfirm();
                  setShowStopConfirm(false);
                }}
                text="スライドして終了"
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
