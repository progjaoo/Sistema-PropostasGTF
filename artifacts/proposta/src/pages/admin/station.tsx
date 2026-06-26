import React, { useEffect, useState } from 'react';
import { useListStations, useUpdateStation, useCreateStation, getListStationsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Radio, Upload, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const schema = z.object({
  name: z.string().min(1, 'Nome da emissora é obrigatório'),
  slogan: z.string().optional(),
  logoBase64: z.string().optional(),
});

export default function AdminStation() {
  const queryClient = useQueryClient();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const { data: stations, isLoading } = useListStations({
    query: { queryKey: getListStationsQueryKey() }
  });

  const station = stations?.[0]; // Assuming single station setup

  const createMutation = useCreateStation();
  const updateMutation = useUpdateStation();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', slogan: '', logoBase64: '' },
  });

  useEffect(() => {
    if (station) {
      form.reset({
        name: station.name || '',
        slogan: station.slogan || '',
        logoBase64: station.logoBase64 || '',
      });
      if (station.logoBase64) {
        setLogoPreview(station.logoBase64);
      }
    }
  }, [station, form]);

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      if (station?.id) {
        await updateMutation.mutateAsync({ id: station.id, data: values });
        toast.success('Emissora atualizada com sucesso');
      } else {
        await createMutation.mutateAsync({ data: values });
        toast.success('Emissora cadastrada com sucesso');
      }
      queryClient.invalidateQueries({ queryKey: [getListStationsQueryKey()[0]] });
    } catch (e) {
      toast.error('Erro ao salvar emissora');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
        form.setValue('logoBase64', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Emissora</h1>
        <p className="text-muted-foreground mt-1">Configure os dados da sua rádio para as propostas.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Radio className="w-5 h-5 text-primary" /> Dados Principais</CardTitle>
          <CardDescription>Informações que aparecerão no cabeçalho das propostas PDF</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-full sm:w-1/3">
                  <FormLabel className="mb-2 block">Logo da Emissora</FormLabel>
                  <div className="border-2 border-dashed border-border/60 rounded-xl p-4 flex flex-col items-center justify-center relative bg-muted/30 aspect-square">
                    {logoPreview ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img src={logoPreview} alt="Preview" className="max-w-full max-h-full object-contain" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                          <Button type="button" variant="secondary" size="sm" className="relative cursor-pointer">
                            Alterar Logo
                            <input 
                              type="file" 
                              className="absolute inset-0 opacity-0 cursor-pointer" 
                              accept="image/*"
                              onChange={handleImageUpload}
                            />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center relative">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <span className="text-sm font-medium text-muted-foreground">Fazer upload</span>
                        <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">Recomendado: PNG com fundo transparente</p>
                </div>
                
                <div className="flex-1 space-y-4 w-full">
                  <FormField control={form.control} name="name" render={({field}) => (
                    <FormItem>
                      <FormLabel>Nome da Emissora *</FormLabel>
                      <FormControl><Input placeholder="Ex: Radio 88 FM" {...field}/></FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="slogan" render={({field}) => (
                    <FormItem>
                      <FormLabel>Slogan</FormLabel>
                      <FormControl><Input placeholder="Ex: A rádio que toca você" {...field}/></FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}/>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={updateMutation.isPending || createMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" /> 
                  {(updateMutation.isPending || createMutation.isPending) ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
