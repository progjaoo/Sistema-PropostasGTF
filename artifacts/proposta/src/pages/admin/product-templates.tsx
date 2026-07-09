import React, { useState } from 'react';
import {
  useCreateProductTemplate,
  useDeleteProductTemplate,
  useListProposalCategories,
  useUpdateProductTemplate,
  getListProductTemplatesQueryKey,
  getListProposalCategoriesQueryKey,
} from '@workspace/api-client-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Edit, LayoutGrid, Package, Plus, Search, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth';
import { currencyToNumberString, formatCurrencyBRL } from '@/lib/masks';

const schema = z.object({
  name: z.string().min(1, 'Nome interno é obrigatório'),
  title: z.string().min(1, 'Título é obrigatório'),
  qty: z.string().optional(),
  description: z.string().optional(),
  detail: z.string().optional(),
  programId: z.string().optional(),
  suggestedValueMin: z.string().optional(),
  suggestedValueMax: z.string().optional(),
  tags: z.array(z.string()).optional(),
  color: z.enum(['BLUE', 'YELLOW', 'RED', 'GREEN', 'DARK']),
});

const colorMap: Record<string, string> = {
  BLUE: 'bg-blue-500',
  YELLOW: 'bg-yellow-500',
  RED: 'bg-red-500',
  GREEN: 'bg-green-500',
  DARK: 'bg-gray-700',
};

