# 削除ジョブの定期実行

## エンドポイント

`POST /api/admin/deletion/process` — ヘッダ `X-Admin-Key: $ADMIN_API_KEY`

1 リクエストで `deletion_requests` から 1 件処理（Storage + utterances + session 最小化）。

## 推奨スケジュール

- 本番: 5–15 分間隔
- Vercel Cron 例（`vercel.json`）:

```json
{
  "crons": [
    {
      "path": "/api/admin/deletion/process",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

Cron から Admin キーを渡す場合は **Vercel 環境変数** のみに保存し、クエリ文字列に載せない。

## 孤立 Storage

`POST /api/admin/storage/sweep?sessionId=<optional>` — 1 時間超の `pending` アセットと DB 未登録オブジェクトを削除。
