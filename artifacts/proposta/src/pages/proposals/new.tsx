import React from 'react';
import { useLocation } from 'wouter';
import {
  useCreateProposal,
  useListProposalCategories,
  useListStations,
} from '@workspace/api-client-react';
import { toast } from 'sonner';
import { ArrowLeft, Building2, FilePlus, Layers } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store/auth';

export default function ProposalNew() {
  const [, setLocation] = useLocation();
  const token = useAuthStore((state) => state.accessToken);
  const { data: programs, isLoading } = useListProposalCategories();
  const { data: stations, isLoading: isLoadingStations } = useListStations();
  const createMutation = useCreateProposal();
  const [proposalTypeId, setProposalTypeId] = React.useState<string | null>(null);
  const [stationId, setStationId] = React.useState<string>('');

  React.useEffect(() => {
    fetch('/api/proposal-types?active=true', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((response) => response.json())
      .then((payload) => {
        const first = Array.isArray(payload) ? payload[0] : null;
        setProposalTypeId(first?.id ?? null);
      })
      .catch(() => undefined);
  }, [token]);

  const stationOptions = React.useMemo(() => {
    const list = ((stations as any[]) || []).filter((station) => station.active !== false);
    return [...list].sort((a, b) => {
      const aIsRadio88 = String(a.name || '').toLowerCase().includes('radio 88 fm') || String(a.name || '').toLowerCase().includes('rádio 88 fm');
      const bIsRadio88 = String(b.name || '').toLowerCase().includes('radio 88 fm') || String(b.name || '').toLowerCase().includes('rádio 88 fm');
      if (aIsRadio88 && !bIsRadio88) return -1;
      if (!aIsRadio88 && bIsRadio88) return 1;
      return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
    });
  }, [stations]);

  React.useEffect(() => {
    if (stationId || stationOptions.length === 0) return;

    setStationId(stationOptions[0].id);
  }, [stationId, stationOptions]);

  const handleCreateBlank = async () => {
    if (!stationId) {
      toast.error('Selecione a empresa da proposta');
      return;
    }

    try {
      const prop = await createMutation.mutateAsync({
        data: {
          stationId,
          proposalTypeId,
          periodicity: 'MONTHLY' as any,
          propType: 'Proposta Comercial',
          propMonth: '',
          propYear: '',
        },
      } as any);
      toast.success('Rascunho criado!');
      setLocation(`/proposals/${prop.id}/edit`);
    } catch {
      toast.error('Erro ao criar proposta');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/proposals')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nova Proposta</h1>
            <p className="text-muted-foreground mt-1">Crie uma proposta em branco e consulte os programas disponíveis.</p>
          </div>
        </div>
        <Button size="lg" onClick={handleCreateBlank} disabled={createMutation.isPending}>
          <FilePlus className="w-5 h-5 mr-2" />
          Criar Rascunho
        </Button>
      </div>

      <Card className="border-dashed bg-muted/20">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-semibold">Templates de proposta foram removidos</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Programas e produtos servem como catálogo comercial. A composição final da proposta é feita no editor.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold">Empresa da proposta</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Defina em qual empresa os produtos serão anunciados. A primeira opção é Rádio 88 FM.
            </p>
          </div>
          <div className="w-full md:w-80">
            <Select value={stationId} onValueChange={setStationId} disabled={isLoadingStations || stationOptions.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingStations ? 'Carregando empresas...' : 'Selecione a empresa'} />
              </SelectTrigger>
              <SelectContent>
                {stationOptions.map((station: any) => (
                  <SelectItem key={station.id} value={station.id}>
                    {station.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Carregando programas...</div>
      ) : programs?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((program: any) => (
            <Card key={program.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{program.icon || '📄'}</div>
                  <div>
                    <h3 className="font-bold text-lg">{program.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {program.description || 'Programa comercial'}
                    </p>
                  </div>
                </div>
                {program.products?.length ? (
                  <div className="mt-4 space-y-2">
                    {program.products.slice(0, 4).map((product: any) => (
                      <div key={product.id} className="text-sm rounded-md border bg-background px-3 py-2">
                        <div className="font-medium">{product.title}</div>
                        {(product.suggestedValueMin || product.suggestedValueMax) && (
                          <div className="text-xs text-primary mt-1">
                            {product.suggestedValueMin || '0'} a {product.suggestedValueMax || 'sem teto'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-4">Nenhum produto vinculado.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center border rounded-xl border-dashed">
          <Layers className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">Nenhum programa cadastrado</h3>
        </div>
      )}
    </div>
  );
}
