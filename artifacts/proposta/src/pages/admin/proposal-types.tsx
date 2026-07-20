import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { feedback } from '@/lib/feedback';
import { getApiErrorMessage } from '@/lib/api-error';
import { Edit, FileCog, Plus, Search, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store/auth';
import { PageHeader } from '@/components/responsive/PageHeader';
import { ResponsiveFilters } from '@/components/responsive/ResponsiveFilters';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  active: z.boolean(),
});

type ProposalTypeForm = z.infer<typeof schema>;

type ProposalType = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

function buildHeaders(token: string | null, json = false) {
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function AdminProposalTypes() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.accessToken);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<ProposalType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProposalType | null>(null);
  const [filters, setFilters] = useState({ search: '', active: 'true' });

  const { data: proposalTypes, isLoading } = useQuery({
    queryKey: ['proposal-types', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search.trim()) params.set('search', filters.search.trim());
      if (filters.active && filters.active !== 'all') params.set('active', filters.active);
      const response = await fetch(`/api/proposal-types?${params.toString()}`, {
        headers: buildHeaders(token),
      });
      if (!response.ok) throw new Error('Erro ao carregar tipos de proposta');
      return response.json() as Promise<ProposalType[]>;
    },
  });

  const form = useForm<ProposalTypeForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      active: true,
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: '', active: true });
    setIsOpen(true);
  };

  const openEdit = (proposalType: ProposalType) => {
    setEditing(proposalType);
    form.reset({ name: proposalType.name, active: proposalType.active });
    setIsOpen(true);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['proposal-types'] });
  };

  const onSubmit = async (values: ProposalTypeForm) => {
    try {
      const response = await fetch(editing ? `/api/proposal-types/${editing.id}` : '/api/proposal-types', {
        method: editing ? 'PATCH' : 'POST',
        headers: buildHeaders(token, true),
        body: JSON.stringify({ ...values, name: values.name.trim() }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(getApiErrorMessage(payload, 'Erro ao salvar tipo de proposta'));
      }
      if (editing) {
        feedback.updated('Tipo de proposta atualizado');
      } else {
        feedback.created('Tipo de proposta criado');
      }
      invalidate();
      setIsOpen(false);
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : 'Erro ao salvar tipo de proposta');
    }
  };

  const toggleActive = async (proposalType: ProposalType) => {
    try {
      const response = await fetch(`/api/proposal-types/${proposalType.id}`, {
        method: 'PATCH',
        headers: buildHeaders(token, true),
        body: JSON.stringify({ active: !proposalType.active }),
      });
      if (!response.ok) throw new Error();
      if (proposalType.active) {
        feedback.deleted('Tipo desativado');
      } else {
        feedback.updated('Tipo ativado');
      }
      invalidate();
    } catch {
      feedback.error('Erro ao atualizar status do tipo');
    }
  };

  const deleteProposalType = async (proposalType: ProposalType) => {
    try {
      const response = await fetch(`/api/proposal-types/${proposalType.id}`, {
        method: 'DELETE',
        headers: buildHeaders(token),
      });
      if (!response.ok) throw new Error();
      feedback.deleted('Tipo de proposta desativado');
      invalidate();
    } catch {
      feedback.error('Erro ao desativar tipo de proposta');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tipos de Proposta"
        description="Cadastre os tipos usados no editor de propostas."
        action={<Button size="lg" className="w-full sm:w-auto" onClick={openCreate}>
          <Plus className="mr-2 h-5 w-5" />
          Novo Tipo
        </Button>}
      />

      <div className="rounded-lg border bg-card p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar tipo de proposta"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
        </div>
        <ResponsiveFilters
          className="mt-3"
          desktopClassName="md:grid-cols-1"
          activeCount={filters.active !== 'true' ? 1 : 0}
          onClear={() => setFilters((current) => ({ ...current, active: 'true' }))}
        >
        <Select value={filters.active} onValueChange={(active) => setFilters((current) => ({ ...current, active }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Ativos</SelectItem>
            <SelectItem value="false">Inativos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        </ResponsiveFilters>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Tipo' : 'Criar Tipo'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl><Input placeholder="Ex: Proposta Comercial" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={String(field.value)} onValueChange={(value) => field.onChange(value === 'true')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Ativo</SelectItem>
                      <SelectItem value="false">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full">
                Salvar Tipo
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Carregando...</div>
      ) : proposalTypes?.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {proposalTypes.map((proposalType) => (
            <Card key={proposalType.id} className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileCog className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-bold">{proposalType.name}</h3>
                  <button
                    type="button"
                    className={`mt-1 text-xs font-semibold ${proposalType.active ? 'text-success' : 'text-error'}`}
                    onClick={() => toggleActive(proposalType)}
                  >
                    {proposalType.active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(proposalType)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:bg-error/10 hover:text-error"
                    onClick={() => setDeleteTarget(proposalType)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <FileCog className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
          <h3 className="text-lg font-medium">Nenhum tipo de proposta</h3>
          <Button className="mt-4" onClick={openCreate} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Criar Primeiro
          </Button>
        </div>
      )}
      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Desativar tipo de proposta?"
        description={`${deleteTarget?.name || 'Este tipo'} deixará de aparecer nos novos cadastros.`}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteProposalType(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
