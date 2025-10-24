#!/bin/bash

# Usage: ./scripts/update-version.sh <major|minor|patch> "<commit message>"
# Example: ./scripts/update-version.sh patch "fix(ui): resolve mobile menu"

set -e

TYPE=$1
MESSAGE=$2

if [ -z "$TYPE" ] || [ -z "$MESSAGE" ]; then
  echo "Usage: ./scripts/update-version.sh <major|minor|patch> \"<commit message>\""
  exit 1
fi

# Get current version from version.ts
CURRENT_VERSION=$(grep "export const VERSION = " 01_app/src/lib/version.ts | sed "s/.*'\(.*\)-.*/\1/")

# Parse version components
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Increment version
case $TYPE in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  *)
    echo "Invalid type. Use: major, minor, or patch"
    exit 1
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"

# Commit changes first to get commit hash
git add .
git commit -m "$MESSAGE"

# Get commit hash
COMMIT_HASH=$(git rev-parse HEAD)
SHORT_HASH=$(git rev-parse --short=7 HEAD)
FULL_VERSION="$NEW_VERSION-$SHORT_HASH"
DATE=$(date '+%Y-%m-%d %H:%M %Z')

# Update version.ts
cat > 01_app/src/lib/version.ts <<EOF
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
export const VERSION = '$FULL_VERSION';
export const FULL_COMMIT_HASH = '$COMMIT_HASH';
export const VERSION_DATE = '$DATE';

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
  console.log(\`%cVersion: \${VERSION}\`, 'color: #00ff00; font-size: 14px;');
  console.log(\`%cCommit: \${FULL_COMMIT_HASH}\`, 'color: #00aaff; font-size: 12px;');
  console.log(\`%cDate: \${VERSION_DATE}\`, 'color: #ffaa00; font-size: 12px;');
  console.log(\`%cEnvironment: \${process.env.NODE_ENV}\`, 'color: #ff00ff; font-size: 12px;');
  console.groupEnd();
}
EOF

# Update VERSIONS.md (prepend new entry)
TEMP_FILE=$(mktemp)
cat > "$TEMP_FILE" <<EOF
# Version History

## Current Version
**$FULL_VERSION** ($DATE)

---

## Version Log

### $FULL_VERSION ($DATE)
**Type:** $(echo $TYPE | awk '{print toupper(substr($0,1,1)) tolower(substr($0,2))}')
**Commit:** $COMMIT_HASH
**Branch:** $(git branch --show-current)
**Author:** $(git config user.name)

**Changes:**
$MESSAGE

**Files Changed:**
$(git diff-tree --no-commit-id --name-only -r HEAD | sed 's/^/- /')

---

EOF

# Append existing content (skip old "Current Version" section)
if [ -f "99_docs/version/VERSIONS.md" ]; then
  sed -n '/^## Version Log/,$p' 99_docs/version/VERSIONS.md >> "$TEMP_FILE"
fi

mv "$TEMP_FILE" 99_docs/version/VERSIONS.md

# Amend commit to include version updates
git add 01_app/src/lib/version.ts 99_docs/version/VERSIONS.md
git commit --amend --no-edit

echo "✅ Version updated to $FULL_VERSION"
echo "📝 VERSIONS.md updated"
echo "🔢 version.ts updated"

