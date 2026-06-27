import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — TaskFlow Pro" },
      { name: "description", content: "Sign in to your TaskFlow Pro workspace." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  useEffect(() => {
    if (resendIn <= 0) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [resendIn]);

  async function sendOtp(targetEmail: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  async function logAudit(
    event:
      | "otp_send"
      | "otp_resend"
      | "otp_verify_success"
      | "otp_verify_failure"
      | "otp_expired",
    targetEmail: string,
    errorMessage?: string,
  ) {
    try {
      await supabase.from("auth_audit_log").insert({
        event,
        email: targetEmail || null,
        error_message: errorMessage ?? null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      });
    } catch {
      // best-effort audit; never block auth flow
    }
  }

  async function onSendOtp(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      await sendOtp(email);
      await logAudit("otp_send", email);
      toast.success("We sent a 6-digit code to your email.");
      setStep("otp");
      setOtp("");
      setResendIn(30);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send code";
      await logAudit("otp_send", email, msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) return toast.error("Enter the 6-digit code");
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
      if (error) throw error;
      await logAudit("otp_verify_success", email);
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid or expired code";
      const expired = /expire/i.test(msg);
      await logAudit(expired ? "otp_expired" : "otp_verify_failure", email, msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function onResend() {
    if (resendIn > 0) return;
    setSubmitting(true);
    try {
      await sendOtp(email);
      await logAudit("otp_resend", email);
      toast.success("New code sent.");
      setResendIn(30);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not resend code";
      await logAudit("otp_resend", email, msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }


  async function signInGoogle() {
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
    else if (!r.redirected) navigate({ to: "/dashboard" });
  }

  return (
    <div className="relative grid min-h-screen overflow-hidden bg-surface lg:grid-cols-2">
      <div className="pointer-events-none absolute -top-32 -left-32 size-[28rem] rounded-full bg-brand/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 size-[28rem] rounded-full bg-accent-2/15 blur-3xl" />

      <div className="relative z-10 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-reveal">
          <Link to="/auth" className="mb-10 flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-brand shadow-brand">
              <div className="size-3.5 rotate-45 border-2 border-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">TaskFlow Pro</span>
          </Link>

          <h1 className="text-3xl font-bold tracking-tight">
            {step === "email" ? "Welcome back" : "Enter your code"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === "email"
              ? "Sign in with a one-time code sent to your email."
              : `We sent a 6-digit code to ${email}. It expires in 5 minutes.`}
          </p>

          {step === "email" && (
            <>
              <button
                type="button"
                onClick={signInGoogle}
                className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-panel px-4 py-2.5 text-sm font-medium text-foreground shadow-card transition hover:bg-slate-50"
              >
                <GoogleG />
                Continue with Google
              </button>

              <div className="my-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={onSendOtp} className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-700">Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-border bg-panel px-3.5 py-2.5 text-sm shadow-card outline-none ring-brand/30 transition focus:border-brand focus:ring-4"
                  />
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-3 w-full rounded-xl bg-brand py-3 text-sm font-semibold text-brand-foreground shadow-brand transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Send OTP"}
                </button>
              </form>
            </>
          )}

          {step === "otp" && (
            <form onSubmit={onVerify} className="mt-7 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">6-digit code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="block w-full rounded-xl border border-border bg-panel px-3.5 py-3 text-center text-lg font-semibold tracking-[0.5em] shadow-card outline-none ring-brand/30 transition focus:border-brand focus:ring-4"
                />
              </label>

              <button
                type="submit"
                disabled={submitting || otp.length !== 6}
                className="mt-3 w-full rounded-xl bg-brand py-3 text-sm font-semibold text-brand-foreground shadow-brand transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {submitting ? "Verifying…" : "Verify OTP"}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                  }}
                  className="font-semibold text-brand"
                >
                  Change email
                </button>
                <button
                  type="button"
                  onClick={onResend}
                  disabled={resendIn > 0 || submitting}
                  className="font-semibold text-brand disabled:text-slate-400"
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand to-accent-2 lg:block">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">TaskFlow Pro</p>
            <h2 className="mt-3 max-w-md text-4xl font-bold leading-tight tracking-tight">
              Run your team's work like a precision instrument.
            </h2>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-md">
              <p className="text-sm leading-relaxed text-white/90">
                "Real-time Kanban, exports, attachments — finally a tool that keeps the whole team in sync."
              </p>
            </div>
            <div className="flex items-center gap-6 text-xs opacity-80">
              <span>SOC 2 Type II</span>
              <span>GDPR ready</span>
              <span>99.99% uptime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.56-2.77c-.99.67-2.26 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.45.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.46 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}
