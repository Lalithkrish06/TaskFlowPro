
DO $$ BEGIN
  CREATE TYPE public.auth_audit_event AS ENUM (
    'otp_send','otp_resend','otp_verify_success','otp_verify_failure','otp_expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.auth_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event public.auth_audit_event NOT NULL,
  email TEXT,
  user_id UUID,
  error_message TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_audit_log_email_idx ON public.auth_audit_log (email, created_at DESC);
CREATE INDEX IF NOT EXISTS auth_audit_log_event_idx ON public.auth_audit_log (event, created_at DESC);

GRANT INSERT ON public.auth_audit_log TO anon, authenticated;
GRANT SELECT ON public.auth_audit_log TO authenticated;
GRANT ALL ON public.auth_audit_log TO service_role;

ALTER TABLE public.auth_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert auth audit events"
  ON public.auth_audit_log FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read auth audit log"
  ON public.auth_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
