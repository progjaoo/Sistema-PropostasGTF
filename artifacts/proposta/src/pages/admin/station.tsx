import React, { useEffect, useState } from 'react';
import { useCreateStation, useListStations, useUpdateStation, getListStationsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Edit, Plus, Save, Trash2, Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuthStore } from '@/store/auth';
import { formatCpfCnpj, formatPhoneBR, formatUf, normalizeEmailInput } from '@/lib/masks';

const schema = z.object({
  name: z.string().min(1, 'Nome da empresa é obrigatório'),
  slogan: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
  logoBase64: z.string().optional(),
  cnpj: z.string().optional(),
  tradeName: z.string().optional(),
  legalName: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email('E-mail inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
});

export default function AdminStation() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.accessToken);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const { data: stations, isLoading } = useListStations();
  const createMutation = useCreateStation();
  const updateMutation = useUpdateStation();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slogan: '',
      primaryColor: '#427EFF',
      logoBase64: '',
      cnpj: '',
      tradeName: '',
      legalName: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      address: '',
      city: '',
      state: '',
      website: '',
      notes: '',
      active: true,
    },
  });

  const resetForm = () => {
    form.reset({
      name: '',
      slogan: '',
      primaryColor: '#427EFF',
      logoBase64: '',
      cnpj: '',
      tradeName: '',
      legalName: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      address: '',
      city: '',
      state: '',
      website: '',
      notes: '',
      active: true,
    });
    setLogoPreview(null);
  };

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setIsOpen(true);
  };

  const openEdit = (company: any) => {
    setEditingId(company.id);
    form.reset({
      name: company.name || '',
      slogan: company.slogan || '',
      primaryColor: company.primaryColor || '#427EFF',
      logoBase64: company.logoBase64 || '',
      cnpj: formatCpfCnpj(company.cnpj || ''),
      tradeName: company.tradeName || '',
      legalName: company.legalName || '',
      contactName: company.contactName || '',
      contactPhone: formatPhoneBR(company.contactPhone || ''),
      contactEmail: normalizeEmailInput(company.contactEmail || ''),
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      website: company.website || '',
      notes: company.notes || '',
      active: company.active ?? true,
    });
    setLogoPreview(company.logoBase64 || null);
    setIsOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: values as any });
        toast.success('Empresa atualizada com sucesso');
      } else {
        await createMutation.mutateAsync({ data: values as any });
        toast.success('Empresa cadastrada com sucesso');
      }
      queryClient.invalidateQueries({ queryKey: getListStationsQueryKey() });
      setIsOpen(false);
    } catch {
      toast.error('Erro ao salvar empresa');
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      const response = await fetch(`/api/stations/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error('Falha ao desativar');
      toast.success('Empresa desativada');
      queryClient.invalidateQueries({ queryKey: getListStationsQueryKey() });
    } catch {
      toast.error('Erro ao desativar empresa');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);
      form.setValue('logoBase64', base64);
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empresas</h1>
          <p className="text-muted-foreground mt-1">Cadastre empresas/emissoras que assinam as propostas comerciais.</p>
        </div>
        <Button size="lg" onClick={openCreate}><Plus className="w-5 h-5 mr-2" /> Nova Empresa</Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Empresa' : 'Cadastrar Empresa'}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
                <div>
                  <p className="text-sm font-medium mb-2 leading-none">Foto / Logo</p>
                  <div className="border-2 border-dashed border-border/60 rounded-xl p-4 flex flex-col items-center justify-center relative bg-muted/30 aspect-square">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Preview" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <span className="text-sm font-medium text-muted-foreground">Fazer upload</span>
                      </div>
                    )}
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImageUpload} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Nome principal *</FormLabel><FormControl><Input placeholder="Ex: Rádio 88 FM" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="tradeName" render={({ field }) => (
                    <FormItem><FormLabel>Nome fantasia</FormLabel><FormControl><Input placeholder="Ex: 88 FM" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="legalName" render={({ field }) => (
                    <FormItem><FormLabel>Razão social</FormLabel><FormControl><Input placeholder="Ex: Rádio 88 FM Ltda." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="cnpj" render={({ field }) => (
                    <FormItem><FormLabel>CNPJ</FormLabel><FormControl><Input inputMode="numeric" placeholder="00.000.000/0000-00" {...field} onChange={(event) => field.onChange(formatCpfCnpj(event.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="slogan" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Slogan</FormLabel><FormControl><Input placeholder="Ex: A rádio que conecta sua marca" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="primaryColor" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Cor padrão da proposta</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3">
                          <span className="h-9 w-9 rounded-md border" style={{ backgroundColor: field.value || '#427EFF' }} />
                          <Input placeholder="#427EFF" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                <FormField control={form.control} name="contactName" render={({ field }) => (
                  <FormItem><FormLabel>Contato</FormLabel><FormControl><Input placeholder="Nome do contato" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contactPhone" render={({ field }) => (
                  <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input inputMode="tel" placeholder="(31) 99999-9999" {...field} onChange={(event) => field.onChange(formatPhoneBR(event.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contactEmail" render={({ field }) => (
                  <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="contato@empresa.com.br" {...field} onChange={(event) => field.onChange(normalizeEmailInput(event.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem className="md:col-span-3"><FormLabel>Endereço</FormLabel><FormControl><Input placeholder="Rua, número, bairro" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input placeholder="Ex: Belo Horizonte" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem><FormLabel>UF</FormLabel><FormControl><Input maxLength={2} placeholder="MG" {...field} onChange={(event) => field.onChange(formatUf(event.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem><FormLabel>Site</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="md:col-span-3"><FormLabel>Dados complementares</FormLabel><FormControl><Textarea rows={3} placeholder="Informações adicionais da empresa, observações comerciais ou dados fiscais relevantes" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={updateMutation.isPending || createMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {(updateMutation.isPending || createMutation.isPending) ? 'Salvando...' : 'Salvar Empresa'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {stations?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {stations.map((company: any) => (
            <Card key={company.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {company.logoBase64 ? <img src={company.logoBase64} alt="" className="w-full h-full object-contain" /> : <Building2 className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">{company.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{company.cnpj || company.slogan || 'Sem CNPJ'}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{company.contactPhone || company.contactEmail || company.city || 'Sem contato complementar'}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-4 w-4 rounded border" style={{ backgroundColor: company.primaryColor || '#427EFF' }} />
                      {company.primaryColor || '#427EFF'}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                  <Button variant="outline" size="sm" onClick={() => openEdit(company)}><Edit className="w-4 h-4 mr-2" /> Editar</Button>
                  <Button variant="ghost" size="sm" className="text-error hover:text-error" onClick={() => setDeleteTarget(company)}><Trash2 className="w-4 h-4 mr-2" /> Desativar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center border rounded-xl border-dashed">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">Nenhuma empresa cadastrada</h3>
          <Button className="mt-4" onClick={openCreate} variant="outline"><Plus className="w-4 h-4 mr-2" /> Criar Primeira</Button>
        </div>
      )}
      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Desativar empresa?"
        description={`Tem certeza que deseja desativar ${deleteTarget?.name || 'esta empresa'}? A empresa deixará de aparecer como ativa no cadastro.`}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteCompany(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
