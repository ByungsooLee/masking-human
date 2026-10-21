# Phase 2D — 実環境セットアップ

## 1. Supabase CLI

```bash
npx supabase --version   # または brew install supabase/tap/supabase
```

### ローカル（Docker 必須）

`supabase start` が **no space left on device** で失敗する場合:

```bash
docker system df
docker system prune -a    # 未使用イメージ削除（他プロジェクトに影響あり — 確認して実行）
```

レジストリ **Rate exceeded** の場合は時間をおいて再試行するか、下記リモート検証プロジェクトを利用してください。

```bash
cd /Users/byungsoolee/Desktop/masking-human
npx supabase start          # 初回はイメージ取得
npx supabase status -o env  # キーを .env.local に転記（ログに貼らない）
npx supabase db reset       # migration 001–004 を適用
```

### リモート検証プロジェクト

```bash
npx supabase link --project-ref <YOUR_PROJECT_REF>
npx supabase db push
```

## 2. `.env.local`（Git に含めない）

```bash
SESSION_STORE=supabase
AUDIO_STORE=supabase
UTTERANCE_STORE=supabase
DELETION_STORE=supabase
SUPABASE_INTEGRATION_TEST=1

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

INTERVIEW_PROVIDER=mock
VOICE_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_STT_MODEL=whisper-1
OPENAI_TTS_MODEL=tts-1

# ライブ OpenAI テスト（課金あり）
OPENAI_LIVE_TEST=1
OPENAI_LIVE_MAX_CALLS=16
OPENAI_LIVE_LANGS=en,ja,ko,zh-CN

ADMIN_API_KEY=   # 削除・孤立ファイルスイープ用
HEALTH_CHECK_OPENAI=1   # /api/health で OpenAI 到達確認
```

## 3. 実行コマンド

```bash
npm test
npm run test:supabase:live
npm run test:openai:live
curl -s http://localhost:3000/api/health | jq .
```
