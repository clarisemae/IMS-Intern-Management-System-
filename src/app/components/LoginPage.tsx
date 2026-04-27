import React, { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Building2, ShieldCheck, Sparkles } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openResetDialog = () => {
    setResetEmail(email);
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setOtpSent(false);
    setResetError('');
    setResetMessage('');
    setIsResetDialogOpen(true);
  };

  const closeResetDialog = () => {
    if (resetLoading) {
      return;
    }

    setIsResetDialogOpen(false);
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setOtpSent(false);
    setResetError('');
    setResetMessage('');
  };

  const handleSendOtp = async () => {
    setResetLoading(true);
    setResetError('');
    setResetMessage('');

    try {
      const response = await apiRequest<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail }),
      });

      setOtpSent(true);
      setResetMessage(response.message);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Failed to send OTP.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setResetLoading(true);
    setResetError('');
    setResetMessage('');

    try {
      const response = await apiRequest<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: resetEmail,
          otp,
          newPassword,
        }),
      });

      setEmail(resetEmail);
      setPassword('');
      setResetMessage(response.message);
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpSent(false);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.22),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.18),_transparent_35%)]" />
      <div className="relative grid w-full max-w-5xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="hidden rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-2xl backdrop-blur lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-5">
            <Badge className="w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white hover:bg-white/10">
              REGRIS internship system
            </Badge>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-lg">
              <Building2 className="h-7 w-7" />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight">Intern operations in one clear, focused system.</h1>
              <p className="max-w-xl text-base leading-7 text-slate-300">
                Manage attendance, daily logs, tasks, and team coordination from one organized workspace built for internship operations.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <ShieldCheck className="mb-3 h-5 w-5 text-cyan-300" />
              <p className="text-sm font-medium">Role-based access</p>
              <p className="mt-1 text-sm text-slate-300">Intern, supervisor, and admin journeys stay separate and easy to scan.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <Sparkles className="mb-3 h-5 w-5 text-cyan-300" />
              <p className="text-sm font-medium">Daily operations</p>
              <p className="mt-1 text-sm text-slate-300">Keep attendance, daily logs, tasks, and communication in one connected system.</p>
            </div>
          </div>
        </div>

        <Card className="w-full border-border/60 bg-background/95 shadow-2xl">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Building2 className="h-6 w-6" />
              </div>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                Secure sign in
              </Badge>
            </div>
            <div>
              <CardTitle className="text-3xl tracking-tight">Welcome back</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6">
                Sign in to access the REGRIS internship management system and continue your work for the day.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@regris.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  inputMode="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={openResetDialog}
                >
                  Forgot password?
                </button>
              </div>
              {error && (
                <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <p className="text-sm font-medium">Local system sign-in</p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>Use an email and password that exist in your local MariaDB `users` table.</p>
                <p className="pt-1 text-xs">Role-based access is managed by your local Express API and MariaDB database.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={isResetDialogOpen} onOpenChange={(open) => (!open ? closeResetDialog() : setIsResetDialogOpen(true))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your company email to receive a one-time password, then use it to set a new password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="email@regris.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
            {otpSent && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reset-otp">OTP</Label>
                  <Input
                    id="reset-otp"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter the 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </>
            )}
            {resetMessage && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {resetMessage}
              </p>
            )}
            {resetError && (
              <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {resetError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeResetDialog} disabled={resetLoading}>
                Close
              </Button>
              {otpSent ? (
                <Button
                  onClick={handleResetPassword}
                  disabled={resetLoading || !resetEmail || otp.length !== 6 || !newPassword || !confirmPassword}
                >
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              ) : (
                <Button onClick={handleSendOtp} disabled={resetLoading || !resetEmail}>
                  {resetLoading ? 'Sending...' : 'Send OTP'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
