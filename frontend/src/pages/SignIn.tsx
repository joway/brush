import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { requestEmailCode, verifyEmailCode } from '../utils/api';
import { saveAuth } from '../utils/storage';

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

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
