import React, { useMemo, useState } from 'react';
import {
  useCreateProductTemplate,
  useCreateProposalCategory,
  useDeleteProposalCategory,
  useUpdateProposalCategory,
  getListProductTemplatesQueryKey,
  getListProposalCategoriesQueryKey,
} from '@workspace/api-client-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Edit, ImageIcon, Layers, Package, Plus, Search, Trash2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/auth';
import { formatCurrencyBRL } from '@/lib/masks';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório'),
  description: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().int().optional(),
  productIds: z.array(z.string()),
});

type ProgramForm = z.infer<typeof schema>;

const productSchema = z.object({
  name: z.string().min(1, 'Nome interno é obrigatório'),
  title: z.string().min(1, 'Título é obrigatório'),
  qty: z.string().optional(),
  description: z.string().optional(),
  detail: z.string().optional(),
  suggestedValueMin: z.string().optional(),
  suggestedValueMax: z.string().optional(),
  tags: z.array(z.string()).optional(),
  color: z.enum(['BLUE', 'YELLOW', 'RED', 'GREEN', 'DARK']),
});

type ProductForm = z.infer<typeof productSchema>;
type PendingProduct = ProductForm & { tempId: string };

function isImageDataUrl(value?: string | null) {
  return Boolean(value?.startsWith('data:image/'));
}

function ProgramIcon({ icon, name }: { icon?: string | null; name: string }) {
  if (isImageDataUrl(icon)) {
    return <img src={icon!} alt="" className="h-full w-full object-cover" />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
      <span className="text-base font-bold">{name.slice(0, 2).toUpperCase()}</span>
    </div>
  );
}

function getSelectedProductIds(program: any) {
  return Array.isArray(program.products) ? program.products.map((product: any) => product.id) : [];
}

