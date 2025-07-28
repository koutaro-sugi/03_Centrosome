/**
 * HTTPS強制リダイレクト
 * 本番環境でHTTPアクセスをHTTPSにリダイレクト
 */

/**
 * HTTPSへのリダイレクトを実行
 * 開発環境では実行しない
 */
export const enforceHttps = (): void => {
  // 開発環境では実行しない
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  // 既にHTTPSの場合は何もしない
  if (window.location.protocol === 'https:') {
    return;
  }

  // localhost または 127.0.0.1 では実行しない
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168')) {
    return;
  }

  // HTTPSにリダイレクト
  const httpsUrl = window.location.href.replace('http:', 'https:');
  console.log('Redirecting to HTTPS:', httpsUrl);
  
  // セキュリティイベントのログ
  logHttpsRedirect();
  
  window.location.replace(httpsUrl);
};

/**
 * HTTPSリダイレクトのログ記録
 */
const logHttpsRedirect = (): void => {
  // ローカルストレージに記録（分析用）
  try {
    const redirects = JSON.parse(localStorage.getItem('https_redirects') || '[]');
    redirects.push({
      timestamp: new Date().toISOString(),
      from: window.location.href,
      userAgent: navigator.userAgent,
    });
    
    // 最新の10件のみ保持
    if (redirects.length > 10) {
      redirects.shift();
    }
    
    localStorage.setItem('https_redirects', JSON.stringify(redirects));
  } catch (error) {
    console.error('Failed to log HTTPS redirect:', error);
  }
};

/**
 * セキュアコンテキストのチェック
 * Service WorkerやWeb Crypto APIなどのセキュア機能が利用可能か確認
 */
export const checkSecureContext = (): boolean => {
  if (!window.isSecureContext) {
    console.warn('This application requires a secure context (HTTPS)');
    
    // セキュアでない場合の警告表示
    if (process.env.NODE_ENV === 'production') {
      displaySecurityWarning();
    }
    
    return false;
  }
  
  return true;
};

/**
 * セキュリティ警告の表示
 */
const displaySecurityWarning = (): void => {
  // 既に警告が表示されている場合はスキップ
  if (document.getElementById('security-warning')) {
    return;
  }

  const warningElement = document.createElement('div');
  warningElement.id = 'security-warning';
  warningElement.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background-color: #f44336;
    color: white;
    padding: 16px;
    text-align: center;
    font-family: sans-serif;
    font-size: 14px;
    z-index: 9999;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  `;
  
  warningElement.innerHTML = `
    <strong>セキュリティ警告:</strong> 
    このアプリケーションは安全な接続（HTTPS）を必要とします。
    一部の機能が正しく動作しない可能性があります。
    <button id="dismiss-warning" style="
      margin-left: 16px;
      padding: 4px 8px;
      background: white;
      color: #f44336;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    ">閉じる</button>
  `;
  
  document.body.insertBefore(warningElement, document.body.firstChild);
  
  // 警告を閉じるボタンのハンドラー
  document.getElementById('dismiss-warning')?.addEventListener('click', () => {
    warningElement.remove();
  });
};

/**
 * Mixed Content のチェック
 * HTTPSページ内でHTTPリソースを読み込んでいないか確認
 */
export const checkMixedContent = (): void => {
  if (window.location.protocol !== 'https:') {
    return;
  }

  // パフォーマンスエントリーからリソースをチェック
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const insecureResources = resources.filter(resource => 
    resource.name.startsWith('http://') && !resource.name.includes('localhost')
  );

  if (insecureResources.length > 0) {
    console.warn('Mixed content detected:', insecureResources.map(r => r.name));
    
    // 開発環境では詳細なログを出力
    if (process.env.NODE_ENV === 'development') {
      console.group('Insecure Resources');
      insecureResources.forEach(resource => {
        console.log(`- ${resource.name} (${resource.initiatorType})`);
      });
      console.groupEnd();
    }
  }
};