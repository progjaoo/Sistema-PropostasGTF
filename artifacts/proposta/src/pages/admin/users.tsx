import * as React from 'react';
import {
  getListUsersQueryKey,
  useCreateUser,
  useDeleteUser,
  useListStations,
  useListUsers,
  useResetUserPassword,
  useUpdateUser,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Ban, Edit3, KeyRound, Plus, Search, ShieldCheck, UserCog, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { feedback } from '@/lib/feedback';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { normalizeEmailInput } from '@/lib/masks';
import { PageHeader } from '@/components/responsive/PageHeader';
import { ResponsiveFilters } from '@/components/responsive/ResponsiveFilters';
import { useMediaQuery } from '@/hooks/use-media-query';

const userSchema = z.object({
  name: z.string().min(2, 'Informe o nome completo'),
  email: z.string().email('E-mail inválido'),
  password: z.string().optional(),
  role: z.enum(['ADMIN', 'COMERCIAL']),
  active: z.boolean(),
});

type UserFormValues = z.infer<typeof userSchema>;
type AccessDraft = Record<string, {
  selected: boolean;
  canCreateProposals: boolean;
  canViewCatalog: boolean;
}>;

function createEmptyAccessDraft(stations: any[]): AccessDraft {
  return Object.fromEntries(stations.map((station) => [station.id, {
    selected: false,
    canCreateProposals: false,
    canViewCatalog: false,
  }]));
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<any | null>(null);
  const [accessDraft, setAccessDraft] = React.useState<AccessDraft>({});
  const [resetTarget, setResetTarget] = React.useState<any | null>(null);
  const [resetPassword, setResetPassword] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<any | null>(null);
  const [filters, setFilters] = React.useState({ search: '', role: 'all', status: 'all', stationId: 'all' });
  const isMobile = useMediaQuery('(max-width: 767px)');

  const { data: users, isLoading } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });
  const { data: stations } = useListStations();
  const stationList = React.useMemo(() => ((stations as any[]) || []).filter((station) => station.active !== false), [stations]);
  const userList = React.useMemo(() => ((users as any[]) || []), [users]);

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const resetMutation = useResetUserPassword();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', email: '', password: '', role: 'COMERCIAL', active: true },
  });
  const selectedRole = form.watch('role');

  const filteredUsers = React.useMemo(() => {
    const needle = filters.search.trim().toLowerCase();
    return userList.filter((user) => {
      if (needle && !`${user.name} ${user.email}`.toLowerCase().includes(needle)) return false;
      if (filters.role !== 'all' && user.role !== filters.role) return false;
      if (filters.status !== 'all' && String(user.active) !== filters.status) return false;
      if (filters.stationId !== 'all' && !(user.stationAccesses || []).some((access: any) => access.stationId === filters.stationId && access.active !== false)) return false;
      return true;
    });
  }, [filters, userList]);

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: [getListUsersQueryKey()[0]] });

  const openCreate = () => {
    setEditingUser(null);
    form.reset({ name: '', email: '', password: '', role: 'COMERCIAL', active: true });
    const nextDraft = createEmptyAccessDraft(stationList);
    if (stationList[0]) {
      nextDraft[stationList[0].id] = { selected: true, canCreateProposals: true, canViewCatalog: true };
    }
    setAccessDraft(nextDraft);
    setDialogOpen(true);
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    form.reset({ name: user.name, email: user.email, password: '', role: user.role, active: user.active });
    const nextDraft = createEmptyAccessDraft(stationList);
    (user.stationAccesses || []).forEach((access: any) => {
      nextDraft[access.stationId] = {
        selected: access.active !== false,
        canCreateProposals: access.canCreateProposals,
        canViewCatalog: access.canViewCatalog,
      };
    });
    setAccessDraft(nextDraft);
    setDialogOpen(true);
  };

  const updateAccess = (stationId: string, patch: Partial<AccessDraft[string]>) => {
    setAccessDraft((current) => {
      const previous = current[stationId] || { selected: false, canCreateProposals: false, canViewCatalog: false };
      const next = { ...previous, ...patch };
      if (patch.selected === true && !previous.selected) {
        next.canCreateProposals = true;
        next.canViewCatalog = true;
      }
      if (patch.selected === false) {
        next.canCreateProposals = false;
        next.canViewCatalog = false;
      }
      return { ...current, [stationId]: next };
    });
  };

  const serializeAccesses = () => Object.entries(accessDraft)
    .filter(([, access]) => access.selected)
    .map(([stationId, access]) => ({
      stationId,
      canCreateProposals: access.canCreateProposals,
      canViewCatalog: access.canViewCatalog,
      active: true,
    }));

  const onSubmit = async (values: UserFormValues) => {
    if (!editingUser && (!values.password || values.password.length < 6)) {
      form.setError('password', { message: 'A senha temporária deve ter ao menos 6 caracteres' });
      return;
    }
    const stationAccesses = values.role === 'COMERCIAL' ? serializeAccesses() : [];
    if (values.role === 'COMERCIAL' && values.active && !stationAccesses.some((access) => access.canCreateProposals)) {
      feedback.error('Selecione ao menos uma empresa com permissão para criar propostas');
      return;
    }

    try {
      if (editingUser) {
        await updateMutation.mutateAsync({
          id: editingUser.id,
          data: { name: values.name, email: values.email, role: values.role, active: values.active, stationAccesses } as any,
        });
        feedback.updated('Usuário atualizado');
      } else {
        await createMutation.mutateAsync({
          data: { ...values, password: values.password!, stationAccesses } as any,
        });
        feedback.created('Usuário criado');
      }
      await invalidateUsers();
      setDialogOpen(false);
    } catch (error: any) {
      feedback.error(error?.message || 'Erro ao salvar usuário');
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || resetPassword.length < 6) {
      feedback.error('A nova senha deve ter ao menos 6 caracteres');
      return;
    }
    try {
      await resetMutation.mutateAsync({ id: resetTarget.id, data: { newPassword: resetPassword } });
      feedback.updated('Senha redefinida e sessões anteriores encerradas');
      setResetTarget(null);
      setResetPassword('');
    } catch (error: any) {
      feedback.error(error?.message || 'Erro ao redefinir senha');
    }
  };

  const handleDeactivate = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteTarget.id });
      feedback.deleted('Usuário desativado');
      await invalidateUsers();
      setDeleteTarget(null);
    } catch (error: any) {
      feedback.error(error?.message || 'Erro ao desativar usuário');
    }
  };

  const renderUserActions = (user: any) => (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" onClick={() => openEdit(user)} title="Editar usuário">
        <Edit3 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => { setResetTarget(user); setResetPassword(''); }} title="Redefinir senha">
        <KeyRound className="h-4 w-4" />
      </Button>
      {user.active && (
        <Button variant="ghost" size="icon" className="text-error hover:bg-error/10 hover:text-error" onClick={() => setDeleteTarget(user)} title="Desativar usuário">
          <Ban className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        description="Gerencie contas e permissões comerciais por empresa."
        action={<Button size="lg" className="w-full sm:w-auto" onClick={openCreate}><Plus className="mr-2 h-5 w-5" /> Novo Usuário</Button>}
      />

      <div className="rounded-lg border bg-card p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome ou e-mail" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
        </div>
        <ResponsiveFilters
          className="mt-3"
          desktopClassName="lg:grid-cols-3"
          activeCount={[filters.role !== 'all', filters.status !== 'all', filters.stationId !== 'all'].filter(Boolean).length}
          onClear={() => setFilters((current) => ({ ...current, role: 'all', status: 'all', stationId: 'all' }))}
        >
        <Select value={filters.role} onValueChange={(role) => setFilters((current) => ({ ...current, role }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos os perfis</SelectItem><SelectItem value="ADMIN">Administradores</SelectItem><SelectItem value="COMERCIAL">Comerciais</SelectItem></SelectContent>
        </Select>
        <Select value={filters.status} onValueChange={(status) => setFilters((current) => ({ ...current, status }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="true">Ativos</SelectItem><SelectItem value="false">Inativos/Pendentes</SelectItem></SelectContent>
        </Select>
        <Select value={filters.stationId} onValueChange={(stationId) => setFilters((current) => ({ ...current, stationId }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas as empresas</SelectItem>{stationList.map((station) => <SelectItem key={station.id} value={station.id}>{station.name}</SelectItem>)}</SelectContent>
        </Select>
        </ResponsiveFilters>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : filteredUsers.length && isMobile ? (
          <div className="divide-y">
            {filteredUsers.map((user) => (
              <article key={user.id} className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words font-semibold">{user.name}</h2>
                    <p className="break-all text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  {renderUserActions(user)}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                    {user.role === 'ADMIN' ? 'Administrador' : 'Comercial'}
                  </Badge>
                  <span className={user.active ? 'text-xs font-medium text-success' : 'text-xs font-medium text-amber-700'}>
                    {user.active ? 'Ativo' : 'Inativo/Pendente'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Criado em {format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Empresas permitidas</p>
                  {user.role === 'ADMIN' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                      <ShieldCheck className="h-4 w-4" /> Acesso global
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {(user.stationAccesses || []).filter((access: any) => access.active !== false).length
                        ? (user.stationAccesses || []).filter((access: any) => access.active !== false).map((access: any) => <Badge key={access.stationId} variant="outline">{access.stationName}</Badge>)
                        : <span className="text-xs text-amber-700">Aguardando definição de acesso</span>}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : filteredUsers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b bg-muted/50"><tr><th className="px-5 py-4">Usuário</th><th className="px-5 py-4">Perfil</th><th className="px-5 py-4">Empresas permitidas</th><th className="px-5 py-4">Criação</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Ações</th></tr></thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-4"><div className="font-medium">{user.name}</div><div className="text-xs text-muted-foreground">{user.email}</div></td>
                    <td className="px-5 py-4"><Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>{user.role === 'ADMIN' ? 'Administrador' : 'Comercial'}</Badge></td>
                    <td className="px-5 py-4">
                      {user.role === 'ADMIN' ? <span className="inline-flex items-center gap-1 text-xs font-medium text-primary"><ShieldCheck className="h-4 w-4" /> Acesso global</span> : (
                        <div className="flex max-w-md flex-wrap gap-1">
                          {(user.stationAccesses || []).filter((access: any) => access.active !== false).length
                            ? (user.stationAccesses || []).filter((access: any) => access.active !== false).map((access: any) => <Badge key={access.stationId} variant="outline">{access.stationName}</Badge>)
                            : <span className="text-xs text-amber-700">Aguardando definição de acesso</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</td>
                    <td className="px-5 py-4">{user.active ? <span className="text-xs font-medium text-success">Ativo</span> : <span className="text-xs font-medium text-amber-700">Inativo/Pendente</span>}</td>
                    <td className="px-5 py-4">{renderUserActions(user)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="py-12 text-center text-muted-foreground"><Users className="mx-auto mb-2 h-10 w-10 opacity-30" /> Nenhum usuário encontrado</div>}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserCog className="h-5 w-5" /> {editingUser ? 'Editar Usuário' : 'Criar Usuário'}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nome</FormLabel><FormControl><Input placeholder="Nome completo" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>E-mail de login</FormLabel><FormControl><Input type="email" placeholder="usuario@empresa.com.br" {...field} onChange={(event) => field.onChange(normalizeEmailInput(event.target.value))} /></FormControl><FormMessage /></FormItem>} />
                {!editingUser && <FormField control={form.control} name="password" render={({ field }) => <FormItem><FormLabel>Senha temporária</FormLabel><FormControl><Input type="password" placeholder="Mínimo de 6 caracteres" {...field} /></FormControl><FormMessage /></FormItem>} />}
                <FormField control={form.control} name="role" render={({ field }) => <FormItem><FormLabel>Perfil</FormLabel><Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="COMERCIAL">Comercial</SelectItem><SelectItem value="ADMIN">Administrador</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                <FormField control={form.control} name="active" render={({ field }) => <FormItem className="flex items-center justify-between rounded-lg border px-4 py-3 sm:col-span-2"><div><FormLabel className="m-0">Conta ativa</FormLabel><p className="mt-1 text-xs text-muted-foreground">Contas pendentes ou inativas não conseguem entrar.</p></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>} />
              </div>

              {selectedRole === 'COMERCIAL' && (
                <div className="space-y-3 border-t pt-5">
                  <div><h3 className="font-semibold">Acessos por Empresa</h3><p className="text-sm text-muted-foreground">Defina onde o usuário pode consultar o catálogo e criar propostas.</p></div>
                  <div className="overflow-hidden rounded-lg border">
                    <div className="hidden grid-cols-[minmax(180px,1fr)_120px_140px] gap-3 border-b bg-muted/50 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground sm:grid"><span>Empresa</span><span>Criar proposta</span><span>Ver catálogo</span></div>
                    {stationList.map((station) => {
                      const access = accessDraft[station.id] || { selected: false, canCreateProposals: false, canViewCatalog: false };
                      return (
                        <div key={station.id} className="grid gap-4 border-b px-4 py-4 last:border-0 sm:grid-cols-[minmax(180px,1fr)_120px_140px] sm:items-center sm:gap-3 sm:py-3">
                          <label className="flex items-center gap-3 font-medium">
                            <Checkbox checked={access.selected} onCheckedChange={(checked) => updateAccess(station.id, { selected: checked === true })} />
                            {station.name}
                          </label>
                          <label className="flex items-center justify-between gap-3 text-sm sm:block">
                            <span className="sm:sr-only">Criar proposta</span>
                            <Switch disabled={!access.selected} checked={access.canCreateProposals} onCheckedChange={(checked) => updateAccess(station.id, { canCreateProposals: checked })} />
                          </label>
                          <label className="flex items-center justify-between gap-3 text-sm sm:block">
                            <span className="sm:sr-only">Ver catálogo</span>
                            <Switch disabled={!access.selected} checked={access.canViewCatalog} onCheckedChange={(checked) => updateAccess(station.id, { canViewCatalog: checked })} />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>{editingUser ? 'Salvar alterações' : 'Criar usuário'}</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resetTarget)} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Redefinir senha</DialogTitle></DialogHeader><div className="space-y-4"><p className="text-sm text-muted-foreground">Defina uma nova senha para {resetTarget?.name}. Todas as sessões anteriores serão encerradas.</p><Input type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} placeholder="Nova senha" /><Button className="w-full" onClick={handleResetPassword} disabled={resetMutation.isPending}>Redefinir senha</Button></div></DialogContent>
      </Dialog>

      <ConfirmActionDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title="Desativar usuário?" description={`${deleteTarget?.name || 'Este usuário'} perderá o acesso imediatamente e suas sessões serão encerradas.`} onConfirm={handleDeactivate} />
    </div>
  );
}
