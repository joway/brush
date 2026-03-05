import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { requestEmailCode, verifyEmailCode, verifyGoogleAuth } from '../utils/api';
import { getGoogleClientId, requestGoogleIdToken } from '../utils/google';
import { saveAuth } from '../utils/storage';

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const googleClientId = getGoogleClientId();

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
    if (!email.trim() || !code.trim()) {
      setStatus('Please enter email and code.');
      return;
    }
    setIsLoading(true);
    setStatus('Verifying...');
    try {
      const result = await verifyEmailCode(
        email.trim(),
        code.trim(),
        undefined,
        'signin'
      );
      saveAuth(result.token, result.user);
      setStatus('Signed in.');
      navigate('/');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!googleClientId) {
      setStatus('Google sign-in is not configured. Please set client ID in src/utils/google.ts.');
      return;
    }

    setIsLoading(true);
    setStatus('Opening Google sign-in...');
    try {
      const idToken = await requestGoogleIdToken(googleClientId);
      const result = await verifyGoogleAuth(idToken, undefined, 'signin');
      saveAuth(result.token, result.user);
      setStatus('Signed in with Google.');
      navigate('/');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="text-2xl font-semibold mb-2">Sign in</h1>
          <p className="text-sm text-[var(--ink-muted)] mb-6">
            Use your email to receive a one-time verification code.
          </p>

          <div className="grid gap-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full border border-[#dadce0] bg-white hover:bg-[#f8f9fa] text-[#3c4043] font-medium py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-3"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 4 1.5l2.7-2.7C17 3.2 14.7 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.5-4 9.5-9.6 0-.6-.1-1.1-.1-1.6H12z"
                />
                <path
                  fill="#34A853"
                  d="M3.3 7.5l3.2 2.3C7.3 8 9.5 6.4 12 6.4c1.9 0 3.2.8 4 1.5l2.7-2.7C17 3.2 14.7 2.2 12 2.2c-3.8 0-7.1 2.2-8.7 5.3z"
                />
                <path
                  fill="#4A90E2"
                  d="M12 21.8c2.6 0 4.9-.9 6.5-2.5l-3-2.5c-.8.5-1.9.9-3.5.9-3.9 0-5.4-2.6-5.6-3.8l-3.2 2.5c1.6 3.2 4.9 5.4 8.8 5.4z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.3 16.5l3.2-2.5c-.2-.5-.3-1.1-.3-2s.1-1.5.3-2L3.3 7.5C2.6 8.8 2.2 10.3 2.2 12s.4 3.2 1.1 4.5z"
                />
              </svg>
              Continue with Google
            </button>
            <div className="text-center text-xs text-[var(--ink-muted)]">or use email code</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
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
              Sign in
            </button>
            {status && (
              <div className="text-xs text-[var(--ink-muted)]">{status}</div>
            )}
          </div>

          <div className="mt-6 text-sm text-[var(--ink-muted)]">
            New here?{' '}
            <Link to="/signup" className="text-[var(--ink)] underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
