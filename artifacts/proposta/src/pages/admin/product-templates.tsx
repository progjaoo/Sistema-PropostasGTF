import React, { useState } from 'react';
import { 
  useListProductTemplates, 
  useCreateProductTemplate, 
  useUpdateProductTemplate, 
  useDeleteProductTemplate,
  getListProductTemplatesQueryKey 
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Tag, Edit, Trash2, LayoutGrid } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const schema = z.object({
  name: z.string().min(1, 'Nome de referência é obrigatório'),
  title: z.string().min(1, 'Título é obrigatório'),
  qty: z.string().optional(),
  description: z.string().optional(),
  detail: z.string().optional(),
  program: z.string().optional(),
  tags: z.array(z.string()).optional(),
  color: z.enum(['BLUE', 'YELLOW', 'RED', 'GREEN', 'DARK']),
});

const colorMap = {
  'BLUE': 'bg-blue-500',
  'YELLOW': 'bg-yellow-500',
  'RED': 'bg-red-500',
  'GREEN': 'bg-green-500',
  'DARK': 'bg-gray-700'
};

export default function AdminProductTemplates() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: templates, isLoading } = useListProductTemplates({
    query: { queryKey: getListProductTemplatesQueryKey() }
  });

  const createMutation = useCreateProductTemplate();
  const updateMutation = useUpdateProductTemplate();
  const deleteMutation = useDeleteProductTemplate({
    mutation: {
      onSuccess: () => {
        toast.success('Template excluído');
        queryClient.invalidateQueries({ queryKey: [getListProductTemplatesQueryKey()[0]] });
      }
    }
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', title: '', qty: '1x', description: '', detail: '', program: '', tags: [], color: 'BLUE' },
  });

  const openEdit = (template: any) => {
    setEditingId(template.id);
    form.reset({
      name: template.name,
      title: template.title,
      qty: template.qty || '',
      description: template.description || '',
      detail: template.detail || '',
      program: template.program || '',
      tags: template.tags || [],
      color: template.color || 'BLUE',
    });
    setIsOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    form.reset({ name: '', title: '', qty: '1x', description: '', detail: '', program: '', tags: [], color: 'BLUE' });
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
      queryClient.invalidateQueries({ queryKey: [getListProductTemplatesQueryKey()[0]] });
      setIsOpen(false);
    } catch (e) {
      toast.error('Erro ao salvar template');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates de Produto</h1>
          <p className="text-muted-foreground mt-1">Itens padronizados para compor o Plano de Ações.</p>
        </div>
        <Button size="lg" onClick={openCreate}><Plus className="w-5 h-5 mr-2"/> Novo Template</Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Template' : 'Criar Template'}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({field}) => (
                  <FormItem><FormLabel>Nome Interno (Ref)</FormLabel><FormControl><Input placeholder="Ex: Spot 30s Padrão" {...field}/></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="color" render={({field}) => (
                  <FormItem>
                    <FormLabel>Cor do Destaque</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BLUE">Azul</SelectItem>
                        <SelectItem value="YELLOW">Amarelo</SelectItem>
                        <SelectItem value="RED">Vermelho</SelectItem>
                        <SelectItem value="GREEN">Verde</SelectItem>
                        <SelectItem value="DARK">Escuro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage/>
                  </FormItem>
                )}/>
              </div>

              <div className="grid grid-cols-12 gap-4 border-t pt-4">
                <div className="col-span-3">
                  <FormField control={form.control} name="qty" render={({field}) => (
                    <FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input placeholder="Ex: 50x" {...field}/></FormControl><FormMessage/></FormItem>
                  )}/>
                </div>
                <div className="col-span-9">
                  <FormField control={form.control} name="title" render={({field}) => (
                    <FormItem><FormLabel>Título na Proposta</FormLabel><FormControl><Input placeholder="Ex: Spot Comercial 30s" {...field}/></FormControl><FormMessage/></FormItem>
                  )}/>
                </div>
              </div>

              <FormField control={form.control} name="program" render={({field}) => (
                <FormItem><FormLabel>Programa/Horário (Opcional)</FormLabel><FormControl><Input placeholder="Ex: Rotativo Comercial (06h - 19h)" {...field}/></FormControl><FormMessage/></FormItem>
              )}/>
              
              <FormField control={form.control} name="description" render={({field}) => (
                <FormItem><FormLabel>Descrição principal</FormLabel><FormControl><Textarea rows={2} {...field}/></FormControl><FormMessage/></FormItem>
              )}/>

              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>Salvar Template</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Carregando...</div>
      ) : templates?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(temp => (
            <Card key={temp.id} className="relative overflow-hidden flex flex-col">
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${colorMap[temp.color]}`} />
              <div className="p-4 pl-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">{temp.name}</div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-2"><LayoutGrid className="w-4 h-4"/></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(temp)}><Edit className="w-4 h-4 mr-2"/> Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-error" onClick={() => deleteMutation.mutate({ id: temp.id })}><Trash2 className="w-4 h-4 mr-2"/> Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                  <span className="text-sm bg-neutral-100 px-1.5 rounded">{temp.qty}</span>
                  {temp.title}
                </h3>
                {temp.program && <p className="text-xs text-muted-foreground mb-2 font-medium">{temp.program}</p>}
                <p className="text-sm text-neutral-600 line-clamp-2">{temp.description}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center border rounded-xl border-dashed">
          <Tag className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">Nenhum template de produto</h3>
          <Button className="mt-4" onClick={openCreate} variant="outline"><Plus className="w-4 h-4 mr-2"/> Criar Primeiro</Button>
        </div>
      )}
    </div>
  );
}