export default function AdminProposalCategories() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const isAdmin = user?.role === 'ADMIN';
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [filters, setFilters] = useState({ search: '', active: 'true', sort: 'order_asc' });

  const { data: categories, isLoading } = useQuery({
    queryKey: ['proposal-categories', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search.trim()) params.set('search', filters.search.trim());
      if (filters.active) params.set('active', filters.active);
      if (filters.sort) params.set('sort', filters.sort);
      const response = await fetch(`/api/proposal-categories?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error('Erro ao carregar programas');
      return response.json();
    },
  });
  const { data: products } = useQuery({
    queryKey: ['product-templates-for-programs'],
    queryFn: async () => {
      const response = await fetch('/api/product-templates?active=true&sort=name_asc', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error('Erro ao carregar produtos');
      return response.json();
    },
  });

  const createMutation = useCreateProposalCategory();
  const updateMutation = useUpdateProposalCategory();
  const createProductMutation = useCreateProductTemplate();
  const deleteMutation = useDeleteProposalCategory({
    mutation: {
      onSuccess: () => {
        toast.success('Programa excluído');
        queryClient.invalidateQueries({ queryKey: ['proposal-categories'] });
        queryClient.invalidateQueries({ queryKey: ['product-templates-for-programs'] });
        queryClient.invalidateQueries({ queryKey: [getListProposalCategoriesQueryKey()[0]] });
        queryClient.invalidateQueries({ queryKey: [getListProductTemplatesQueryKey()[0]] });
      },
      onError: () => toast.error('Erro ao excluir programa'),
    },
  });

  const form = useForm<ProgramForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      icon: '',
      order: 0,
      productIds: [],
    },
  });

  const productForm = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      title: '',
      qty: '01',
      description: '',
      detail: '',
      suggestedValueMin: '',
      suggestedValueMax: '',
      tags: [],
      color: 'BLUE',
    },
  });

  const selectedProductIds = form.watch('productIds');

  const availableProducts = useMemo(() => {
    const list = (products as any[]) || [];
    return list
      .slice()
      .sort((a, b) => String(a.title || a.name).localeCompare(String(b.title || b.name)));
  }, [products]);

  const openEdit = (program: any) => {
    setEditingId(program.id);
    setPendingProducts([]);
    form.reset({
      name: program.name,
      slug: program.slug,
      description: program.description || '',
      icon: isImageDataUrl(program.icon) ? program.icon : '',
      order: program.order || 0,
      productIds: getSelectedProductIds(program),
    });
    setIsOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setPendingProducts([]);
    form.reset({
      name: '',
      slug: '',
      description: '',
      icon: '',
      order: (categories?.length || 0) * 10,
      productIds: [],
    });
    setIsOpen(true);
  };

  const openInlineProduct = () => {
    productForm.reset({
      name: '',
      title: '',
      qty: '01',
      description: '',
      detail: '',
      suggestedValueMin: '',
      suggestedValueMax: '',
      tags: [],
      color: 'BLUE',
    });
    setIsProductOpen(true);
  };

  const autoGenerateSlug = (name: string) => {
    if (!form.getValues('slug')) {
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      form.setValue('slug', slug);
    }
  };

  const handleIconFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      form.setValue('icon', String(reader.result || ''), { shouldDirty: true });
      toast.success('Ícone carregado');
    };
    reader.onerror = () => toast.error('Erro ao carregar imagem');
    reader.readAsDataURL(file);
  };

  const toggleProduct = (productId: string, checked: boolean) => {
    const current = form.getValues('productIds');
    const next = checked ? [...new Set([...current, productId])] : current.filter((id) => id !== productId);
    form.setValue('productIds', next, { shouldDirty: true });
  };

  const handleInlineProduct = async (values: ProductForm) => {
    const payload = {
      ...values,
      qty: values.qty || '01',
      description: values.description || null,
      detail: values.detail || null,
      suggestedValueMin: values.suggestedValueMin || null,
      suggestedValueMax: values.suggestedValueMax || null,
      tags: values.tags || [],
    };

    if (!editingId) {
      setPendingProducts((current) => [
        ...current,
        {
          ...values,
          tempId: crypto.randomUUID(),
          qty: values.qty || '01',
        },
      ]);
      setIsProductOpen(false);
      toast.success('Produto adicionado ao programa');
      return;
    }

    try {
      const product = await createProductMutation.mutateAsync({
        data: { ...payload, programId: editingId } as any,
      });
      const createdId = (product as any).id;
      if (createdId) {
        const current = form.getValues('productIds');
        form.setValue('productIds', [...new Set([...current, createdId])], { shouldDirty: true });
      }
      queryClient.invalidateQueries({ queryKey: ['proposal-categories'] });
      queryClient.invalidateQueries({ queryKey: ['product-templates-for-programs'] });
      queryClient.invalidateQueries({ queryKey: [getListProductTemplatesQueryKey()[0]] });
      setIsProductOpen(false);
      toast.success('Produto criado e vinculado');
    } catch {
      toast.error('Erro ao criar produto');
    }
  };

  const onSubmit = async (values: ProgramForm) => {
    const payload = {
      ...values,
      description: values.description || null,
      icon: values.icon || null,
      order: Number.isFinite(values.order) ? values.order : 0,
    };

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: payload as any });
        toast.success('Programa atualizado');
      } else {
        const createdProgram = await createMutation.mutateAsync({ data: payload as any });
        const programId = (createdProgram as any)?.id;
        if (programId && pendingProducts.length) {
          await Promise.all(
            pendingProducts.map((product) =>
              createProductMutation.mutateAsync({
                data: {
                  name: product.name,
                  title: product.title,
                  qty: product.qty || '01',
                  description: product.description || null,
                  detail: product.detail || null,
                  suggestedValueMin: product.suggestedValueMin || null,
                  suggestedValueMax: product.suggestedValueMax || null,
                  tags: product.tags || [],
                  color: product.color,
                  programId,
                } as any,
              }),
            ),
          );
        }
        toast.success('Programa criado');
      }
      queryClient.invalidateQueries({ queryKey: ['proposal-categories'] });
      queryClient.invalidateQueries({ queryKey: ['product-templates-for-programs'] });
      queryClient.invalidateQueries({ queryKey: [getListProposalCategoriesQueryKey()[0]] });
      queryClient.invalidateQueries({ queryKey: [getListProductTemplatesQueryKey()[0]] });
      setPendingProducts([]);
      setIsOpen(false);
    } catch {
      toast.error('Erro ao salvar programa');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Programas</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? 'Cadastre programas, envie um ícone e vincule produtos existentes.'
              : 'Consulte os programas e seus produtos disponíveis.'}
          </p>
        </div>
        {isAdmin && (
          <Button size="lg" onClick={openCreate}>
            <Plus className="mr-2 h-5 w-5" />
            Novo Programa
          </Button>
        )}
      </div>

      <div className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-[1fr_180px_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, slug ou descrição"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
        </div>
        <Select value={filters.active} onValueChange={(active) => setFilters((current) => ({ ...current, active }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Ativos</SelectItem>
            <SelectItem value="false">Inativos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.sort} onValueChange={(sort) => setFilters((current) => ({ ...current, sort }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="order_asc">Ordem cadastrada</SelectItem>
            <SelectItem value="name_asc">Nome A-Z</SelectItem>
            <SelectItem value="name_desc">Nome Z-A</SelectItem>
            <SelectItem value="products_count_desc">Mais produtos</SelectItem>
            <SelectItem value="products_count_asc">Menos produtos</SelectItem>
            <SelectItem value="newest">Mais recentes</SelectItem>
            <SelectItem value="oldest">Mais antigos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>{editingId ? 'Editar Programa' : 'Criar Programa'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(92vh-82px)]">
            <div className="px-6 py-5">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-5 md:grid-cols-[140px_1fr]">
                    <FormField control={form.control} name="icon" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ícone</FormLabel>
                        <div className="space-y-3">
                          <div className="h-28 w-28 overflow-hidden rounded-lg border bg-muted">
                            {isImageDataUrl(field.value) ? (
                              <img src={field.value} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <ImageIcon className="h-8 w-8" />
                              </div>
                            )}
                          </div>
                          <Input type="file" accept="image/*" onChange={handleIconFile} />
                          {field.value && (
                            <Button type="button" variant="outline" size="sm" onClick={() => field.onChange('')}>
                              <X className="mr-2 h-4 w-4" />
                              Remover
                            </Button>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="space-y-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Jornal da Manhã"
                              {...field}
                              onBlur={(event) => {
                                field.onBlur();
                                autoGenerateSlug(event.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField control={form.control} name="slug" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Slug</FormLabel>
                            <FormControl><Input placeholder="jornal-da-manha" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="order" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ordem</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                value={field.value ?? 0}
                                onChange={(event) => field.onChange(Number.parseInt(event.target.value, 10) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl><Textarea rows={3} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <div className="rounded-lg border">
                    <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                      <div>
                        <h3 className="text-sm font-semibold">Produtos vinculados</h3>
                        <p className="text-xs text-muted-foreground">
                          Selecione produtos já cadastrados para aparecerem neste programa.
                        </p>
                      </div>
                      <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                        {selectedProductIds.length + pendingProducts.length} selecionados
                      </span>
                    </div>
                    {isAdmin && (
                      <div className="border-b px-4 py-3">
                        <Button type="button" variant="outline" size="sm" onClick={openInlineProduct}>
                          <Plus className="mr-2 h-4 w-4" />
                          Novo Produto
                        </Button>
                      </div>
                    )}
                    <ScrollArea className="h-64">
                      <div className="space-y-2 p-3">
                        {pendingProducts.map((product) => (
                          <div key={product.tempId} className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-3">
                            <Package className="mt-0.5 h-4 w-4 text-primary" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <span className="truncate text-sm font-semibold">{product.title}</span>
                                <span className="shrink-0 rounded bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
                                  {product.qty || '01'}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">Será criado ao salvar o programa.</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setPendingProducts((current) => current.filter((item) => item.tempId !== product.tempId))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {availableProducts.length ? availableProducts.map((product: any) => {
                          const checked = selectedProductIds.includes(product.id);
                          return (
                            <label
                              key={product.id}
                              className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3 transition-colors hover:bg-muted/40"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => toggleProduct(product.id, Boolean(value))}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="truncate text-sm font-semibold">{product.title || product.name}</span>
                                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                    {product.qty || '01'}
                                  </span>
                                </div>
                                {product.description && (
                                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
                                )}
                                {product.programName && product.programId !== editingId && (
                                  <p className="mt-1 text-xs font-medium text-amber-600">
                                    Atualmente vinculado a {product.programName}. Selecionar aqui irá mover o produto.
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        }) : (
                          <div className="py-10 text-center text-sm text-muted-foreground">
                            Nenhum produto cadastrado ainda.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    Salvar Programa
                  </Button>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isProductOpen} onOpenChange={setIsProductOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Produto</DialogTitle>
          </DialogHeader>
          <Form {...productForm}>
            <form onSubmit={productForm.handleSubmit(handleInlineProduct)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField control={productForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome interno</FormLabel>
                    <FormControl><Input placeholder="Ex: Spot 30s Padrão" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={productForm.control} name="color" render={({ field }) => (
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
                <div className="col-span-4 sm:col-span-3">
                  <FormField control={productForm.control} name="qty" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl><Input placeholder="Ex: 50x" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="col-span-8 sm:col-span-9">
                  <FormField control={productForm.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título na proposta</FormLabel>
                      <FormControl><Input placeholder="Ex: Spot Comercial 30s" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField control={productForm.control} name="suggestedValueMin" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor sugerido mínimo</FormLabel>
                    <FormControl><Input inputMode="numeric" placeholder="R$ 1.500,00" {...field} onChange={(event) => field.onChange(formatCurrencyBRL(event.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={productForm.control} name="suggestedValueMax" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor sugerido máximo</FormLabel>
                    <FormControl><Input inputMode="numeric" placeholder="R$ 4.000,00" {...field} onChange={(event) => field.onChange(formatCurrencyBRL(event.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={productForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição principal</FormLabel>
                  <FormControl><Textarea rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createProductMutation.isPending}>
                Criar e Vincular Produto
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Carregando...</div>
      ) : categories?.length ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {categories.map((program: any) => (
            <Card key={program.id} className="flex min-h-[260px] flex-col p-5">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
                  <ProgramIcon icon={program.icon} name={program.name} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-bold leading-tight">{program.name}</h3>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{program.slug}</p>
                  {program.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{program.description}</p>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(program)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-error/10 hover:text-error"
                      onClick={() => setDeleteTarget(program)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Package className="h-4 w-4" />
                {program.productCount || program.templateCount || 0} produtos vinculados
              </div>

              {program.products?.length ? (
                <div className="mt-4 space-y-2">
                  {program.products.map((product: any) => (
                    <div key={product.id} className="rounded-md border bg-muted/20 px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 flex-1 text-sm font-semibold leading-tight">{product.title}</span>
                        <span className="shrink-0 rounded bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
                          {product.qty}
                        </span>
                      </div>
                      {product.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
                      )}
                      {(product.suggestedValueMin || product.suggestedValueMax) && (
                        <p className="mt-1 text-xs font-medium text-primary">
                          Sugestão: {product.suggestedValueMin || 'R$ 0,00'} a {product.suggestedValueMax || 'sem teto'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 flex flex-1 items-center justify-center rounded-lg border border-dashed py-8 text-sm text-muted-foreground">
                  Nenhum produto vinculado.
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <Layers className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
          <h3 className="text-lg font-medium">Nenhum programa</h3>
          {isAdmin && (
            <Button className="mt-4" onClick={openCreate} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro
            </Button>
          )}
        </div>
      )}
      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir programa?"
        description={`Tem certeza que deseja excluir ${deleteTarget?.name || 'este programa'}? Os produtos vinculados ficarão sem programa definido.`}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate({ id: deleteTarget.id });
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
