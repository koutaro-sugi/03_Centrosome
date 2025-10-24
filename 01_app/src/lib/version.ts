/**
 * Version Management
 * 
 * This file provides version information for the application.
 * Version must be updated in 99_docs/version/VERSIONS.md first,
 * then this file must be updated to match.
 * 
 * Format: MAJOR.MINOR.PATCH-COMMIT_HASH
 * Example: 0.1.0-9e1fa71
 */

// ⚠️ UPDATE THIS AFTER EVERY COMMIT
export const VERSION = '0.1.0-033777f';
export const FULL_COMMIT_HASH = '033777fab5be4cd4476db9b78c670e875b15a653';
export const VERSION_DATE = '2024-10-24 15:45 JST';

/**
 * Get current version (short format)
 * @returns Version string (e.g., "0.1.0-9e1fa71")
 */
export function getVersion(): string {
  return VERSION;
}

/**
 * Get full commit hash
 * @returns Full commit hash
 */
export function getFullCommitHash(): string {
  return FULL_COMMIT_HASH;
}

/**
 * Get version date
 * @returns Version date string
 */
export function getVersionDate(): string {
  return VERSION_DATE;
}

/**
 * Get all version info
 * @returns Object with all version information
 */
export function getVersionInfo() {
  return {
    version: VERSION,
    commitHash: FULL_COMMIT_HASH,
    date: VERSION_DATE,
    environment: process.env.NODE_ENV || 'development',
  };
}

/**
 * Log version info to console (client-side)
 */
export function logVersionInfo(): void {
  if (typeof window === 'undefined') return; // Server-side, skip
  
  console.group('%c🚀 Application Version', 'color: #00ff00; font-weight: bold; font-size: 16px;');
  console.log(`%cVersion: ${VERSION}`, 'color: #00ff00; font-size: 14px;');
  console.log(`%cCommit: ${FULL_COMMIT_HASH}`, 'color: #00aaff; font-size: 12px;');
  console.log(`%cDate: ${VERSION_DATE}`, 'color: #ffaa00; font-size: 12px;');
  console.log(`%cEnvironment: ${process.env.NODE_ENV}`, 'color: #ff00ff; font-size: 12px;');
  console.groupEnd();
}

