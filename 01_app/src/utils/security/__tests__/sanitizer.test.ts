/**
 * サニタイザーのテスト
 */

import {
  escapeHtml,
  escapeSql,
  sanitizeUrlParam,
  sanitizeDeviceId,
  sanitizeTimestamp,
  sanitizeNumericInput,
  sanitizeWeatherData,
  sanitizeGraphQLParams
} from '../sanitizer';

describe('Sanitizer', () => {
  describe('escapeHtml', () => {
    it('HTMLエンティティを正しくエスケープする', () => {
      expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
      );
      expect(escapeHtml("It's a test & more")).toBe("It&#39;s a test &amp; more");
    });

    it('通常のテキストはそのまま返す', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('escapeSql', () => {
    it('SQLインジェクション対策文字をエスケープする', () => {
      expect(escapeSql("'; DROP TABLE users; --")).toBe("\\'; DROP TABLE users; --");
      expect(escapeSql('Test\nLine')).toBe('Test\\nLine');
    });
  });

  describe('sanitizeUrlParam', () => {
    it('URLパラメータを正しくエンコードする', () => {
      expect(sanitizeUrlParam('hello world')).toBe('hello%20world');
      expect(sanitizeUrlParam('test@example.com')).toBe('test%40example.com');
    });
  });

  describe('sanitizeDeviceId', () => {
    it('有効なデバイスIDを受け入れる', () => {
      expect(sanitizeDeviceId('M-X-001')).toBe('M-X-001');
      expect(sanitizeDeviceId('A-B-999')).toBe('A-B-999');
    });

    it('無効なデバイスIDをnullで返す', () => {
      expect(sanitizeDeviceId('invalid')).toBeNull();
      expect(sanitizeDeviceId('M-X-00')).toBeNull();
      expect(sanitizeDeviceId('m-x-001')).toBeNull();
      expect(sanitizeDeviceId('M-X-0001')).toBeNull();
    });
  });

  describe('sanitizeTimestamp', () => {
    it('有効なISO 8601タイムスタンプを受け入れる', () => {
      const timestamp = '2025-01-27T12:00:00.000Z';
      expect(sanitizeTimestamp(timestamp)).toBe(timestamp);
    });

    it('有効な日付文字列を ISO 8601に変換する', () => {
      const result = sanitizeTimestamp('2025-01-27');
      expect(result).toMatch(/2025-01-27T\d{2}:\d{2}:\d{2}.\d{3}Z/);
    });

    it('無効なタイムスタンプをnullで返す', () => {
      expect(sanitizeTimestamp('invalid')).toBeNull();
      expect(sanitizeTimestamp('2025-13-45')).toBeNull();
    });
  });

  describe('sanitizeNumericInput', () => {
    it('範囲内の数値を受け入れる', () => {
      expect(sanitizeNumericInput(25, 0, 100)).toBe(25);
      expect(sanitizeNumericInput('50.5', 0, 100)).toBe(50.5);
      expect(sanitizeNumericInput(0, 0, 100)).toBe(0);
      expect(sanitizeNumericInput(100, 0, 100)).toBe(100);
    });

    it('範囲外の数値をnullで返す', () => {
      expect(sanitizeNumericInput(150, 0, 100)).toBeNull();
      expect(sanitizeNumericInput(-10, 0, 100)).toBeNull();
    });

    it('数値以外の入力をnullで返す', () => {
      expect(sanitizeNumericInput('abc', 0, 100)).toBeNull();
      expect(sanitizeNumericInput(NaN, 0, 100)).toBeNull();
    });
  });

  describe('sanitizeWeatherData', () => {
    it('有効な気象データを受け入れる', () => {
      const validData = {
        deviceId: 'M-X-001',
        timestamp: '2025-01-27T12:00:00.000Z',
        temperature: 25.5,
        humidity: 60,
        pressure: 1013.25,
        windSpeed: 5.2,
        windDirection: 180,
        rainfall: 0,
        illuminance: 50000,
        visibility: 10,
        feelsLike: 26
      };

      const result = sanitizeWeatherData(validData);
      expect(result).toEqual(validData);
    });

    it('無効なデバイスIDでエラーをスローする', () => {
      const invalidData = {
        deviceId: 'invalid-id',
        temperature: 25
      };

      expect(() => sanitizeWeatherData(invalidData)).toThrow('Invalid device ID');
    });

    it('範囲外の値でエラーをスローする', () => {
      const invalidTemp = {
        deviceId: 'M-X-001',
        temperature: 100 // 範囲外
      };

      expect(() => sanitizeWeatherData(invalidTemp)).toThrow('Invalid temperature');
    });

    it('部分的なデータを受け入れる', () => {
      const partialData = {
        deviceId: 'M-X-001',
        timestamp: '2025-01-27T12:00:00.000Z',
        temperature: 25.5
      };

      const result = sanitizeWeatherData(partialData);
      expect(result).toEqual(partialData);
    });
  });

  describe('sanitizeGraphQLParams', () => {
    it('浅いオブジェクトを受け入れる', () => {
      const params = {
        deviceId: 'M-X-001',
        limit: 10
      };

      expect(sanitizeGraphQLParams(params)).toEqual(params);
    });

    it('許可された深度のネストを受け入れる', () => {
      const params = {
        filter: {
          device: {
            id: 'M-X-001'
          }
        }
      };

      expect(sanitizeGraphQLParams(params, 5)).toEqual(params);
    });

    it('深すぎるネストでエラーをスローする', () => {
      const deepNested = {
        a: { b: { c: { d: { e: { f: {} } } } } }
      };

      expect(() => sanitizeGraphQLParams(deepNested, 3)).toThrow(
        'GraphQL query depth exceeds maximum allowed depth of 3'
      );
    });

    it('プリミティブ値を受け入れる', () => {
      expect(sanitizeGraphQLParams('string', 1)).toBe('string');
      expect(sanitizeGraphQLParams(123, 1)).toBe(123);
      expect(sanitizeGraphQLParams(null, 1)).toBeNull();
    });
  });
});