export default function AdminProductTemplates() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.accessToken);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    programId: 'all',
    active: 'true',
    minValue: '',
    maxValue: '',
    sort: 'order_asc',
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['product-templates', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search.trim()) params.set('search', filters.search.trim());
      if (filters.programId !== 'all') params.set('programId', filters.programId);
      if (filters.active) params.set('active', filters.active);
      if (filters.minValue.trim()) params.set('minValue', currencyToNumberString(filters.minValue));
      if (filters.maxValue.trim()) params.set('maxValue', currencyToNumberString(filters.maxValue));
      if (filters.sort) params.set('sort', filters.sort);
      const response = await fetch(`/api/product-templates?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error('Erro ao carregar produtos');
      return response.json();
    },
  });
  const { data: programs } = useListProposalCategories();

  const createMutation = useCreateProductTemplate();
  const updateMutation = useUpdateProductTemplate();
  const deleteMutation = useDeleteProductTemplate({
    mutation: {
      onSuccess: () => {
        toast.success('Produto excluído');
        queryClient.invalidateQueries({ queryKey: ['product-templates'] });
        queryClient.invalidateQueries({ queryKey: [getListProductTemplatesQueryKey()[0]] });
        queryClient.invalidateQueries({ queryKey: [getListProposalCategoriesQueryKey()[0]] });
      },
      onError: () => toast.error('Erro ao excluir produto'),
    },
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      title: '',
      qty: '1x',
      description: '',
      detail: '',
      programId: '',
      suggestedValueMin: '',
      suggestedValueMax: '',
      tags: [],
      color: 'BLUE',
    },
  });

  const openEdit = (product: any) => {
    setEditingId(product.id);
    form.reset({
      name: product.name,
      title: product.title,
      qty: product.qty || '',
      description: product.description || '',
      detail: product.detail || '',
      programId: product.programId || '',
      suggestedValueMin: formatCurrencyBRL(product.suggestedValueMin || ''),
      suggestedValueMax: formatCurrencyBRL(product.suggestedValueMax || ''),
      tags: product.tags || [],
      color: product.color || 'BLUE',
    });
    setIsOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    form.reset({
      name: '',
      title: '',
      qty: '1x',
      description: '',
      detail: '',
      programId: '',
      suggestedValueMin: '',
      suggestedValueMax: '',
      tags: [],
      color: 'BLUE',
    });
    setIsOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof schema>) => {
    const data = {
      ...values,
      programId: values.programId || null,
      suggestedValueMin: values.suggestedValueMin || null,
      suggestedValueMax: values.suggestedValueMax || null,
    };

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: data as any });
        toast.success('Produto atualizado');
      } else {
        await createMutation.mutateAsync({ data: data as any });
        toast.success('Produto criado');
      }
      queryClient.invalidateQueries({ queryKey: ['product-templates'] });
      queryClient.invalidateQueries({ queryKey: [getListProductTemplatesQueryKey()[0]] });
      queryClient.invalidateQueries({ queryKey: [getListProposalCategoriesQueryKey()[0]] });
      setIsOpen(false);
    } catch {
      toast.error('Erro ao salvar produto');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground mt-1">Produtos comerciais vinculados aos programas.</p>
        </div>
        <Button size="lg" onClick={openCreate}><Plus className="w-5 h-5 mr-2" /> Novo Produto</Button>
      </div>

      <div className="grid gap-3 rounded-lg border bg-card p-3 xl:grid-cols-[1fr_210px_140px_130px_130px_190px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, título ou descrição"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
        </div>
        <Select
          value={filters.programId}
          onValueChange={(programId) => setFilters((current) => ({ ...current, programId }))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os programas</SelectItem>
            <SelectItem value="none">Sem programa</SelectItem>
            {programs?.map((program) => (
              <SelectItem key={program.id} value={program.id}>{program.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.active} onValueChange={(active) => setFilters((current) => ({ ...current, active }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Ativos</SelectItem>
            <SelectItem value="false">Inativos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Input
          inputMode="numeric"
          placeholder="R$ 0,00"
          value={filters.minValue}
          onChange={(event) => setFilters((current) => ({ ...current, minValue: formatCurrencyBRL(event.target.value) }))}
        />
        <Input
          inputMode="numeric"
          placeholder="R$ 10.000,00"
          value={filters.maxValue}
          onChange={(event) => setFilters((current) => ({ ...current, maxValue: formatCurrencyBRL(event.target.value) }))}
        />
        <Select value={filters.sort} onValueChange={(sort) => setFilters((current) => ({ ...current, sort }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="order_asc">Ordem cadastrada</SelectItem>
            <SelectItem value="name_asc">Nome A-Z</SelectItem>
            <SelectItem value="name_desc">Nome Z-A</SelectItem>
            <SelectItem value="value_asc">Menor valor</SelectItem>
            <SelectItem value="value_desc">Maior valor</SelectItem>
            <SelectItem value="newest">Mais recentes</SelectItem>
            <SelectItem value="oldest">Mais antigos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Produto' : 'Criar Produto'}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Nome interno</FormLabel><FormControl><Input placeholder="Ex: Spot 30s Padrão" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="color" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor do destaque</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BLUE">Azul</SelectItem>
                        <SelectItem value="YELLOW">Amarelo</SelectItem>
                        <SelectItem value="RED">Vermelho</SelectItem>
                        <SelectItem value="GREEN">Verde</SelectItem>
                        <SelectItem value="DARK">Escuro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-12 gap-4 border-t pt-4">
                <div className="col-span-3">
                  <FormField control={form.control} name="qty" render={({ field }) => (
                    <FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input placeholder="Ex: 50x" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="col-span-9">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Título na proposta</FormLabel><FormControl><Input placeholder="Ex: Spot Comercial 30s" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>

              <FormField control={form.control} name="programId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Programa</FormLabel>
                  <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="Selecione um programa" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem programa</SelectItem>
                      {programs?.map((program) => (
                        <SelectItem key={program.id} value={program.id}>{program.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="suggestedValueMin" render={({ field }) => (
                  <FormItem><FormLabel>Valor sugerido mínimo</FormLabel><FormControl><Input inputMode="numeric" placeholder="R$ 1.500,00" {...field} onChange={(event) => field.onChange(formatCurrencyBRL(event.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="suggestedValueMax" render={({ field }) => (
                  <FormItem><FormLabel>Valor sugerido máximo</FormLabel><FormControl><Input inputMode="numeric" placeholder="R$ 4.000,00" {...field} onChange={(event) => field.onChange(formatCurrencyBRL(event.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Descrição principal</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>Salvar Produto</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Carregando...</div>
      ) : products?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product: any) => (
            <Card key={product.id} className="relative overflow-hidden flex flex-col">
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${colorMap[product.color]}`} />
              <div className="p-4 pl-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">{product.name}</div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-2"><LayoutGrid className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(product)}><Edit className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-error" onClick={() => setDeleteTarget(product)}><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                  <span className="text-sm bg-neutral-100 px-1.5 rounded">{product.qty}</span>
                  {product.title}
                </h3>
                {(product.programName || product.program) && <p className="text-xs text-muted-foreground mb-2 font-medium">{product.programName || product.program}</p>}
                <p className="text-sm text-neutral-600 line-clamp-2">{product.description}</p>
                {(product.suggestedValueMin || product.suggestedValueMax) && (
                  <p className="text-xs font-semibold text-primary mt-3">
                    Faixa sugerida: {product.suggestedValueMin || '0'} a {product.suggestedValueMax || 'sem teto'}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center border rounded-xl border-dashed">
          <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">Nenhum produto</h3>
          <Button className="mt-4" onClick={openCreate} variant="outline"><Plus className="w-4 h-4 mr-2" /> Criar Primeiro</Button>
        </div>
      )}
      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir produto?"
        description={`Tem certeza que deseja excluir ${deleteTarget?.title || deleteTarget?.name || 'este produto'}? O produto será removido dos vínculos com programas.`}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate({ id: deleteTarget.id });
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
