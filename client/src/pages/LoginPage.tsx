import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LayoutDashboard, Mail, KeyRound, Loader2, ArrowRight } from 'lucide-react';
import { authApi } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/utils';

type Step = 'email' | 'code';
type Mode = 'signin' | 'signup';

const emailSchema = z.object({ email: z.string().email('Invalid email address') });
const codeSchema = z.object({ code: z.string().length(6, 'Code must be 6 digits') });

type EmailForm = z.infer<typeof emailSchema>;
type CodeForm = z.infer<typeof codeSchema>;

function LoginPage() {
  const [step, setStep] = useState<Step>('email');
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const codeForm = useForm<CodeForm>({ resolver: zodResolver(codeSchema) });

  const handleSendCode = async (data: EmailForm) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.sendCode(data.email);
      setEmail(data.email);
      setStep('code');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (data: CodeForm) => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'signin') {
        const res = await authApi.signIn(email, data.code);
        const { accessToken, user } = res.data.data;
        setAuth(user, accessToken);
        navigate('/boards');
      } else {
        await authApi.signUp(email, data.code);
        // Auto sign in after signup
        const res = await authApi.signIn(email, data.code);
        const { accessToken, user } = res.data.data;
        setAuth(user, accessToken);
        navigate('/boards');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center shadow-button">
          <LayoutDashboard className="w-6 h-6 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-slate-900">
            {step === 'email' ? (
              <>Welcome to <span className="gradient-text">BoardManager</span></>
            ) : (
              'Check your email'
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {step === 'email'
              ? 'Sign in or create an account to get started'
              : `We sent a 6-digit code to ${email}`}
          </p>
        </div>
      </div>

      {/* Mode toggle (only on email step) */}
      {step === 'email' && (
        <div className="flex rounded-lg border border-slate-200 p-1 mb-6">
          {(['signin', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'flex-1 py-2 rounded-md text-sm font-semibold transition-all duration-200',
                mode === m
                  ? 'gradient-bg text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 animate-fade-in">
          {error}
        </div>
      )}

      {/* Step: Email */}
      {step === 'email' && (
        <form onSubmit={emailForm.handleSubmit(handleSendCode)} className="space-y-4">
          <div>
            <label className="label">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                {...emailForm.register('email')}
                type="email"
                placeholder="you@example.com"
                className="input pl-10"
                disabled={loading}
              />
            </div>
            {emailForm.formState.errors.email && (
              <p className="mt-1 text-xs text-red-500">{emailForm.formState.errors.email.message}</p>
            )}
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Send verification code <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>
      )}

      {/* Step: Code */}
      {step === 'code' && (
        <form onSubmit={codeForm.handleSubmit(handleVerify)} className="space-y-4">
          <div>
            <label className="label">Verification code</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                {...codeForm.register('code')}
                type="text"
                placeholder="123456"
                maxLength={6}
                className="input pl-10 tracking-widest font-mono text-center text-lg"
                disabled={loading}
                autoFocus
              />
            </div>
            {codeForm.formState.errors.code && (
              <p className="mt-1 text-xs text-red-500">{codeForm.formState.errors.code.message}</p>
            )}
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Continue'}
          </button>
          <button
            type="button"
            onClick={() => { setStep('email'); setError(null); codeForm.reset(); }}
            className="btn-ghost w-full text-slate-500"
          >
            ← Back to email
          </button>
        </form>
      )}

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400 font-medium">or</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* GitHub OAuth placeholder */}
      <p className="text-center text-xs text-slate-400">
        GitHub sign-in available after connecting your account in settings
      </p>
    </div>
  );
}

export default LoginPage;
