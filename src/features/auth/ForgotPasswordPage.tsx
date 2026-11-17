import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { adminApi } from '@/src/services/api/adminApi';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { Button } from '@/src/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/Card';
import { Input, PasswordInput } from '@/src/components/ui/Input';

export function ForgotPasswordPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialEmail = searchParams.get('email') || '';
  const initialToken = searchParams.get('token') || '';

  const [step, setStep] = useState<'request' | 'reset' | 'done'>(initialToken ? 'reset' : 'request');
  const [email, setEmail] = useState(initialEmail);
  const [codeOrToken, setCodeOrToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = `${t('resetPasswordTitle')} — Pramesh Bhattarai`;
  }, [t]);

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned = email.trim().toLowerCase();
    if (!cleaned) {
      toast.error('Please enter your account email address.');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.forgotPassword(cleaned);
      toast.success(`Reset instructions and 6-digit code sent to ${cleaned}.`);
      setStep('reset');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not process password reset request.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.resetPassword({
        email: email.trim().toLowerCase(),
        codeOrToken: codeOrToken.trim(),
        newPassword,
      });
      toast.success('Password reset successfully! Please sign in with your new password.');
      setStep('done');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Invalid or expired reset code / link.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md space-y-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sign In</span>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-blue-600 dark:text-blue-400 mb-2">
              <KeyRound className="h-5 w-5" />
            </div>
            <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {t('resetPasswordTitle')}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Recover your Admin or User/Student account securely via a 6-digit email verification code.
            </p>
          </CardHeader>

          <CardContent>
            {step === 'request' ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                  >
                    {t('emailAddress')}
                  </label>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  <Mail className="h-4 w-4" />
                  <span>{submitting ? 'Sending Reset Code...' : 'Send 6-Digit Reset Code'}</span>
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setStep('reset')}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Already have a reset code? Enter it directly
                  </button>
                </div>
              </form>
            ) : step === 'reset' ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                  >
                    {t('emailAddress')}
                  </label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="reset-code"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                  >
                    6-Digit Verification Code or Reset Token
                  </label>
                  <Input
                    id="reset-code"
                    value={codeOrToken}
                    onChange={(e) => setCodeOrToken(e.target.value)}
                    placeholder="e.g. 482910"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="reset-new-password"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                  >
                    New Password
                  </label>
                  <PasswordInput
                    id="reset-new-password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars (letter + number)"
                    minLength={8}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                  >
                    Confirm New Password
                  </label>
                  <PasswordInput
                    id="reset-confirm-password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    minLength={8}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  <ShieldCheck className="h-4 w-4" />
                  <span>{submitting ? 'Updating Password...' : 'Reset Password'}</span>
                </Button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setStep('request')}
                    className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                  >
                    Request a new code
                  </button>
                  <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
                    Back to Sign In
                  </Link>
                </div>
              </form>
            ) : (
              <div className="py-4 text-center space-y-4">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Password Updated</h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Your account password has been reset securely. All previous sessions were signed out.
                  </p>
                </div>
                <Button type="button" className="w-full" onClick={() => navigate('/login')}>
                  Continue to Sign In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
