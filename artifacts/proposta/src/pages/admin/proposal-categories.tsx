import React, { useState } from 'react';
import { 
  useListProposalCategories, 
  useCreateProposalCategory, 
  useUpdateProposalCategory, 
  useDeleteProposalCategory,
  getListProposalCategoriesQueryKey 
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Layers, Edit, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório'),
  description: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().int().optional(),
});

export default function AdminProposalCategories() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: categories, isLoading } = useListProposalCategories({
    query: { queryKey: getListProposalCategoriesQueryKey() }
  });

  const createMutation = useCreateProposalCategory();
  const updateMutation = useUpdateProposalCategory();
  const deleteMutation = useDeleteProposalCategory({
    mutation: {
      onSuccess: () => {
        toast.success('Categoria excluída');
        queryClient.invalidateQueries({ queryKey: [getListProposalCategoriesQueryKey()[0]] });
      }
    }
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', slug: '', description: '', icon: '📄', order: 0 },
  });

  const openEdit = (cat: any) => {
    setEditingId(cat.id);
    form.reset({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      icon: cat.icon || '📄',
      order: cat.order || 0,
    });
    setIsOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    form.reset({ name: '', slug: '', description: '', icon: '📄', order: (categories?.length || 0) * 10 });
    setIsOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: values });
        toast.success('Categoria atualizada');
      } else {
        await createMutation.mutateAsync({ data: values });
        toast.success('Categoria criada');
      }
      queryClient.invalidateQueries({ queryKey: [getListProposalCategoriesQueryKey()[0]] });
      setIsOpen(false);
    } catch (e) {
      toast.error('Erro ao salvar categoria');
    }
  };

  const autoGenerateSlug = (name: string) => {
    if (!form.getValues('slug')) {
      const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      form.setValue('slug', slug);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorias de Proposta</h1>
          <p className="text-muted-foreground mt-1">Organize os templates de propostas.</p>
        </div>
        <Button size="lg" onClick={openCreate}><Plus className="w-5 h-5 mr-2"/> Nova Categoria</Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Editar Categoria' : 'Criar Categoria'}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex gap-4">
                <FormField control={form.control} name="icon" render={({field}) => (
                  <FormItem className="w-20">
                    <FormLabel>Ícone</FormLabel>
                    <FormControl><Input className="text-center text-xl" {...field}/></FormControl>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="name" render={({field}) => (
                  <FormItem className="flex-1">
                    <FormLabel>Nome</FormLabel>
                    <FormControl><Input placeholder="Ex: Rádio Jornalismo" {...field} onBlur={(e) => { field.onBlur(); autoGenerateSlug(e.target.value); }}/></FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="slug" render={({field}) => (
                  <FormItem><FormLabel>Slug</FormLabel><FormControl><Input placeholder="radio-jornalismo" {...field}/></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="order" render={({field}) => (
                  <FormItem><FormLabel>Ordem (0, 10, 20...)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))}/></FormControl><FormMessage/></FormItem>
                )}/>
              </div>
              
              <FormField control={form.control} name="description" render={({field}) => (
                <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea rows={2} {...field}/></FormControl><FormMessage/></FormItem>
              )}/>

              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>Salvar Categoria</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Carregando...</div>
      ) : categories?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <Card key={cat.id} className="p-5 flex items-start gap-4">
              <div className="text-3xl bg-muted/50 w-14 h-14 rounded-xl flex items-center justify-center shrink-0">
                {cat.icon || '📄'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg leading-tight">{cat.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{cat.slug}</p>
                <div className="mt-2 text-xs font-medium bg-neutral-100 text-neutral-600 inline-flex px-2 py-0.5 rounded">
                  {cat.templateCount || 0} templates
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(cat)}>
                  <Edit className="w-4 h-4"/>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-error hover:bg-error/10" onClick={() => deleteMutation.mutate({ id: cat.id })}>
                  <Trash2 className="w-4 h-4"/>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center border rounded-xl border-dashed">
          <Layers className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">Nenhuma categoria</h3>
          <Button className="mt-4" onClick={openCreate} variant="outline"><Plus className="w-4 h-4 mr-2"/> Criar Primeira</Button>
        </div>
      )}
    </div>
  );
}
