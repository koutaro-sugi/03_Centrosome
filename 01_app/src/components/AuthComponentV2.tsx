import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContextV2";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  CircularProgress,
  Stack,
  styled,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff, Email, Lock } from "@mui/icons-material";

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(6),
  maxWidth: 400,
  margin: "auto",
  borderRadius: theme.spacing(2),
  boxShadow: "0 3px 10px rgba(0, 0, 0, 0.08)",
  backgroundColor: "#ffffff",
}));

const LogoBox = styled(Box)({
  textAlign: "center",
  marginBottom: 40,
});

export const AuthComponent: React.FC = () => {
  const { signIn, confirmNewPassword, error, clearError, needsNewPassword } =
    useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // 入力値の検証
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!needsNewPassword) {
      if (!formData.username) {
        errors.username = "メールアドレスを入力してください";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.username)) {
        errors.username = "有効なメールアドレスを入力してください";
      }

      if (!formData.password) {
        errors.password = "パスワードを入力してください";
      }
    } else {
      if (!formData.newPassword) {
        errors.newPassword = "新しいパスワードを入力してください";
      } else if (formData.newPassword.length < 8) {
        errors.newPassword = "パスワードは8文字以上で入力してください";
      }

      if (!formData.confirmPassword) {
        errors.confirmPassword = "パスワードを再入力してください";
      } else if (formData.newPassword !== formData.confirmPassword) {
        errors.confirmPassword = "パスワードが一致しません";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    clearError();

    try {
      // メールアドレスの前後空白や大文字混入による認証失敗を防ぐ
      const cleanedUsername = formData.username.trim().toLowerCase();
      const result = await signIn(cleanedUsername, formData.password);

      if (result.isSignedIn) {
        // 認証成功 - AuthWrapperが画面遷移を処理
        console.log("Sign in successful");
      } else if (
        result.nextStep?.signInStep ===
        "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
      ) {
        // needsNewPasswordフラグはAuthContextで設定される
        console.log("New password required");
      }
    } catch (err: any) {
      console.error("Sign in error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    clearError();

    try {
      await confirmNewPassword(formData.newPassword);
      // 成功時は自動的に認証状態が更新され、画面遷移される
      console.log("Password changed successfully");
    } catch (err: any) {
      console.error("Password confirmation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      // エラーをクリア
      if (validationErrors[field]) {
        setValidationErrors((prev) => ({ ...prev, [field]: "" }));
      }
    };

  // エラーメッセージの日本語化
  const getErrorMessage = (error: any): string => {
    if (!error) return "";

    const errorCode = error.code || error.name;
    const errorMessages: Record<string, string> = {
      NotAuthorizedException:
        "メールアドレスまたはパスワードが正しくありません",
      UserNotFoundException: "ユーザーが見つかりません",
      UserNotConfirmedException: "メールアドレスの確認が完了していません",
      PasswordResetRequiredException: "パスワードのリセットが必要です",
      TooManyRequestsException:
        "リクエストが多すぎます。しばらくしてから再試行してください",
      NetworkError: "ネットワークエラーが発生しました。接続を確認してください",
    };

    return errorMessages[errorCode] || error.message || "エラーが発生しました";
  };

  if (needsNewPassword) {
    return (
      <Container maxWidth="sm" sx={{ marginTop: 8 }}>
        <StyledPaper>
          <LogoBox>
            <Typography variant="h4" component="h1" gutterBottom>
              Centra
            </Typography>
            <Typography variant="body2" color="text.secondary">
              新しいパスワードの設定
            </Typography>
          </LogoBox>

          <form onSubmit={handleNewPasswordSubmit}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                type={showNewPassword ? "text" : "password"}
                label="新しいパスワード"
                value={formData.newPassword}
                onChange={handleInputChange("newPassword")}
                error={!!validationErrors.newPassword}
                helperText={
                  validationErrors.newPassword ||
                  "8文字以上で、大文字・小文字・数字・記号を含めてください"
                }
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                type={showNewPassword ? "text" : "password"}
                label="パスワード（確認）"
                value={formData.confirmPassword}
                onChange={handleInputChange("confirmPassword")}
                error={!!validationErrors.confirmPassword}
                helperText={validationErrors.confirmPassword}
                disabled={loading}
              />

              {error && (
                <Alert severity="error">{getErrorMessage(error)}</Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ marginTop: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : "パスワードを設定"}
              </Button>
            </Stack>
          </form>
        </StyledPaper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ marginTop: 8 }}>
      <StyledPaper>
        <LogoBox>
          <Typography variant="h4" component="h1" gutterBottom>
            Centra
          </Typography>
          {/* subtitle removed as requested */}
        </LogoBox>

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              type="email"
              label="メールアドレス"
              value={formData.username}
              onChange={handleInputChange("username")}
              error={!!validationErrors.username}
              helperText={validationErrors.username}
              disabled={loading}
              autoComplete="email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              type={showPassword ? "text" : "password"}
              label="パスワード"
              value={formData.password}
              onChange={handleInputChange("password")}
              error={!!validationErrors.password}
              helperText={validationErrors.password}
              disabled={loading}
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {error && <Alert severity="error">{getErrorMessage(error)}</Alert>}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ marginTop: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : "ログイン"}
            </Button>
          </Stack>
        </form>

        <Typography
          variant="caption"
          color="text.secondary"
          align="center"
          sx={{ marginTop: 3, display: "block" }}
        >
          © 2025 41dev All rights reserved.
        </Typography>
      </StyledPaper>
    </Container>
  );
};
