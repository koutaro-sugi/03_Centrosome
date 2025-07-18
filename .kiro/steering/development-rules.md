# Development Rules & Guidelines

## Language & Communication
- **CRITICAL**: All responses must be in Japanese (日本語での回答必須)
- **CRITICAL**: Code comments must be in Japanese (コードコメントも日本語で記述)
- **CRITICAL**: Error messages and UI text must be in Japanese (エラーメッセージやUIテキストも日本語統一)
- Use friendly, approachable tone (なんJ民スタイルで親しみやすく)

## Development Workflow
1. **Pre-implementation Planning**: Always present a plan before implementation (実装前計画必須)
2. **Approval Process**: Get user approval before starting execution (承認制)
3. **Progress Management**: Use TodoWrite for progress tracking (進捗管理)
4. **Git Management**: Proper Git management before file changes (ファイル改変前のGit管理必須)

## Code Quality Standards
- **TypeScript Required**: All code must be written in TypeScript (TypeScript必須)
- **Japanese Comments**: All code comments in Japanese (日本語コメント)
- **ESLint/Prettier**: Static analysis and formatting required (静的解析・フォーマット必須)
- **Test Code**: Create tests with Jest + React Testing Library (テストコード作成)

## Security Guidelines
- **No Hardcoded Credentials**: Use environment variables (認証情報ハードコード禁止)
- **AWS Best Practices**: Follow security guidelines (AWSベストプラクティス遵守)
- **Sensitive Data Protection**: Handle cred directories carefully (秘密情報保護)

## File Protection Rules
- **ULTRA-CRITICAL**: Never delete CORE_REQUIREMENTS.md (削除禁止)
- **ULTRA-CRITICAL**: Carefully preserve technical documents (技術文書・構成情報は慎重に保存)
- **ULTRA-CRITICAL**: Prevent accidental deletion of important files (重要ファイルの誤削除防止)

## MCP Usage Guidelines
- **Screen Size**: Always use 1920x1080 for browser screenshots (画面サイズ1920x1080指定)
- **Development URLs**:
  - Web Console: http://localhost:5173 (Vite dev server)
  - Simulator: http://localhost:3001
  - WebSocket: ws://localhost:3001/ws