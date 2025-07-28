/**
 * GraphQLセキュリティのテスト
 */

import {
  calculateQueryDepth,
  countQueryAliases,
  validateGraphQLQuery,
  checkRateLimit,
  GRAPHQL_MAX_DEPTH,
  GRAPHQL_MAX_ALIASES
} from '../graphqlSecurity';

describe('GraphQL Security', () => {
  describe('calculateQueryDepth', () => {
    it('フラットなクエリの深度を正しく計算する', () => {
      const query = {
        user: {
          id: true,
          name: true
        }
      };
      expect(calculateQueryDepth(query)).toBe(1);
    });

    it('ネストしたクエリの深度を正しく計算する', () => {
      const query = {
        user: {
          id: true,
          posts: {
            title: true,
            comments: {
              text: true,
              author: {
                name: true
              }
            }
          }
        }
      };
      expect(calculateQueryDepth(query)).toBe(4);
    });

    it('__typenameフィールドを無視する', () => {
      const query = {
        user: {
          __typename: true,
          id: true
        }
      };
      expect(calculateQueryDepth(query)).toBe(1);
    });

    it('空のクエリで0を返す', () => {
      expect(calculateQueryDepth({})).toBe(0);
      expect(calculateQueryDepth(null)).toBe(0);
    });
  });

  describe('countQueryAliases', () => {
    it('エイリアスの数を正しくカウントする', () => {
      const query = {
        firstUser: 'user(id: 1)',
        secondUser: 'user(id: 2)',
        thirdUser: 'user(id: 3)'
      };
      const queryString = JSON.stringify(query);
      expect(countQueryAliases({ query: queryString })).toBeGreaterThanOrEqual(3);
    });

    it('エイリアスがない場合0を返す', () => {
      const query = {
        user: {
          id: true,
          name: true
        }
      };
      expect(countQueryAliases(query)).toBe(0);
    });
  });

  describe('validateGraphQLQuery', () => {
    it('有効なクエリを受け入れる', () => {
      const query = {
        user: {
          id: true,
          posts: {
            title: true
          }
        }
      };
      const result = validateGraphQLQuery(query);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('深すぎるクエリを拒否する', () => {
      // 11層の深さを持つクエリを生成
      let deepQuery: any = {};
      let current = deepQuery;
      for (let i = 0; i < GRAPHQL_MAX_DEPTH + 2; i++) {
        current.nested = {};
        current = current.nested;
      }

      const result = validateGraphQLQuery(deepQuery);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed depth');
    });

    it('エイリアスが多すぎるクエリを拒否する', () => {
      const query: any = {};
      for (let i = 0; i < GRAPHQL_MAX_ALIASES + 5; i++) {
        query[`alias${i}`] = `field${i}: value`;
      }

      const result = validateGraphQLQuery(query);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeding maximum');
    });
  });

  describe('checkRateLimit', () => {
    beforeEach(() => {
      // レート制限マップをクリア
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('制限内のリクエストを許可する', () => {
      const identifier = 'test-user-1';
      
      for (let i = 0; i < 10; i++) {
        expect(checkRateLimit(identifier, 10, 60000)).toBe(true);
      }
    });

    it('制限を超えたリクエストを拒否する', () => {
      const identifier = 'test-user-2';
      const limit = 5;
      
      // 制限までリクエスト
      for (let i = 0; i < limit; i++) {
        expect(checkRateLimit(identifier, limit, 60000)).toBe(true);
      }
      
      // 制限を超えたリクエスト
      expect(checkRateLimit(identifier, limit, 60000)).toBe(false);
    });

    it('時間経過後にリセットされる', () => {
      const identifier = 'test-user-3';
      const limit = 3;
      const windowMs = 1000; // 1秒
      
      // 制限まで使い切る
      for (let i = 0; i < limit; i++) {
        checkRateLimit(identifier, limit, windowMs);
      }
      
      // 制限に達している
      expect(checkRateLimit(identifier, limit, windowMs)).toBe(false);
      
      // 時間を進める
      jest.advanceTimersByTime(windowMs + 100);
      
      // リセットされている
      expect(checkRateLimit(identifier, limit, windowMs)).toBe(true);
    });
  });
});