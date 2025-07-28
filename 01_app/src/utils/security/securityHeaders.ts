/**
 * セキュリティヘッダー設定
 * Create React Appでのセキュリティヘッダー実装
 */

// セキュリティヘッダーの定義
export const SECURITY_HEADERS = {
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.amazonaws.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.amazonaws.com wss://*.amazonaws.com https://*.amplify.aws",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; '),
  
  // その他のセキュリティヘッダー
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

/**
 * セキュリティヘッダーを設定するミドルウェア
 * Note: Create React Appではサーバーサイドの設定が限定的なため、
 * 本番環境ではCloudFrontやALBでのヘッダー設定を推奨
 */
export const applySecurityHeaders = (response: Response): Response => {
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    response.headers.set(header, value);
  });
  return response;
};

/**
 * メタタグでのセキュリティ設定（クライアントサイド）
 * index.htmlに追加するメタタグを生成
 */
export const generateSecurityMetaTags = (): string[] => {
  return [
    '<meta http-equiv="Content-Security-Policy" content="' + SECURITY_HEADERS['Content-Security-Policy'] + '">',
    '<meta http-equiv="X-Content-Type-Options" content="nosniff">',
    '<meta http-equiv="X-Frame-Options" content="DENY">',
    '<meta http-equiv="X-XSS-Protection" content="1; mode=block">',
    '<meta name="referrer" content="strict-origin-when-cross-origin">',
  ];
};