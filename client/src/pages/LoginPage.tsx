import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { authApi } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { SkipliLogo } from '@/components/SkipliLogo';
import leftIllustration from '@/images/image.png';
import rightIllustration from '@/images/image1.png';

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
    <div className="w-full min-h-screen bg-white relative flex items-center justify-center p-4 overflow-hidden">
      {/* Bottom Left Image Illustration pinned to bottom-left corner of full screen */}
      <img
        src={leftIllustration}
        alt="Illustration Left"
        className="hidden md:block absolute bottom-0 left-0 w-[300px] lg:w-[400px] xl:w-[450px] max-h-[50vh] object-contain object-bottom pointer-events-none select-none z-0"
      />

      {/* Bottom Right Image Illustration pinned to bottom-right corner of full screen */}
      <img
        src={rightIllustration}
        alt="Illustration Right"
        className="hidden md:block absolute bottom-0 right-0 w-[300px] lg:w-[400px] xl:w-[450px] max-h-[50vh] object-contain object-bottom pointer-events-none select-none z-0"
      />

      {/* Main Centered Login / Verification Card */}
      <div className="relative z-10 w-full max-w-[400px] bg-white border border-slate-200 rounded p-8 shadow-xs text-center">
        {step === 'email' ? (
          <>
            {/* Logo */}
            <div className="flex justify-center mb-3">
              <SkipliLogo className="w-9 h-9" />
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

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
          <p className="hover:underline cursor-pointer">Privacy Policy</p>
          <p className="leading-tight px-3">
            This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
