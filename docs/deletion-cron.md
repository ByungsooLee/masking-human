# 削除ジョブの定期実行

## エンドポイント

`POST /api/admin/deletion/process` — ヘッダ `X-Admin-Key: $ADMIN_API_KEY`

1 リクエストで `deletion_requests` から 1 件処理（Storage + utterances + session 最小化）。

## 推奨スケジュール

- 本番: 5–15 分間隔
- 外部スケジューラーから POST と `X-Admin-Key` を送信します。Cookieは不要ですが、各エンドポイントでAdminキーを必ず検証します。
- Vercel標準CronはGETのため、このPOSTエンドポイントを直接登録しても動きません。POST/ヘッダーを指定できる実行基盤を使ってください。

Adminキーは実行基盤のシークレット管理に保存し、クエリ文字列に載せない。

## 孤立 Storage

`POST /api/admin/storage/sweep?sessionId=<optional>` — 1 時間超の `pending` アセットと DB 未登録オブジェクトを削除。
