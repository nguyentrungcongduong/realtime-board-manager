import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { authApi } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { SkipliLogo } from '@/components/SkipliLogo';

type Step = 'email' | 'code';

const emailSchema = z.object({ email: z.string().email('Please enter a valid email') });
const codeSchema = z.object({ code: z.string().min(1, 'Please enter code verification') });

type EmailForm = z.infer<typeof emailSchema>;
type CodeForm = z.infer<typeof codeSchema>;

function LoginPage() {
  const [step, setStep] = useState<Step>('email');
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
      // Try signin first, if user doesn't exist try signup then signin
      try {
        const res = await authApi.signIn(email, data.code);
        const { accessToken, user } = res.data.data;
        setAuth(user, accessToken);
        navigate('/boards');
      } catch {
        await authApi.signUp(email, data.code);
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
    <div className="relative min-h-screen bg-white flex items-center justify-center p-4 overflow-hidden">
      {/* Bottom Left Illustration */}
      <div className="hidden md:block absolute bottom-0 left-0 w-96 h-72 opacity-90 pointer-events-none">
        <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path d="M0 220 L150 140 L300 220 L150 300 Z" fill="#00C2FF" opacity="0.3" />
          <path d="M20 230 L150 160 L280 230 L150 300 Z" fill="#0052CC" opacity="0.6" />
          <rect x="120" y="80" width="80" height="110" rx="4" fill="#E6F0FF" stroke="#0052CC" strokeWidth="3" />
          <line x1="135" y1="100" x2="185" y2="100" stroke="#0052CC" strokeWidth="4" strokeLinecap="round" />
          <line x1="135" y1="120" x2="175" y2="120" stroke="#00C2FF" strokeWidth="4" strokeLinecap="round" />
          <circle cx="60" cy="180" r="10" fill="#EA3829" />
          <path d="M60 190 L60 220 M45 200 L75 200" stroke="#EA3829" strokeWidth="3" />
        </svg>
      </div>

      {/* Bottom Right Illustration */}
      <div className="hidden md:block absolute bottom-0 right-0 w-96 h-72 opacity-90 pointer-events-none">
        <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path d="M100 220 L250 140 L400 220 L250 300 Z" fill="#00C2FF" opacity="0.3" />
          <rect x="230" y="60" width="100" height="130" rx="6" fill="#FFFFFF" stroke="#0052CC" strokeWidth="3" />
          <circle cx="280" cy="110" r="18" fill="#0052CC" opacity="0.2" />
          <path d="M260 150 L300 150" stroke="#0052CC" strokeWidth="4" strokeLinecap="round" />
          <circle cx="350" cy="120" r="22" stroke="#0052CC" strokeWidth="4" fill="none" />
          <line x1="335" y1="135" x2="315" y2="155" stroke="#0052CC" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Main Login/Verification Card */}
      <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-sm p-8 shadow-sm text-center">
        {step === 'email' ? (
          <>
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <SkipliLogo className="w-10 h-10" />
            </div>

            <p className="text-xs font-semibold text-slate-500 mb-6">Log in to continue</p>

            {error && (
              <div className="mb-4 text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={emailForm.handleSubmit(handleSendCode)} className="space-y-4">
              <div>
                <input
                  {...emailForm.register('email')}
                  type="email"
                  placeholder="Enter your email"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-slate-800 placeholder-slate-400"
                  disabled={loading}
                />
                {emailForm.formState.errors.email && (
                  <p className="mt-1 text-left text-xs text-red-500">{emailForm.formState.errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-slate-900 mb-1">Email Verification</h1>
            <p className="text-xs text-slate-500 mb-6">Please enter your code that send to your email address</p>

            {error && (
              <div className="mb-4 text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={codeForm.handleSubmit(handleVerify)} className="space-y-4">
              <div>
                <input
                  {...codeForm.register('code')}
                  type="text"
                  placeholder="Enter code verification"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-center tracking-widest font-mono focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-slate-800 placeholder-slate-400"
                  disabled={loading}
                  autoFocus
                />
                {codeForm.formState.errors.code && (
                  <p className="mt-1 text-left text-xs text-red-500">{codeForm.formState.errors.code.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('email'); setError(null); }}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                ← Change email address
              </button>
            </form>
          </>
        )}

        {/* Footer Privacy Notice */}
        <div className="mt-8 pt-4 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
          <p className="hover:underline cursor-pointer">Privacy Policy</p>
          <p className="leading-tight px-4">
            This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
