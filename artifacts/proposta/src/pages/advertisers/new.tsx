import React from 'react';
import { useLocation } from 'wouter';
import { useCreateAdvertiser } from '@workspace/api-client-react';
import { feedback } from '@/lib/feedback';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
});

type AdvertiserFormMode = 'client' | 'lead';

interface AdvertiserNewProps {
  mode?: AdvertiserFormMode;
}

export default function AdvertiserNew({ mode = 'client' }: AdvertiserNewProps) {
  const [, setLocation] = useLocation();
  const isLead = mode === 'lead';
  const backPath = isLead ? '/leads' : '/advertisers';
  const entityLabel = isLead ? 'Lead' : 'Cliente';
  const createMutation = useCreateAdvertiser();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      tradeName: '',
      cnpj: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      notes: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      await createMutation.mutateAsync({ data: { ...values, status: isLead ? 'LEAD' : 'CLIENT' } });
      feedback.created(`${entityLabel} criado com sucesso!`);
      setLocation(backPath);
    } catch (error) {
      feedback.error(`Erro ao criar ${entityLabel.toLowerCase()}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation(backPath)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo {entityLabel}</h1>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

              <div className="flex justify-end gap-3 pt-6">
                <Button variant="outline" type="button" onClick={() => setLocation(backPath)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Salvando...' : `Salvar ${entityLabel}`}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
