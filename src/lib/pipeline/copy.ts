const errors: Record<string, [string, string]> = {
  PIPELINE_KEY_LIMIT: ["OpenRouterキーの利用上限に達しています。キーの残り予算・上限設定を確認してください。", "The OpenRouter key spending limit has been reached. Check its remaining budget and limit settings."],
  CONSENT_SAVE_FAILED: ["開始時の同意を保存できませんでした。通信状態とサーバーの保存設定を確認して、もう一度開始してください。", "Could not save the initial consent. Check the connection and server storage, then try starting again."],
  PIPELINE_RATE_LIMIT: ["ログイン試行が多すぎます。15分待ってから再試行してください。", "Too many login attempts. Wait 15 minutes before retrying."],
  PIPELINE_NOISE: ["雑音による中断が続いたため停止しました。マイクと音量を確認して再開してください。", "Repeated noise interruptions paused the interview. Check the microphone and playback volume before resuming."],
  PIPELINE_PAYMENT: ["OpenRouter側で利用が制限されました。クレジット残高とAPIキーの利用上限を確認してください。", "OpenRouter restricted this request. Check the credit balance and API key spending limit."],
  PIPELINE_CREDITS: ["OpenRouterの利用残高が不足しています。OpenRouterでクレジットを追加してから、もう一度開始してください。月間上限の設定だけでは残高は追加されません。", "Your OpenRouter balance is insufficient. Add credits on OpenRouter, then start again. Setting a monthly limit does not add funds."],
  PIPELINE_CREDIT_CHECK: ["OpenRouterキーの利用上限を確認できません。キーの設定と通信状態を確認して、もう一度お試しください。", "Could not check the OpenRouter key spending limit. Check the key and connection, then try again."],
  PIPELINE_ORIGIN: ["画面と接続先のアドレスが一致しません。ページを再読み込みして、もう一度お試しください。", "The page address does not match the connection address. Reload the page and try again."],
  PIPELINE_BAD_PASSWORD: ["ログインできませんでした。運営者パスワードを確認して、もう一度お試しください。", "Login failed. Check the operator password and try again."],
  PIPELINE_COOKIE: ["ログイン情報を保存できませんでした。このサイトのCookieを許可して、もう一度お試しください。", "Your login could not be saved. Allow cookies for this site and try again."],
  PIPELINE_LOGIN_NETWORK: ["ログインを確認できませんでした。通信状態を確認して、もう一度お試しください。", "Could not verify your login. Check the connection and try again."],
  PIPELINE_AUTH: ["開始画面の運営者設定からログインしてください。", "Sign in through operator settings on the start page."],
  PIPELINE_CONFIGURATION: ["OpenRouterキー、8文字以上の運営者パスワード、月間予算のサーバー設定を確認してください。", "Check the server settings for the OpenRouter key, an operator password of at least 8 characters, and a valid monthly budget."],
  PIPELINE_SESSION_SECRET: ["本番用の署名鍵 INTERVIEW_SESSION_SECRET（32文字以上）が未設定です。サーバー環境に追加して再起動してください。", "The production signing secret INTERVIEW_SESSION_SECRET (at least 32 characters) is missing. Add it to the server environment and restart."],
  PIPELINE_CATALOG: ["モデルの料金・提供状況を確認できません。運営者が設定を確認してください。", "Model pricing or availability could not be verified. Check operator configuration."],
  PIPELINE_VOICE: ["設定された声が利用できません。運営者が音声設定を確認してください。", "The configured voice is unavailable. Check the voice setting."],
  PIPELINE_STORAGE_CONFIG: ["料金・ログイン制限の保存先が未設定です。VercelではSupabaseを構成してください。それ以外の本番起動では、Supabaseか INTERVIEW_USAGE_STORE=file を設定してください。", "Cost and login-limit storage is not configured. On Vercel, configure Supabase. In other production deployments, configure Supabase or set INTERVIEW_USAGE_STORE=file."],
  PIPELINE_STORAGE: ["料金・ログイン制限を記録できませんでした。Supabaseの設定とマイグレーション、またはローカルの保存フォルダを確認して、もう一度お試しください。", "Could not record costs or login limits. Check the Supabase settings and migrations, or the local storage folder, then try again."],
  PIPELINE_INTERNAL: ["サーバーで予期しないエラーが起きました。少し待って再開するか、終了して保存してください。", "An unexpected server error occurred. Wait briefly and resume, or finish to save."],
  PIPELINE_STORAGE_BUSY: ["料金の保存が混み合っています。少し待ってから再開してください。", "Cost storage is busy. Wait briefly before resuming."],
  PIPELINE_BUDGET: ["月間予算の残りが不足しています。AIを停止しました。録音・会話は終了ボタンから保存できます。", "Insufficient monthly budget. AI has paused. Use Finish to save the recording and conversation."],
  PIPELINE_UPSTREAM_UNCERTAIN: ["通信が途切れました。料金は確認待ちです。重複課金を避けるため自動再送していません。", "The connection was interrupted; the charge is unresolved. The request was not automatically repeated."],
  PIPELINE_SESSION: ["会話の接続が終了しました。終了ボタンから録音・会話を保存してください。", "The interview connection has ended. Use Finish to save the recording and conversation."],
  PIPELINE_REPLY_INCOMPLETE: ["返答を最後まで生成できませんでした。再開すると新しい返答を生成します。", "The reply was incomplete. Resuming will generate a new reply."],
};
export function pipelineError(code: string, en: boolean) {
  return errors[code]?.[en ? 1 : 0] ?? (en ? "AI processing stopped. You can resume or finish and save." : "AIの処理が止まりました。再開するか、終了して保存できます。");
}
