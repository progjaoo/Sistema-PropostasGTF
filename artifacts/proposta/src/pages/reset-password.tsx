import React from 'react';
import { useLocation } from 'wouter';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { feedback } from '@/lib/feedback';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function getTokenFromUrl() {
  return new URLSearchParams(window.location.search).get('token') || '';
}

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token] = React.useState(getTokenFromUrl);
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      feedback.error('Link de recuperação inválido');
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      feedback.error('A senha deve ter entre 8 e 128 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      feedback.error('As senhas não conferem');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Não foi possível redefinir a senha');
      }
      setSuccess(true);
      feedback.updated('Senha redefinida com sucesso');
    } catch (error: any) {
      feedback.error(error?.message || 'Link inválido ou expirado');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen min-h-dvh w-full items-center justify-center overflow-x-hidden bg-muted/30 p-4">
      <Card className="w-full min-w-0 max-w-md overflow-hidden border-border/50 shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>
            Crie uma nova senha para acessar o Sistema Comercial GTF.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {!token ? (
            <div className="space-y-5">
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                Link de recuperação inválido ou ausente.
              </div>
              <Button className="w-full" onClick={() => setLocation('/login')}>
                Ir para o login
              </Button>
            </div>
          ) : success ? (
            <div className="space-y-5">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                Sua senha foi redefinida. Entre novamente usando a nova senha.
              </div>
              <Button className="w-full" onClick={() => setLocation('/login')}>
                Ir para o login
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nova senha</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirmar senha</label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repita a nova senha"
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? 'Redefinindo...' : 'Redefinir senha'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
