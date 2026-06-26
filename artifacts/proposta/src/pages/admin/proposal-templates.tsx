import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  useListProposalTemplates, 
  useCreateProposalTemplate, 
  useUpdateProposalTemplate, 
  useDeleteProposalTemplate,
  useListProposalCategories,
  getListProposalTemplatesQueryKey 
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, FileText, LayoutTemplate } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  description: z.string().optional(),
  propType: z.string().min(1, 'Tipo de Proposta é obrigatório'),
});

export default function AdminProposalTemplates() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: templates, isLoading } = useListProposalTemplates({
    query: { queryKey: getListProposalTemplatesQueryKey() }
  });

  const { data: categories } = useListProposalCategories();

  const createMutation = useCreateProposalTemplate();
  const updateMutation = useUpdateProposalTemplate();
  const deleteMutation = useDeleteProposalTemplate({
    mutation: {
      onSuccess: () => {
        toast.success('Template excluído');
        queryClient.invalidateQueries({ queryKey: [getListProposalTemplatesQueryKey()[0]] });
      }
    }
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', categoryId: '', description: '', propType: 'PROPOSTA COMERCIAL' },
  });

  const openEdit = (temp: any) => {
    setEditingId(temp.id);
    form.reset({
      name: temp.name,
      categoryId: temp.categoryId,
      description: temp.description || '',
      propType: temp.propType || 'PROPOSTA COMERCIAL',
    });
    setIsOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    form.reset({ name: '', categoryId: '', description: '', propType: 'PROPOSTA COMERCIAL' });
    setIsOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: values });
        toast.success('Template atualizado');
      } else {
        await createMutation.mutateAsync({ data: values });
        toast.success('Template criado');
      }
      queryClient.invalidateQueries({ queryKey: [getListProposalTemplatesQueryKey()[0]] });
      setIsOpen(false);
    } catch (e) {
      toast.error('Erro ao salvar template');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates de Proposta</h1>
          <p className="text-muted-foreground mt-1">Modelos base para criação rápida de propostas.</p>
        </div>
        <Button size="lg" onClick={openCreate}><Plus className="w-5 h-5 mr-2"/> Novo Template</Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Editar Info Básica' : 'Criar Template'}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({field}) => (
                <FormItem><FormLabel>Nome do Template</FormLabel><FormControl><Input placeholder="Ex: Pacote Diamante" {...field}/></FormControl><FormMessage/></FormItem>
              )}/>
              
              <FormField control={form.control} name="categoryId" render={({field}) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger>
                    <SelectContent>
                      {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage/>
                </FormItem>
              )}/>

              <FormField control={form.control} name="propType" render={({field}) => (
                <FormItem><FormLabel>Tipo Impresso na Capa</FormLabel><FormControl><Input placeholder="Ex: PROPOSTA COMERCIAL" {...field}/></FormControl><FormMessage/></FormItem>
              )}/>
              
              <FormField control={form.control} name="description" render={({field}) => (
                <FormItem><FormLabel>Descrição Interna</FormLabel><FormControl><Textarea rows={2} {...field}/></FormControl><FormMessage/></FormItem>
              )}/>

              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>Salvar</Button>
              {editingId && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Para editar o conteúdo visual (produtos, valores), abra o template.
                </p>
              )}
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Carregando...</div>
      ) : templates?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(temp => (
            <Card key={temp.id} className="p-5 flex flex-col h-full">
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded truncate max-w-[150px]">
                  {temp.category?.name || 'Sem categoria'}
                </div>
                <div className="flex -mr-2 -mt-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(temp)}>
                    <Edit className="w-4 h-4"/>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-error hover:bg-error/10" onClick={() => deleteMutation.mutate({ id: temp.id })}>
                    <Trash2 className="w-4 h-4"/>
                  </Button>
                </div>
              </div>
              <h3 className="font-bold text-xl mb-1">{temp.name}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">{temp.description || 'Sem descrição'}</p>
              
              {/* Fake visual preview just for aesthetics in the list */}
              <div className="h-24 bg-muted/30 border border-border/50 rounded-lg p-2 overflow-hidden pointer-events-none mb-4 flex flex-col gap-1">
                <div className="h-4 bg-primary/20 w-1/3 rounded"></div>
                <div className="h-3 bg-muted w-1/2 rounded"></div>
                <div className="h-10 mt-auto bg-card border rounded flex gap-1 p-1">
                  <div className="w-1 bg-blue-500 rounded"></div>
                  <div className="flex-1 space-y-1 py-1">
                    <div className="h-2 bg-muted-foreground w-1/2 rounded"></div>
                    <div className="h-1.5 bg-muted w-3/4 rounded"></div>
                  </div>
                </div>
              </div>

              <Button className="w-full" variant="secondary">
                <LayoutTemplate className="w-4 h-4 mr-2"/>
                Configurar Conteúdo
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center border rounded-xl border-dashed">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">Nenhum template de proposta</h3>
          <Button className="mt-4" onClick={openCreate} variant="outline"><Plus className="w-4 h-4 mr-2"/> Criar Primeiro</Button>
        </div>
      )}
    </div>
  );
}
