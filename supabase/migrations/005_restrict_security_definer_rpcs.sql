-- Security-definer RPCs must not be callable with the anon key from the browser.
revoke all on function save_interview_session_atomic(jsonb, jsonb, jsonb) from public;
revoke all on function save_interview_session_atomic(jsonb, jsonb, jsonb) from anon;
revoke all on function save_interview_session_atomic(jsonb, jsonb, jsonb) from authenticated;
grant execute on function save_interview_session_atomic(jsonb, jsonb, jsonb) to service_role;

revoke all on function claim_message_idempotency(uuid, uuid, jsonb) from public;
revoke all on function claim_message_idempotency(uuid, uuid, jsonb) from anon;
revoke all on function claim_message_idempotency(uuid, uuid, jsonb) from authenticated;
grant execute on function claim_message_idempotency(uuid, uuid, jsonb) to service_role;
