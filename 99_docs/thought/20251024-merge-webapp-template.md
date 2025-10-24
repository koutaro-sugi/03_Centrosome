---
title: webapp-template 資産のマージ計画
date: 2025-10-24T13:55:00+09:00
author: Codex Agent
status: completed
tags:
  - architecture
  - template
  - infra
---

## 背景

- `/Users/koutarosugi/Developer/07_Blacksmith/webapp-template` に保存されている Next.js + Mantine テンプレート資産を本プロジェクトへ取り込むよう依頼を受けた。
- 既存フロントエンドは `01_app/` 配下の React + MUI（CRA）構成で運用中。テンプレートはディレクトリ命名や技術スタックが異なるため、共存できるよう慎重にマージする必要がある。

## 決定事項

1. テンプレートのトップレベル資産を以下の方針で追加する。
   - 大文字小文字の衝突を避けるため、テンプレート一式は `templates/webapp-template/` 配下に格納する。
   - `02_Infra/`, `03_CI/`, `99_Doc/` は即利用できるようルートに展開する。
   - `AGENT.md`, `DEV_FLOW.md`, `env.example`, `cspell.json` をリポジトリ直下へ追加し、エージェント／開発ワークフローの参照情報を共有する。
2. 衝突が懸念される `README.md` は上書きせず、既存内容を保持したまま「テンプレート統合」セクションを追記して差分を明示する。
3. 重大なリポジトリ構造変更であるため、Thought Log を作成し背景と決定を記録する。

## 実施内容

- テンプレート一式を `templates/webapp-template/` にコピーした上で、運用に必要な `02_Infra/`, `03_CI/`, `99_Doc/` をルートに展開。
- ルート README にテンプレート資産の概要と利用時の留意点を追記。
- 本ドキュメントを作成し、テンプレート導入の経緯と運用方針を記録。

## 残課題 / Follow-up

- `templates/webapp-template/01_App/` に含まれる Next.js テンプレートと既存 CRA アプリ (`01_app/`) の役割分担を整理し、今後どちらを主とするか決定する必要がある。
- 追加された `02_Infra/` や `03_CI/` の設定を、現行 Amplify / GitHub Actions フローに合わせて検証・適用する。
- `99_Doc/` と既存 `99_docs/` の命名差異を解消するか、統合手順を検討する（ドキュメント整理タスクとして別途管理）。
