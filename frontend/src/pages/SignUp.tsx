import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { requestEmailCode, verifyEmailCode, verifyGoogleAuth } from '../utils/api';
import { getGoogleClientId, renderGoogleButton } from '../utils/google';
import { saveAuth } from '../utils/storage';

export default function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const googleClientId = getGoogleClientId();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const usernameRef = useRef('');
  usernameRef.current = username.trim();

  const handleSendCode = async () => {
    if (!email.trim()) {
      setStatus('Please enter your email.');
      return;
    }
    if (cooldown > 0) {
      return;
    }
    setIsLoading(true);
    setStatus('Sending verification code...');
    try {
      await requestEmailCode(email.trim());
      setStatus('Verification code sent. Check your inbox.');
      setCooldown(60);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send code';
      setStatus(message);
      if (message.toLowerCase().includes('wait 60')) {
        setCooldown(60);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    if (!email.trim() || !code.trim() || !username.trim()) {
      setStatus('Please enter email, code, and username.');
      return;
    }
    setIsLoading(true);
    setStatus('Creating account...');
    try {
      const result = await verifyEmailCode(
        email.trim(),
        code.trim(),
        username.trim(),
        'signup'
      );
      saveAuth(result.token, result.user);
      setStatus('Account created.');
      navigate('/');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) {
      return;
    }

    void renderGoogleButton({
      container: googleButtonRef.current,
      clientId: googleClientId,
      text: 'continue_with',
      onCredential: async (idToken) => {
        setIsLoading(true);
        setStatus('Creating account with Google...');
        try {
          const preferredUsername = usernameRef.current || undefined;
          const result = await verifyGoogleAuth(idToken, preferredUsername, 'signup');
          saveAuth(result.token, result.user);
          setStatus('Account created with Google.');
          navigate('/');
        } catch (err) {
          setStatus(err instanceof Error ? err.message : 'Google sign-up failed');
        } finally {
          setIsLoading(false);
        }
      },
      onError: (message) => {
        setStatus(message);
      },
    });
  }, [googleClientId, navigate]);

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="border-b border-[var(--border)] bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-xl px-5 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-base font-semibold text-[var(--ink)]"
          >
            Magic Brush
          </button>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
              Home
            </Link>
            <Link to="/square" className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
              Square
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-5 py-12">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-8 shadow-[var(--shadow)]">
          <h1 className="text-2xl font-semibold mb-2">Sign up</h1>
          <p className="text-sm text-[var(--ink-muted)] mb-6">
            Create an account with email verification.
          </p>

          <div className="grid gap-3 w-full max-w-[400px] mx-auto">
            {googleClientId ? (
              <div className={isLoading ? 'pointer-events-none opacity-60' : ''}>
                <div ref={googleButtonRef} className="w-full min-h-[44px]" />
              </div>
            ) : (
              <button
                disabled
                className="w-full border border-[#dadce0] bg-white text-[#3c4043] font-medium py-3 px-6 rounded-xl opacity-60"
              >
                Continue with Google (Not configured)
              </button>
            )}
            <div className="text-center text-xs text-[var(--ink-muted)]">or use email code</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full px-4 py-3 bg-white border border-[var(--border)] rounded-xl text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none focus:ring-1 focus:ring-black/70"
              disabled={isLoading}
            />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full px-4 py-3 bg-white border border-[var(--border)] rounded-xl text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none focus:ring-1 focus:ring-black/70"
              disabled={isLoading}
            />
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Verification code"
                className="w-full px-4 py-3 bg-white border border-[var(--border)] rounded-xl text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none focus:ring-1 focus:ring-black/70"
                disabled={isLoading}
              />
              <button
                onClick={handleSendCode}
                disabled={isLoading || cooldown > 0}
                className="px-4 rounded-xl bg-black/90 hover:bg-black text-white text-sm disabled:bg-black/20 disabled:text-black/40"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send code'}
              </button>
            </div>
            <button
              onClick={handleVerify}
              disabled={isLoading}
              className="w-full bg-black/90 hover:bg-black text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:bg-black/20 disabled:text-black/40"
            >
              Create account
            </button>
            {status && (
              <div className={`rounded-lg border px-3 py-2 text-sm font-medium ${getStatusTone()}`}>
                {status}
              </div>
            )}
          </div>

          <div className="mt-6 text-sm text-[var(--ink-muted)]">
            Already have an account?{' '}
            <Link to="/signin" className="text-[var(--ink)] underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
  const getStatusTone = (): string => {
    const text = status.toLowerCase();
    if (
      text.includes('failed') ||
      text.includes('error') ||
      text.includes('invalid') ||
      text.includes('unauthorized') ||
      text.includes('not found') ||
      text.includes('already exists') ||
      text.includes('required') ||
      text.includes('cancel') ||
      text.includes('too short')
    ) {
      return 'border-red-200 bg-red-50 text-red-700';
    }
    if (text.includes('account created')) {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }
    return 'border-slate-200 bg-slate-50 text-slate-700';
  };
