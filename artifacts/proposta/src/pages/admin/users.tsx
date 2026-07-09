import React from 'react';
import { useLocation } from 'wouter';
import { useListUsers, useCreateUser, getListUsersQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Users, UserCog } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { normalizeEmailInput } from '@/lib/masks';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo de 6 caracteres'),
  role: z.enum(['ADMIN', 'COMERCIAL']),
});

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  const { data: users, isLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() }
  });

  const createMutation = useCreateUser();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', role: 'COMERCIAL' },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      await createMutation.mutateAsync({ data: values });
      toast.success('Usuário criado');
      queryClient.invalidateQueries({ queryKey: [getListUsersQueryKey()[0]] });
      setIsCreateOpen(false);
      form.reset();
    } catch (e) {
      toast.error('Erro ao criar usuário');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground mt-1">Gerencie os acessos ao sistema.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="lg"><Plus className="w-5 h-5 mr-2"/> Novo Usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Usuário</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({field}) => (
                  <FormItem><FormLabel>Nome</FormLabel><FormControl><Input placeholder="Nome completo do usuário" {...field}/></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="email" render={({field}) => (
                  <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="usuario@empresa.com.br" {...field} onChange={(event) => field.onChange(normalizeEmailInput(event.target.value))}/></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="password" render={({field}) => (
                  <FormItem><FormLabel>Senha Temporária</FormLabel><FormControl><Input type="password" placeholder="Mínimo de 6 caracteres" {...field}/></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="role" render={({field}) => (
                  <FormItem>
                    <FormLabel>Perfil</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMERCIAL">Comercial</SelectItem>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage/>
                  </FormItem>
                )}/>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>Salvar Usuário</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : users?.length ? (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Perfil</th>
                <th className="px-6 py-4">Data de Criação</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-muted-foreground text-xs">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === 'ADMIN' ? 'bg-primary/10 text-primary' : 'bg-neutral-100 text-neutral-700'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {format(new Date(u.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-6 py-4">
                    {u.active ? <span className="text-success text-xs font-medium">Ativo</span> : <span className="text-error text-xs font-medium">Inativo</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-12 text-center text-muted-foreground"><Users className="w-10 h-10 mx-auto opacity-30 mb-2"/> Nenhum usuário encontrado</div>
        )}
      </Card>
    </div>
  );
}
