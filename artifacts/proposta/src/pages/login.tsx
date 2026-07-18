import React from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLogin } from '@workspace/api-client-react';
import { useAuthStore } from '@/store/auth';
import { feedback } from '@/lib/feedback';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { normalizeEmailInput } from '@/lib/masks';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Informe seu nome'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuthStore();
  const loginMutation = useLogin();
  const [registering, setRegistering] = React.useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      const data = await loginMutation.mutateAsync({ data: values });
      setAuth(data.user, data.accessToken);
      feedback.success('Login realizado com sucesso!');
      setLocation(data.user.role === 'ADMIN' ? '/dashboard' : '/proposals');
    } catch (error: any) {
      feedback.error(error.message || 'Erro ao fazer login. Verifique suas credenciais.');
    }
  };

  const onRegister = async (values: z.infer<typeof registerSchema>) => {
    setRegistering(true);
    try {
      const response = await fetch('/api/auth/register-commercial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao criar cadastro');
      }
      feedback.success('Solicitação enviada. Um administrador precisa aprovar seu acesso e definir as empresas permitidas.');
      form.setValue('email', values.email);
      form.setValue('password', '');
      registerForm.reset();
    } catch (error: any) {
      feedback.error(error.message || 'Erro ao criar cadastro');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="flex min-h-screen min-h-dvh w-full items-center justify-center overflow-x-hidden bg-muted/30 p-4">
      <Card className="w-full min-w-0 max-w-md overflow-hidden border-border/50 shadow-xl">
        <CardHeader className="space-y-3 px-4 pb-6 text-center sm:px-6">
          <div className="mx-auto mb-2 flex h-28 max-w-[180px] items-center justify-center">
            <img
              src="/brand/gtf-logo-completa.png"
              alt="GTF"
              className="h-full w-auto object-contain"
            />
          </div>
          <CardDescription className="text-base">
            Sistema Comercial GTF
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 px-4 sm:px-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Criar acesso</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="seu@email.com" {...field} onChange={(event) => field.onChange(normalizeEmailInput(event.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <FormLabel>Senha</FormLabel>
                          <button
                            type="button"
                            className="min-h-8 text-xs font-medium text-primary hover:underline"
                            onClick={() => setLocation('/forgot-password')}
                          >
                            Esqueceu a senha?
                          </button>
                        </div>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" size="lg" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? 'Entrando...' : 'Entrar no sistema'}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-5">
                  <FormField control={registerForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={registerForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail comercial</FormLabel>
                      <FormControl><Input type="email" placeholder="seu@email.com" {...field} onChange={(event) => field.onChange(normalizeEmailInput(event.target.value))} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={registerForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" size="lg" disabled={registering}>
                    {registering ? 'Enviando...' : 'Solicitar acesso comercial'}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    O acesso será liberado após aprovação de um administrador.
                  </p>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
