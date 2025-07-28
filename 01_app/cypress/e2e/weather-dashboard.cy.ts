/**
 * Weather Dashboard E2Eテスト
 * リアルタイム気象データダッシュボードの統合テスト
 */

describe('Weather Dashboard E2E Tests', () => {
  beforeEach(() => {
    // モックデータのセットアップ
    cy.mockWeatherData();
    cy.waitForWeatherData();
    
    // ログインしてダッシュボードにアクセス
    cy.login();
    cy.visit('/weather');
  });

  describe('ダッシュボード初期表示', () => {
    it('ダッシュボードの全コンポーネントが表示される', () => {
      // ヘッダーの確認
      cy.contains('Weather Dashboard').should('be.visible');
      
      // デバイス選択の確認
      cy.get('[data-testid="device-selector"]').should('be.visible');
      cy.get('[data-testid="device-selector"]').should('contain', 'M-X-001');
      
      // 時間範囲選択の確認
      cy.get('[data-testid="time-range-selector"]').should('be.visible');
      cy.get('[data-testid="time-range-selector"]').should('contain', '3時間');
      
      // リアルタイムデータカードの確認
      cy.get('[data-testid="realtime-weather-card"]').should('be.visible');
      cy.get('[data-testid="realtime-weather-card"]').within(() => {
        cy.contains('リアルタイム気象データ').should('be.visible');
        cy.contains('温度').should('be.visible');
        cy.contains('湿度').should('be.visible');
        cy.contains('気圧').should('be.visible');
      });
      
      // 履歴グラフの確認
      cy.get('[data-testid="weather-history-chart"]').should('be.visible');
      cy.get('[data-testid="weather-history-chart"]').within(() => {
        cy.contains('履歴データグラフ').should('be.visible');
      });
      
      // 統計パネルの確認
      cy.get('[data-testid="weather-stats-panel"]').should('be.visible');
      cy.get('[data-testid="weather-stats-panel"]').within(() => {
        cy.contains('統計情報').should('be.visible');
      });
    });

    it('初期データが正しく表示される', () => {
      // API呼び出しの待機
      cy.wait('@getCurrentData');
      cy.wait('@getHistoricalData');
      cy.wait('@getStatistics');
      
      // リアルタイムデータの確認
      cy.get('[data-testid="realtime-weather-card"]').within(() => {
        cy.contains('25.5°C').should('be.visible'); // 温度
        cy.contains('60.0%').should('be.visible'); // 湿度
        cy.contains('1013.3 hPa').should('be.visible'); // 気圧
      });
      
      // 統計データの確認
      cy.get('[data-testid="weather-stats-panel"]').within(() => {
        cy.contains('最大: 26.0°C').should('be.visible');
        cy.contains('最小: 24.0°C').should('be.visible');
        cy.contains('平均: 25.0°C').should('be.visible');
      });
    });
  });

  describe('デバイス切り替え', () => {
    it('デバイスを切り替えると新しいデータが取得される', () => {
      // デバイス選択を開く
      cy.get('[data-testid="device-selector"]').click();
      
      // 別のデバイスを選択
      cy.get('[data-value="M-X-002"]').click();
      
      // 新しいAPI呼び出しを待つ
      cy.wait('@getCurrentData');
      cy.wait('@getHistoricalData');
      cy.wait('@getStatistics');
      
      // デバイスIDが更新されたことを確認
      cy.get('[data-testid="device-selector"]').should('contain', 'M-X-002');
    });
  });

  describe('時間範囲の変更', () => {
    it('時間範囲を変更すると履歴データが更新される', () => {
      // 時間範囲選択を開く
      cy.get('[data-testid="time-range-selector"]').click();
      
      // 1時間を選択
      cy.get('[data-value="1"]').click();
      
      // 新しいAPI呼び出しを待つ
      cy.wait('@getHistoricalData');
      
      // 時間範囲が更新されたことを確認
      cy.get('[data-testid="time-range-selector"]').should('contain', '1時間');
    });
  });

  describe('リアルタイム更新', () => {
    it('WebSocket接続状態が表示される', () => {
      cy.get('[data-testid="connection-status"]').should('be.visible');
      cy.get('[data-testid="connection-status"]').should('contain', 'リアルタイム接続中');
    });

    it('データが自動的に更新される', () => {
      // 初期値を確認
      cy.get('[data-testid="temperature-value"]').then(($temp) => {
        const initialTemp = $temp.text();
        
        // WebSocketメッセージをシミュレート
        cy.window().then((win) => {
          // WebSocketイベントを発火（実装に応じて調整）
          const event = new CustomEvent('weatherUpdate', {
            detail: {
              temperature: 26.5,
              humidity: 62.0,
              timestamp: new Date().toISOString()
            }
          });
          win.dispatchEvent(event);
        });
        
        // 値が更新されたことを確認
        cy.get('[data-testid="temperature-value"]').should('not.equal', initialTemp);
      });
    });
  });

  describe('グラフ操作', () => {
    it('グラフのズーム・パン操作ができる', () => {
      cy.get('[data-testid="weather-history-chart"]').within(() => {
        // チャートキャンバスを取得
        cy.get('canvas').as('chartCanvas');
        
        // ズームイン（マウスホイール）
        cy.get('@chartCanvas').trigger('wheel', { deltaY: -100 });
        
        // パン操作（ドラッグ）
        cy.get('@chartCanvas')
          .trigger('mousedown', { clientX: 200, clientY: 200 })
          .trigger('mousemove', { clientX: 400, clientY: 200 })
          .trigger('mouseup');
        
        // ズームリセットボタンをクリック
        cy.get('[data-testid="zoom-reset-button"]').click();
      });
    });

    it('データタイプを切り替えられる', () => {
      cy.get('[data-testid="weather-history-chart"]').within(() => {
        // データタイプセレクタを開く
        cy.get('[data-testid="data-type-selector"]').click();
        
        // 湿度を選択
        cy.get('[data-value="humidity"]').click();
        
        // グラフタイトルが更新されたことを確認
        cy.contains('湿度').should('be.visible');
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('API エラー時にエラーメッセージが表示される', () => {
      // エラーレスポンスを設定
      cy.intercept('POST', '**/graphql', {
        statusCode: 500,
        body: { errors: [{ message: 'Internal Server Error' }] }
      }).as('apiError');
      
      // ページを再読み込み
      cy.reload();
      
      // エラーメッセージの確認
      cy.contains('データの取得に失敗しました').should('be.visible');
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });

    it('再試行ボタンでデータを再取得できる', () => {
      // 最初はエラー、次は成功するように設定
      let callCount = 0;
      cy.intercept('POST', '**/graphql', (req) => {
        if (callCount === 0) {
          callCount++;
          req.reply({ statusCode: 500 });
        } else {
          req.reply({ statusCode: 200, body: { data: {} } });
        }
      });
      
      cy.reload();
      cy.contains('データの取得に失敗しました').should('be.visible');
      
      // 再試行ボタンをクリック
      cy.get('[data-testid="retry-button"]').click();
      
      // エラーメッセージが消えることを確認
      cy.contains('データの取得に失敗しました').should('not.exist');
    });
  });

  describe('レスポンシブデザイン', () => {
    it('モバイル表示で適切にレイアウトされる', () => {
      // モバイルビューポート
      cy.viewport(375, 667);
      
      // 縦積みレイアウトになることを確認
      cy.get('[data-testid="realtime-weather-card"]').should('be.visible');
      cy.get('[data-testid="weather-history-chart"]').should('be.visible');
      cy.get('[data-testid="weather-stats-panel"]').should('be.visible');
      
      // グリッドアイテムの幅を確認
      cy.get('.MuiGrid-item').each(($el) => {
        cy.wrap($el).should('have.css', 'max-width', '100%');
      });
    });

    it('タブレット・デスクトップで適切に表示される', () => {
      // タブレット
      cy.viewport(768, 1024);
      cy.wait(500);
      
      // デスクトップ
      cy.viewport(1280, 720);
      cy.wait(500);
      
      // 全コンポーネントが表示されることを確認
      cy.get('[data-testid="realtime-weather-card"]').should('be.visible');
      cy.get('[data-testid="weather-history-chart"]').should('be.visible');
      cy.get('[data-testid="weather-stats-panel"]').should('be.visible');
    });
  });

  describe('ダークモード', () => {
    it('ダークモードに切り替えられる', () => {
      // ダークモードトグルをクリック
      cy.get('[data-testid="theme-toggle"]').click();
      
      // 背景色が変わることを確認
      cy.get('body').should('have.css', 'background-color', 'rgb(18, 18, 18)');
      
      // ローカルストレージに保存されることを確認
      cy.window().then((win) => {
        expect(win.localStorage.getItem('themeMode')).to.equal('dark');
      });
    });
  });

  describe('パフォーマンス', () => {
    it('初期ロードが3秒以内に完了する', () => {
      const startTime = new Date().getTime();
      
      cy.visit('/weather');
      
      // 全コンポーネントが表示されるまで待つ
      cy.get('[data-testid="realtime-weather-card"]').should('be.visible');
      cy.get('[data-testid="weather-history-chart"]').should('be.visible');
      cy.get('[data-testid="weather-stats-panel"]').should('be.visible');
      
      cy.then(() => {
        const endTime = new Date().getTime();
        const loadTime = endTime - startTime;
        expect(loadTime).to.be.lessThan(3000);
      });
    });
  });
});