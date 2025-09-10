# Handover Docs Index

このフォルダは引き継ぎ用ドキュメントの集約場所です。テンプレートとタグ運用、インデックス自動生成の仕組みを含みます。

## 運用ルール（要点）
- 命名: `YYYY-MM-DD_<Project>_<Topic>.md`（例: `2025-09-10_Centra_DBSetup.md`）
- カテゴリ: `setup`, `operations`, `troubleshooting`, `handover` のいずれか
- タグ: 文頭のYAMLフロントマター `tags: [setup, urgent]` に加え、本文中の `#setup` `#urgent` のようなハッシュタグも可
- 置き場所: すべてこの `handover_docs` 直下（テンプレートは `.templates/`）
- 更新: ドキュメント更新後にインデックス再生成（下記コマンド）

## 新規ドキュメント作成（推奨）
- スクリプトを利用:
  - `python scripts/new_handover_doc.py --project Centra --topic DBSetup --category setup --tags setup,urgent --author "Your Name" --title "DBセットアップ"`
  - 作成後、内容を追記し保存
- もしくはテンプレートを手動コピー: `handover_docs/.templates/handover_markdown_template.md`

## インデックス再生成
- 生成コマンド: `python scripts/update_handover_index.py`
- 役割: `handover_docs` 配下の `.md` を走査し、タイトル/日付/タグを集約して本 README を上書き更新

---

## ドキュメント一覧（自動生成エリア）

<!-- AUTO-GENERATED: DO NOT EDIT BELOW -->

現在のところ、一覧は未生成です。上記コマンドで生成してください。

<!-- AUTO-GENERATED: END -->
