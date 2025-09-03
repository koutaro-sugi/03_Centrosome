/**
 * 日時処理のユーティリティ関数
 * すべての時刻処理をJST（日本標準時）で統一します
 */

const JST_OFFSET_MINUTES = 9 * 60; // JST = UTC+9

/**
 * 現在のJST時刻をISO文字列で取得
 * @returns JST時刻のISO文字列
 */
export const nowJST = (): string => {
  const now = new Date();
  const jstTime = new Date(now.getTime() + JST_OFFSET_MINUTES * 60 * 1000);
  return jstTime.toISOString();
};

/**
 * 任意のDateオブジェクトをJST時刻のISO文字列に変換
 * @param date 変換対象のDateオブジェクト
 * @returns JST時刻のISO文字列
 */
export const toJSTISOString = (date: Date): string => {
  const jstTime = new Date(date.getTime() + JST_OFFSET_MINUTES * 60 * 1000);
  return jstTime.toISOString();
};

/**
 * ISO文字列をJSTのDateオブジェクトに変換
 * @param isoString ISO文字列
 * @returns JST時刻のDateオブジェクト
 */
export const fromJSTISOString = (isoString: string): Date => {
  const utcDate = new Date(isoString);
  return new Date(utcDate.getTime() + JST_OFFSET_MINUTES * 60 * 1000);
};

/**
 * JST時刻のISO文字列からYYYY-MM-DD形式の日付文字列を取得
 * @param jstIsoString JST時刻のISO文字列
 * @returns YYYY-MM-DD形式の日付文字列
 */
export const toJSTDateString = (jstIsoString: string): string => {
  return jstIsoString.split("T")[0];
};

/**
 * JST時刻のISO文字列からHH:mm形式の時刻文字列を取得
 * @param jstIsoString JST時刻のISO文字列
 * @returns HH:mm形式の時刻文字列
 */
export const toJSTTimeString = (jstIsoString: string): string => {
  return jstIsoString.split("T")[1].substring(0, 5);
};

/**
 * 日付とJSTオフセットを考慮したDateオブジェクトを作成
 * @param dateInput Date | string | number
 * @returns JST調整済みのDateオブジェクト
 */
export const createJSTDate = (dateInput?: Date | string | number): Date => {
  const baseDate = dateInput ? new Date(dateInput) : new Date();
  return new Date(baseDate.getTime() + JST_OFFSET_MINUTES * 60 * 1000);
};

/**
 * JST時刻でフォーマットされた表示用文字列を取得
 * @param date Dateオブジェクトまたは日時文字列
 * @param options Intl.DateTimeFormatOptionsのオプション
 * @returns ローカライズされた日時文字列
 */
export const formatJSTDateTime = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }
): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleString("ja-JP", options);
};

/**
 * レガシー関数との互換性のため（既存コードから移行用）
 * @deprecated nowJST() を使用してください
 */
export const getCurrentJSTTime = nowJST;
