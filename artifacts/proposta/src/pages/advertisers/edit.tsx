import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGetAdvertiser, useUpdateAdvertiser } from '@workspace/api-client-react';
import { feedback } from '@/lib/feedback';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { formatCpfCnpj, formatPhoneBR, normalizeEmailInput } from '@/lib/masks';

const schema = z.object({
  tradeName: z.string().min(1, 'Nome é obrigatório'),
  cnpj: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  notes: z.string().optional(),
  active: z.boolean(),
});

type AdvertiserFormMode = 'client' | 'lead';

export default function AdvertiserEdit({ params, mode = 'client' }: { params: { id: string }; mode?: AdvertiserFormMode }) {
  const [, setLocation] = useLocation();
  const isLead = mode === 'lead';
  const backPath = isLead ? '/leads' : '/advertisers';
  const entityLabel = isLead ? 'Lead' : 'Cliente';
  const { data: advertiser, isLoading } = useGetAdvertiser(params.id);
  const updateMutation = useUpdateAdvertiser();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      tradeName: '',
      cnpj: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      notes: '',
      active: true,
    },
  });

  useEffect(() => {
    if (advertiser) {
      form.reset({
        tradeName: advertiser.tradeName || '',
        cnpj: formatCpfCnpj(advertiser.cnpj || ''),
        contactName: advertiser.contactName || '',
        contactPhone: formatPhoneBR(advertiser.contactPhone || ''),
        contactEmail: normalizeEmailInput(advertiser.contactEmail || ''),
        notes: advertiser.notes || '',
        active: advertiser.active,
      });
    }
  }, [advertiser, form]);

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      await updateMutation.mutateAsync({ id: params.id, data: values });
      feedback.updated(`${entityLabel} atualizado com sucesso!`);
      setLocation(backPath);
    } catch (error) {
      feedback.error(`Erro ao atualizar ${entityLabel.toLowerCase()}`);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation(backPath)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-normal sm:text-3xl">Editar {entityLabel}</h1>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 w-full">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{entityLabel} Ativo</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="tradeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Supermercado Central" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF/CNPJ</FormLabel>
                      <FormControl>
                        <Input inputMode="numeric" placeholder="00.000.000/0000-00" {...field} onChange={(event) => field.onChange(formatCpfCnpj(event.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-medium mb-4">Contato</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Contato</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do contato" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input inputMode="tel" placeholder="(31) 99999-9999" {...field} onChange={(event) => field.onChange(formatPhoneBR(event.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contato@cliente.com.br" {...field} onChange={(event) => field.onChange(normalizeEmailInput(event.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="border-t pt-6 mt-6">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Informação Interna</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder="Informações internas sobre atendimento, histórico ou preferências comerciais" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 pt-6 sm:flex sm:justify-end">
                <Button variant="outline" className="w-full sm:w-auto" type="button" onClick={() => setLocation(backPath)}>
                  Cancelar
                </Button>
                <Button className="w-full sm:w-auto" type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
