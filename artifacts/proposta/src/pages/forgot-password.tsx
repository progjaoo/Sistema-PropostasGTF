import React from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Mail } from 'lucide-react';
import { feedback } from '@/lib/feedback';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { normalizeEmailInput } from '@/lib/masks';

const SUCCESS_MESSAGE = 'Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.';

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.includes('@')) {
      feedback.error('Informe um e-mail válido');
      return;
    }

    setSending(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
      feedback.success(SUCCESS_MESSAGE);
    } catch {
      setSent(true);
      feedback.success(SUCCESS_MESSAGE);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen min-h-dvh w-full items-center justify-center overflow-x-hidden bg-muted/30 p-4">
      <Card className="w-full min-w-0 max-w-md overflow-hidden border-border/50 shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-7 w-7" />
          </div>
          <CardTitle>Recuperar senha</CardTitle>
          <CardDescription>
            Informe seu e-mail de acesso para receber as instruções.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={submit} className="space-y-5">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(normalizeEmailInput(event.target.value))}
              placeholder="seu@email.com"
              disabled={sending || sent}
              autoFocus
            />
            {sent && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                {SUCCESS_MESSAGE}
              </div>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={sending || sent}>
              {sending ? 'Enviando...' : 'Enviar instruções'}
            </Button>
            <Button type="button" variant="ghost" className="w-full gap-2" onClick={() => setLocation('/login')}>
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
