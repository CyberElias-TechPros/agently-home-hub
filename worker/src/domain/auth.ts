export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  user_agent: string | null;
  ip: string | null;
  expires_at: string;
  revoked_at: string | null;
  replaced_by: string | null;
  created_at: string;
}

export interface VerificationTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  purpose: 'email_verification' | 'password_reset';
  expires_at: string;
  used_at: string | null;
  created_at: string;
}
