ALTER TABLE password_reset_tokens
  ADD COLUMN purpose  VARCHAR(30)   NOT NULL DEFAULT 'reset',
  ADD COLUMN attempts SMALLINT      NOT NULL DEFAULT 0;

CREATE INDEX idx_prt_user_purpose ON password_reset_tokens(user_id, purpose);
