import React, { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Building2, ShieldCheck, Sparkles } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.22),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.18),_transparent_35%)]" />
      <div className="relative grid w-full max-w-5xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="hidden rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-2xl backdrop-blur lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-5">
            <Badge className="w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white hover:bg-white/10">
              Shadcn UI workspace
            </Badge>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-lg">
              <Building2 className="h-7 w-7" />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight">Intern operations, redesigned for a cleaner shadcn flow.</h1>
              <p className="max-w-xl text-base leading-7 text-slate-300">
                Monitor attendance, reports, tasks, and team performance from one focused workspace with calmer surfaces and clearer hierarchy.
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
              <p className="text-sm font-medium">Component-driven UI</p>
              <p className="mt-1 text-sm text-slate-300">Built on reusable cards, badges, inputs, and actions from the shadcn stack.</p>
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
                Sign in to access the REGRIS internship workspace and continue where your team left off.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@regris.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <p className="text-sm font-medium">Supabase sign-in</p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>Use an email and password that already exist in your Supabase Auth users.</p>
                <p className="pt-1 text-xs">Role-based dashboard access will use the user's `role` metadata when available.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
