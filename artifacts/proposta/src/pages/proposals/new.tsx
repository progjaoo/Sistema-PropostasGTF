import React from 'react';
import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getListProposalsQueryKey,
  useCreateProposal,
  useListStations,
} from '@workspace/api-client-react';
import { ArrowLeft, Building2, FileText, Loader2, Plus } from 'lucide-react';
import { feedback } from '@/lib/feedback';
import { getApiErrorMessage } from '@/lib/api-error';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store/auth';

type StationOption = {
  id: string;
  name: string;
  slogan?: string | null;
  active?: boolean;
  viewerCanCreateProposals?: boolean;
};

type ProposalTypeOption = {
  id: string;
  name: string;
  active: boolean;
};

function buildAuthHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

function sortStations(stations: StationOption[]) {
  return [...stations].sort((a, b) => {
    const aIsRadio88 = /88/.test(a.name || '');
    const bIsRadio88 = /88/.test(b.name || '');
    if (aIsRadio88 && !bIsRadio88) return -1;
    if (!aIsRadio88 && bIsRadio88) return 1;
    return (a.name || '').localeCompare(b.name || '', 'pt-BR');
  });
}

export default function ProposalNew() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const createMutation = useCreateProposal();
  const { data: stations, isLoading: stationsLoading } = useListStations();

  const [stationId, setStationId] = React.useState('');
  const [proposalTypeId, setProposalTypeId] = React.useState('');

  const proposalTypesQuery = useQuery({
    queryKey: ['proposal-types', 'proposal-new'],
    queryFn: async () => {
      const response = await fetch('/api/proposal-types?active=true', {
        headers: buildAuthHeaders(token),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, 'Erro ao carregar tipos de proposta'));
      }
      return Array.isArray(payload) ? (payload as ProposalTypeOption[]) : [];
    },
    enabled: Boolean(token),
  });

  const stationOptions = React.useMemo(() => {
    return sortStations(
      ((stations as StationOption[]) || []).filter(
        (item) => item.active !== false && (user?.role === 'ADMIN' || item.viewerCanCreateProposals !== false),
      ),
    );
  }, [stations, user?.role]);

  const proposalTypes = proposalTypesQuery.data || [];

  React.useEffect(() => {
    if (!stationId && stationOptions.length > 0) {
      setStationId(stationOptions[0].id);
    }
  }, [stationId, stationOptions]);

  React.useEffect(() => {
    if (!proposalTypeId && proposalTypes.length > 0) {
      setProposalTypeId(proposalTypes[0].id);
    }
  }, [proposalTypeId, proposalTypes]);

  const selectedStation = stationOptions.find((station) => station.id === stationId);
  const selectedType = proposalTypes.find((type) => type.id === proposalTypeId);
  const isLoading = stationsLoading || proposalTypesQuery.isLoading;
  const canCreate = Boolean(stationId) && !isLoading && !createMutation.isPending;

  const handleCreateDraft = async () => {
    if (!stationId) {
      feedback.error('Selecione a empresa da proposta');
      return;
    }

    try {
      const proposal = await createMutation.mutateAsync({
        data: {
          stationId,
          proposalTypeId: proposalTypeId || undefined,
          periodicity: 'MONTHLY' as any,
          propType: selectedType?.name || 'Proposta Comercial',
          propMonth: '',
          propYear: '',
        },
      } as any);

      feedback.created('Rascunho de proposta criado');
      queryClient.invalidateQueries({ queryKey: ['proposal-progress-board'] });
      queryClient.invalidateQueries({ queryKey: ['proposal-program-board'] });
      queryClient.invalidateQueries({ queryKey: [getListProposalsQueryKey()[0]] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setLocation(`/proposals/${(proposal as any).id}/edit`);
    } catch (error: any) {
      feedback.error(error?.message || 'Erro ao criar proposta');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button
            variant="ghost"
            className="mb-4 gap-2 px-0 text-muted-foreground hover:bg-transparent"
            onClick={() => setLocation('/proposals')}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para propostas
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Nova Proposta</h1>
          <p className="mt-2 text-muted-foreground">
            Defina a empresa anunciadora e o tipo da proposta para iniciar o rascunho.
          </p>
        </div>

        <Button variant="outline" onClick={() => setLocation('/proposals')}>
          Cancelar
        </Button>
      </div>

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Dados iniciais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {proposalTypesQuery.isError && (
            <Alert variant="destructive">
              <AlertTitle>Tipos de proposta indisponíveis</AlertTitle>
              <AlertDescription>
                A proposta ainda pode ser criada com o tipo padrão “Proposta Comercial”.
              </AlertDescription>
            </Alert>
          )}

          {!stationsLoading && stationOptions.length === 0 && (
            <Alert variant="destructive">
              <AlertTitle>Nenhuma empresa ativa cadastrada</AlertTitle>
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                Cadastre uma empresa antes de criar uma proposta.
                {user?.role === 'ADMIN' && (
                  <Button size="sm" variant="outline" onClick={() => setLocation('/admin/station')}>
                    Abrir empresas
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold" htmlFor="station-select">
                Empresa
              </label>
              <Select value={stationId} onValueChange={setStationId} disabled={stationsLoading || stationOptions.length === 0}>
                <SelectTrigger id="station-select" className="h-12">
                  <SelectValue placeholder={stationsLoading ? 'Carregando empresas...' : 'Selecione a empresa'} />
                </SelectTrigger>
                <SelectContent>
                  {stationOptions.map((station) => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A primeira opção prioriza a Rádio 88 FM quando ela estiver cadastrada.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold" htmlFor="proposal-type-select">
                Tipo de proposta
              </label>
              <Select
                value={proposalTypeId}
                onValueChange={setProposalTypeId}
                disabled={proposalTypesQuery.isLoading || proposalTypes.length === 0}
              >
                <SelectTrigger id="proposal-type-select" className="h-12">
                  <SelectValue placeholder={proposalTypesQuery.isLoading ? 'Carregando tipos...' : 'Proposta Comercial'} />
                </SelectTrigger>
                <SelectContent>
                  {proposalTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Se não houver tipo ativo, o rascunho será criado como Proposta Comercial.
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">{selectedStation?.name || 'Empresa ainda não selecionada'}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedType?.name || 'Proposta Comercial'} será criada como rascunho e aberta no editor para completar cliente,
                  produtos, investimento e PDF.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setLocation('/proposals')}>
              Cancelar
            </Button>
            <Button className="gap-2" disabled={!canCreate} onClick={handleCreateDraft}>
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Criar rascunho
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
