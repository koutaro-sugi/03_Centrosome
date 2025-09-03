import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Container,
  Button,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Flight as FlightIcon,
} from "@mui/icons-material";
import { aircraftAPI } from "../lib/aircraftApi";
import {
  Aircraft,
  CreateAircraftInput,
  UpdateAircraftInput,
} from "../types/aircraft";

interface AircraftFormData {
  name: string;
  registrationNumber: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
}

export const Aircrafts: React.FC = () => {
  // TODO: 実際のユーザーIDを使用
  const userId = "test-user-001";

  const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);
  const [formData, setFormData] = useState<AircraftFormData>({
    name: "",
    registrationNumber: "",
    manufacturer: "",
    model: "",
    serialNumber: "",
  });
  const [saving, setSaving] = useState(false);

  // 機体一覧を取得
  const fetchAircrafts = async () => {
    try {
      setLoading(true);
      const data = await aircraftAPI.listByUser(userId);
      setAircrafts(data);
    } catch (err) {
      setError("機体一覧の取得に失敗しました");
      console.error("Failed to fetch aircrafts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAircrafts();
  }, []);

  // 新規作成ダイアログを開く
  const handleCreate = () => {
    setEditingAircraft(null);
    setFormData({
      name: "",
      registrationNumber: "",
      manufacturer: "",
      model: "",
      serialNumber: "",
    });
    setDialogOpen(true);
  };

  // 編集ダイアログを開く
  const handleEdit = (aircraft: Aircraft) => {
    setEditingAircraft(aircraft);
    setFormData({
      name: aircraft.name,
      registrationNumber: aircraft.registrationNumber,
      manufacturer: aircraft.manufacturer,
      model: aircraft.model,
      serialNumber: aircraft.serialNumber || "",
    });
    setDialogOpen(true);
  };

  // フォームの保存
  const handleSave = async () => {
    try {
      setSaving(true);

      if (editingAircraft) {
        // 更新
        const updateInput: UpdateAircraftInput = {
          aircraftId: editingAircraft.aircraftId,
          ...formData,
        };
        await aircraftAPI.update(userId, updateInput);
      } else {
        // 新規作成
        const createInput: CreateAircraftInput = {
          ...formData,
        };
        await aircraftAPI.create(userId, createInput);
      }

      setDialogOpen(false);
      await fetchAircrafts();
    } catch (err) {
      setError(
        editingAircraft
          ? "機体の更新に失敗しました"
          : "機体の作成に失敗しました"
      );
      console.error("Failed to save aircraft:", err);
    } finally {
      setSaving(false);
    }
  };

  // 機体の削除
  const handleDelete = async (aircraft: Aircraft) => {
    if (window.confirm(`機体「${aircraft.name}」を削除しますか？`)) {
      try {
        const updateInput: UpdateAircraftInput = {
          aircraftId: aircraft.aircraftId,
          isActive: false,
        };
        await aircraftAPI.update(userId, updateInput);
        await fetchAircrafts();
      } catch (err) {
        setError("機体の削除に失敗しました");
        console.error("Failed to delete aircraft:", err);
      }
    }
  };

  // フォーム入力ハンドラー
  const handleInputChange =
    (field: keyof AircraftFormData) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  if (loading) {
    return (
      <Box
        sx={{
          flex: 1,
          backgroundColor: "#f5f5f5",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, backgroundColor: "#f5f5f5", p: 3 }}>
      <Container maxWidth="lg">
        {/* ヘッダー */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h4">機体管理</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            sx={{
              backgroundColor: "#3498db",
              "&:hover": { backgroundColor: "#2980b9" },
            }}
          >
            新規登録
          </Button>
        </Box>

        {/* エラー表示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* 機体一覧 */}
        {aircrafts.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: "center", py: 6 }}>
              <FlightIcon sx={{ fontSize: 64, color: "#bdc3c7", mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                登録された機体がありません
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                「新規登録」ボタンから機体を追加してください
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, 1fr)",
                lg: "repeat(3, 1fr)",
              },
              gap: 3,
            }}
          >
            {aircrafts.map((aircraft) => (
              <Card
                key={aircraft.aircraftId}
                sx={{
                  height: "100%",
                  opacity: aircraft.isActive ? 1 : 0.6,
                  border: aircraft.isActive ? "none" : "1px dashed #bdc3c7",
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6" component="h2">
                      {aircraft.name}
                    </Typography>
                    <Chip
                      label={aircraft.isActive ? "稼働中" : "停止中"}
                      color={aircraft.isActive ? "success" : "default"}
                      size="small"
                    />
                  </Box>

                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>登録記号:</strong> {aircraft.registrationNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>製造者:</strong> {aircraft.manufacturer}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>モデル:</strong> {aircraft.model}
                    </Typography>
                    {aircraft.serialNumber && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>シリアル番号:</strong> {aircraft.serialNumber}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      <strong>総飛行時間:</strong>{" "}
                      {Math.floor(aircraft.totalFlightTime / 60)}h{" "}
                      {aircraft.totalFlightTime % 60}m
                    </Typography>
                  </Stack>
                </CardContent>

                <CardActions>
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(aircraft)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(aircraft)}
                    color="error"
                    disabled={!aircraft.isActive}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            ))}
          </Box>
        )}

        {/* 新規作成・編集ダイアログ */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingAircraft ? "機体情報の編集" : "新規機体登録"}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="機体名"
                value={formData.name}
                onChange={handleInputChange("name")}
                fullWidth
                required
                placeholder="例: ドローン01号機"
              />

              <TextField
                label="登録記号"
                value={formData.registrationNumber}
                onChange={handleInputChange("registrationNumber")}
                fullWidth
                required
                placeholder="例: JA1234A"
              />

              <TextField
                label="製造者"
                value={formData.manufacturer}
                onChange={handleInputChange("manufacturer")}
                fullWidth
                required
                placeholder="例: DJI"
              />

              <TextField
                label="モデル名"
                value={formData.model}
                onChange={handleInputChange("model")}
                fullWidth
                required
                placeholder="例: Mavic 3"
              />

              <TextField
                label="シリアル番号"
                value={formData.serialNumber}
                onChange={handleInputChange("serialNumber")}
                fullWidth
                placeholder="例: ABC123456789"
              />
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={saving}>
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={
                saving ||
                !formData.name ||
                !formData.registrationNumber ||
                !formData.manufacturer ||
                !formData.model
              }
              sx={{
                backgroundColor: "#3498db",
                "&:hover": { backgroundColor: "#2980b9" },
              }}
            >
              {saving ? (
                <CircularProgress size={20} />
              ) : editingAircraft ? (
                "更新"
              ) : (
                "登録"
              )}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};
