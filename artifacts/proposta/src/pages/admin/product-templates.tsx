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
import { Building2, ChevronRight, Clock, Edit, Package, Plus, Search, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store/auth';
import { currencyToNumberString, formatCurrencyBRL } from '@/lib/masks';

const schema = z.object({
  programId: z.string().min(1, 'Programa é obrigatório'),
  title: z.string().min(1, 'Nome do produto é obrigatório'),
  durationId: z.string().optional(),
  description: z.string().optional(),
  detail: z.string().optional(),
  suggestedValueMin: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export default function AdminProductTemplates() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.accessToken);
  const [isOpen, setIsOpen] = useState(false);
  const [durationDialogOpen, setDurationDialogOpen] = useState(false);
  const [newDurationLabel, setNewDurationLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
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
  const { data: durations } = useQuery({
    queryKey: ['product-durations'],
    queryFn: async () => {
      const response = await fetch('/api/product-durations', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error('Erro ao carregar durações');
      return response.json();
    },
  });

  const programList = React.useMemo(() => ((programs as any[]) || []), [programs]);
  const productList = React.useMemo(() => ((products as any[]) || []), [products]);
  const selectedProgram = React.useMemo(() => {
    if (!selectedProgramId) return null;
    return programList.find((program) => program.id === selectedProgramId) || null;
  }, [programList, selectedProgramId]);
  const visibleProducts = React.useMemo(() => {
    if (filters.programId === 'none') return productList;
    if (!selectedProgramId) return productList;
    return productList.filter((product) => product.programId === selectedProgramId);
  }, [filters.programId, productList, selectedProgramId]);

  React.useEffect(() => {
    if (filters.programId === 'none') {
      setSelectedProgramId(null);
      return;
    }
    if (filters.programId !== 'all') {
      setSelectedProgramId(filters.programId);
      return;
    }
    if (programList.length > 0 && (!selectedProgramId || !programList.some((program) => program.id === selectedProgramId))) {
      setSelectedProgramId(programList[0].id);
    }
  }, [filters.programId, programList, selectedProgramId]);

  const handleProgramSelect = (programId: string) => {
    setSelectedProgramId(programId);
    setFilters((current) => ({ ...current, programId }));
  };

  const handleProgramFilterChange = (programId: string) => {
    setFilters((current) => ({ ...current, programId }));
    if (programId === 'none') {
      setSelectedProgramId(null);
      return;
    }
    if (programId !== 'all') {
      setSelectedProgramId(programId);
      return;
    }
    if (!selectedProgramId && programList[0]) {
      setSelectedProgramId(programList[0].id);
    }
  };

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
      programId: '',
      title: '',
      durationId: '',
      description: '',
      detail: '',
      suggestedValueMin: '',
      tags: [],
    },
  });

  const openEdit = (product: any) => {
    setEditingId(product.id);
    form.reset({
      programId: product.programId || '',
      title: product.title,
      durationId: product.durationId || '',
      description: product.description || '',
      detail: product.detail || '',
      suggestedValueMin: formatCurrencyBRL(product.suggestedValueMin || ''),
      tags: product.tags || [],
    });
    setIsOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    form.reset({
      programId: selectedProgramId || '',
      title: '',
      durationId: '',
      description: '',
      detail: '',
      suggestedValueMin: '',
      tags: [],
    });
    setIsOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof schema>) => {
    const data = {
      programId: values.programId,
      title: values.title,
      durationId: values.durationId || null,
      description: values.description || null,
      detail: values.detail || null,
      suggestedValueMin: values.suggestedValueMin || null,
      suggestedValueMax: null,
      tags: values.tags || [],
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

  const createDuration = async () => {
    const label = newDurationLabel.trim();
    if (!label) {
      toast.error('Informe a duração');
      return;
    }

    try {
      const response = await fetch('/api/product-durations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ label }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Erro ao criar duração');
      queryClient.invalidateQueries({ queryKey: ['product-durations'] });
      form.setValue('durationId', payload.id, { shouldDirty: true });
      setNewDurationLabel('');
      setDurationDialogOpen(false);
      toast.success('Duração criada');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar duração');
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
          onValueChange={handleProgramFilterChange}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os programas</SelectItem>
            <SelectItem value="none">Sem programa</SelectItem>
            {programList.map((program) => (
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
              <div className="grid grid-cols-1 gap-4">
                <FormField control={form.control} name="programId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Programa</FormLabel>
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Selecione um programa" /></SelectTrigger>
                      <SelectContent>
                        {programList.map((program) => (
                          <SelectItem key={program.id} value={program.id}>{program.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Nome do Produto</FormLabel><FormControl><Input placeholder="Ex: Spot Comercial 30s" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="durationId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração</FormLabel>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(value) => {
                        if (value === 'new') {
                          setDurationDialogOpen(true);
                          return;
                        }
                        field.onChange(value === 'none' ? '' : value);
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione a duração" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não informar</SelectItem>
                        {(durations || []).map((duration: any) => (
                          <SelectItem key={duration.id} value={duration.id}>{duration.label}</SelectItem>
                        ))}
                        <SelectItem value="new">+ Nova duração</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="suggestedValueMin" render={({ field }) => (
                  <FormItem><FormLabel>Valor sugerido</FormLabel><FormControl><Input inputMode="numeric" placeholder="R$ 1.500,00" {...field} onChange={(event) => field.onChange(formatCurrencyBRL(event.target.value))} /></FormControl><FormMessage /></FormItem>
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

      <Dialog open={durationDialogOpen} onOpenChange={setDurationDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova duração</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input
              value={newDurationLabel}
              onChange={(event) => setNewDurationLabel(event.target.value)}
              placeholder="Ex: 30s"
            />
            <Button className="w-full" onClick={createDuration}>Salvar duração</Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Carregando...</div>
      ) : programList.length || filters.programId === 'none' ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
          <div className="space-y-3">
            {programList.map((program) => {
              const selected = selectedProgram?.id === program.id;
              const productCount = program.productCount || program.templateCount || program.products?.length || 0;
              return (
                <button
                  key={program.id}
                  type="button"
                  className={`w-full rounded-lg border bg-card p-4 text-left shadow-sm transition-colors ${
                    selected ? 'border-primary bg-primary/5' : 'hover:border-primary/40 hover:bg-muted/30'
                  }`}
                  onClick={() => handleProgramSelect(program.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                          {program.icon ? <img src={program.icon} alt="" className="h-full w-full rounded-md object-cover" /> : program.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-bold">{program.name}</h2>
                          <p className="truncate text-xs text-muted-foreground">
                            {productCount} produto(s)
                          </p>
                          {program.station?.name && (
                            <p className="mt-0.5 truncate text-[11px] font-medium text-primary">{program.station.name}</p>
                          )}
                        </div>
                      </div>
                      {program.description && (
                        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{program.description}</p>
                      )}
                    </div>
                    <ChevronRight className={`mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${selected ? 'translate-x-1 text-primary' : ''}`} />
                  </div>
                </button>
              );
            })}

            {filters.programId === 'none' && (
              <Card className="border-primary bg-primary/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Sem programa</h2>
                    <p className="text-xs text-muted-foreground">Produtos sem vinculo com programa.</p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <Card className="min-h-[520px] overflow-hidden">
            <div className="p-5">
              <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-base font-bold text-white"
                    style={{ backgroundColor: selectedProgram?.station?.primaryColor || '#427EFF' }}
                  >
                    {selectedProgram?.icon ? <img src={selectedProgram.icon} alt="" className="h-full w-full rounded-md object-cover" /> : (selectedProgram?.name || 'SP').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Produtos do programa</p>
                    <h2 className="truncate text-2xl font-bold">{filters.programId === 'none' ? 'Sem programa' : selectedProgram?.name || 'Selecione um programa'}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {visibleProducts.length} produto(s) encontrado(s) com os filtros atuais.
                    </p>
                    {selectedProgram?.station?.name && (
                      <p className="mt-1 text-sm font-medium text-primary">{selectedProgram.station.name}</p>
                    )}
                  </div>
                </div>
                {filters.active !== 'all' && (
                  <Badge variant="outline" className="w-fit">
                    {filters.active === 'true' ? 'Ativos' : 'Inativos'}
                  </Badge>
                )}
              </div>

              <div className="mt-5">
                {visibleProducts.length ? (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {visibleProducts.map((product: any) => (
                      <Card
                        key={product.id}
                        className="overflow-hidden border-l-[6px] bg-background"
                        style={{ borderLeftColor: product.programStationPrimaryColor || selectedProgram?.station?.primaryColor || '#427EFF' }}
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={product.active ? 'secondary' : 'outline'}>
                                  {product.active ? 'Ativo' : 'Inativo'}
                                </Badge>
                                {product.durationLabel && (
                                  <Badge variant="outline" className="gap-1">
                                    <Clock className="h-3 w-3" />
                                    {product.durationLabel}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="mt-3 line-clamp-2 text-lg font-bold leading-tight">{product.title}</h3>
                              <p className="mt-1 truncate text-xs font-medium text-muted-foreground">{product.name}</p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-error hover:bg-error/10 hover:text-error" onClick={() => setDeleteTarget(product)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                            <div className="min-w-0 rounded-md bg-muted/30 px-3 py-2">
                              <span className="flex items-center gap-1 font-medium text-foreground">
                                <Building2 className="h-3.5 w-3.5" />
                                Empresa
                              </span>
                              <p className="mt-1 truncate">{product.programStationName || selectedProgram?.station?.name || 'Empresa não informada'}</p>
                            </div>
                            <div className="min-w-0 rounded-md bg-muted/30 px-3 py-2">
                              <span className="font-medium text-foreground">Valor sugerido</span>
                              <p className="mt-1 truncate">{product.suggestedValueMin || 'Não informado'}</p>
                            </div>
                          </div>

                          {product.description && (
                            <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">{product.description}</p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed py-12 text-center">
                    <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                    <h3 className="text-lg font-medium">Nenhum produto neste programa</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou crie um novo produto.</p>
                    <Button className="mt-4" onClick={openCreate} variant="outline"><Plus className="h-4 w-4" /> Criar Produto</Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="py-16 text-center border rounded-xl border-dashed">
          <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">Nenhum programa encontrado</h3>
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
