import React, { useEffect, useState } from 'react';
import { useCreateStation, useListStations, useUpdateStation, getListStationsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { feedback } from '@/lib/feedback';
import { getApiErrorMessage } from '@/lib/api-error';
import { Building2, Edit, Plus, Save, Trash2, Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ColorPickerField } from '@/components/ui/color-picker-field';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/store/auth';
import { formatPhoneBR, normalizeEmailInput } from '@/lib/masks';
import { PageHeader } from '@/components/responsive/PageHeader';

const schema = z.object({
  name: z.string().min(1, 'Nome da empresa é obrigatório'),
  slogan: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
  logoBase64: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email('E-mail inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  active: z.boolean().optional(),
});

export default function AdminStation() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.accessToken);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [presentationItems, setPresentationItems] = useState<Array<{ highlight: string; description: string }>>([]);

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
      contactPhone: '',
      contactEmail: '',
      address: '',
      city: '',
      active: true,
    },
  });

  const resetForm = () => {
    form.reset({
      name: '',
      slogan: '',
      primaryColor: '#427EFF',
      logoBase64: '',
      contactPhone: '',
      contactEmail: '',
      address: '',
      city: '',
      active: true,
    });
    setLogoPreview(null);
    setPresentationItems([]);
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
      contactPhone: formatPhoneBR(company.contactPhone || ''),
      contactEmail: normalizeEmailInput(company.contactEmail || ''),
      address: company.address || '',
      city: company.city || '',
      active: company.active ?? true,
    });
    setLogoPreview(company.logoBase64 || null);
    setPresentationItems(
      Array.isArray(company.presentationItems)
        ? company.presentationItems
            .slice(0, 4)
            .map((item: any) => ({
              highlight: item.highlight || '',
              description: item.description || '',
            }))
        : [],
    );
    setIsOpen(true);
  };

  const savePresentationItems = async (stationId: string) => {
    const items = presentationItems
      .slice(0, 4)
      .map((item, index) => ({
        highlight: item.highlight.trim(),
        description: item.description.trim(),
        order: index,
      }))
      .filter((item) => item.highlight || item.description);

    if (items.some((item) => !item.highlight || !item.description)) {
      throw new Error('Preencha destaque e descrição em todos os itens da apresentação');
    }

    const response = await fetch(`/api/stations/${stationId}/presentation`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ items }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(payload, 'Erro ao salvar apresentação padrão'));
    }
  };

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      const data = {
        ...values,
        primaryColor: values.primaryColor.toUpperCase(),
      };
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: data as any });
        await savePresentationItems(editingId);
        feedback.updated('Empresa atualizada com sucesso');
      } else {
        const created = await createMutation.mutateAsync({ data: data as any });
        await savePresentationItems((created as any).id);
        feedback.created('Empresa cadastrada com sucesso');
      }
      queryClient.invalidateQueries({ queryKey: getListStationsQueryKey() });
      setIsOpen(false);
    } catch {
      feedback.error('Erro ao salvar empresa');
    }
  };

  const addPresentationItem = () => {
    if (presentationItems.length >= 4) {
      feedback.error('A apresentação permite no máximo 4 itens');
      return;
    }
    setPresentationItems((prev) => [...prev, { highlight: '', description: '' }]);
  };

  const updatePresentationItem = (index: number, field: 'highlight' | 'description', value: string) => {
    setPresentationItems((prev) => {
      const next = [...prev];
      next[index] = { ...(next[index] || { highlight: '', description: '' }), [field]: value };
      return next;
    });
  };

  const removePresentationItem = (index: number) => {
    setPresentationItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const deleteCompany = async (id: string) => {
    try {
      const response = await fetch(`/api/stations/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error('Falha ao desativar');
      feedback.deleted('Empresa desativada');
      queryClient.invalidateQueries({ queryKey: getListStationsQueryKey() });
    } catch {
      feedback.error('Erro ao desativar empresa');
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
      <PageHeader
        title="Empresas"
        description="Cadastre empresas/emissoras que assinam as propostas comerciais."
        action={<Button size="lg" className="w-full sm:w-auto" onClick={openCreate}><Plus className="mr-2 h-5 w-5" /> Nova Empresa</Button>}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                  <FormField control={form.control} name="slogan" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Slogan</FormLabel><FormControl><Input placeholder="Ex: A rádio que conecta sua marca" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="primaryColor" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Cor da proposta *</FormLabel>
                      <FormControl>
                        <ColorPickerField id="primaryColor" value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <FormField control={form.control} name="contactPhone" render={({ field }) => (
                  <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input inputMode="tel" placeholder="(31) 99999-9999" {...field} onChange={(event) => field.onChange(formatPhoneBR(event.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contactEmail" render={({ field }) => (
                  <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="contato@empresa.com.br" {...field} onChange={(event) => field.onChange(normalizeEmailInput(event.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>Endereço</FormLabel><FormControl><Input placeholder="Rua, número, bairro" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input placeholder="Ex: Belo Horizonte" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="active" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border px-4 py-3">
                    <FormLabel className="m-0">Empresa ativa</FormLabel>
                    <FormControl><Switch checked={field.value !== false} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Apresentação padrão</h3>
                    <p className="text-xs text-muted-foreground">
                      Itens usados automaticamente em novas propostas desta empresa.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={addPresentationItem} disabled={presentationItems.length >= 4}>
                    <Plus className="mr-2 h-4 w-4" />
                    Item ({presentationItems.length}/4)
                  </Button>
                </div>

                {presentationItems.length ? (
                  <div className="grid gap-3">
                    {presentationItems.map((item, index) => (
                      <div key={index} className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-[0.8fr_1.5fr_auto]">
                        <Input
                          value={item.highlight}
                          maxLength={40}
                          placeholder="Destaque. Ex: 350 mil"
                          onChange={(event) => updatePresentationItem(index, 'highlight', event.target.value)}
                        />
                        <Input
                          value={item.description}
                          maxLength={140}
                          placeholder="Descrição. Ex: ouvintes por dia"
                          onChange={(event) => updatePresentationItem(index, 'description', event.target.value)}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="w-full md:w-11"
                          onClick={() => removePresentationItem(index)}
                          aria-label="Remover item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Nenhum item cadastrado. Propostas desta empresa não exibirão a seção Apresentação.
                  </div>
                )}

                {presentationItems.length > 0 && (
                  <div className="grid grid-cols-2 overflow-hidden rounded-lg border bg-[#F8FBFF] md:grid-cols-4">
                    {presentationItems.map((item, index) => {
                      const color = index % 2 === 0 ? form.watch('primaryColor') || '#427EFF' : '#727272';
                      return (
                        <div key={`preview-${index}`} className="border-b border-r last:border-r-0 md:border-b-0">
                          <div className="h-1.5" style={{ backgroundColor: color }} />
                          <div className="p-3">
                            <div className="text-lg font-black" style={{ color }}>
                              {item.highlight || '00'}
                            </div>
                            <div className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">
                              {item.description || 'Indicador'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" className="w-full sm:w-auto" disabled={updateMutation.isPending || createMutation.isPending}>
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
                    <p className="text-sm text-muted-foreground truncate">{company.slogan || 'Sem slogan cadastrado'}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{company.contactPhone || company.contactEmail || 'Sem contato cadastrado'}</p>
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
