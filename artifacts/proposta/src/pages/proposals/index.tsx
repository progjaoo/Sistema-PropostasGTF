import React from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getListProposalsQueryKey,
  useCreateProposal,
  useDeleteProposal,
  useListProposalCategories,
  useListStations,
} from '@workspace/api-client-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Building2,
  CalendarClock,
  ChevronRight,
  FilePlus,
  FileText,
  Layers,
  Plus,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store/auth';

type BoardProduct = {
  id: string;
  title: string;
  description?: string | null;
  stationName?: string | null;
  durationLabel?: string | null;
  suggestedValueMin?: string | null;
};

type BoardProposalProduct = {
  id: string;
  title: string;
  qty: string;
  airTime?: string | null;
  durationLabel?: string | null;
  seasonality?: string | null;
};

type BoardProposal = {
  id: string;
  status: string;
  advertiserName: string;
  stationName?: string | null;
  proposalTypeName?: string | null;
  createdByName?: string | null;
  investValue?: string | null;
  updatedAt: string;
  products: BoardProposalProduct[];
};

type BoardProgram = {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  products: BoardProduct[];
  proposals: BoardProposal[];
};

type ProposalType = {
  id: string;
  name: string;
  active: boolean;
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'DRAFT', label: 'Rascunhos' },
  { value: 'SENT', label: 'Enviadas' },
  { value: 'APPROVED', label: 'Aprovadas' },
  { value: 'REJECTED', label: 'Rejeitadas' },
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviada',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
};

const SEASONALITY_LABELS: Record<string, string> = {
  MONTHLY: 'Mensal',
  SEMIANNUAL: 'Semestral',
  ANNUAL: 'Anual',
};

function sortStations(stations: any[]) {
  return [...stations].sort((a, b) => {
    const aName = String(a.name || '').toLowerCase();
    const bName = String(b.name || '').toLowerCase();
    const aIsRadio88 = aName.includes('radio 88 fm') || aName.includes('rádio 88 fm');
    const bIsRadio88 = bName.includes('radio 88 fm') || bName.includes('rádio 88 fm');

    if (aIsRadio88 && !bIsRadio88) return -1;
    if (!aIsRadio88 && bIsRadio88) return 1;
    return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'DRAFT':
      return <Badge variant="secondary">Rascunho</Badge>;
    case 'SENT':
      return <Badge className="border-warning/20 bg-warning/10 text-warning hover:bg-warning/10">Enviada</Badge>;
    case 'APPROVED':
      return <Badge className="border-success/20 bg-success/10 text-success hover:bg-success/10">Aprovada</Badge>;
    case 'REJECTED':
      return <Badge variant="destructive">Rejeitada</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return format(date, "dd MMM yyyy, HH:mm", { locale: ptBR });
}

function buildBoardQueryKey(filters: { search: string; stationId: string; programId: string; status: string }) {
  return ['proposal-program-board', filters];
}

export default function ProposalsList() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.accessToken);
  const [search, setSearch] = React.useState('');
  const [stationId, setStationId] = React.useState('all');
  const [programId, setProgramId] = React.useState('all');
  const [status, setStatus] = React.useState('all');
  const [selectedProgramId, setSelectedProgramId] = React.useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<BoardProposal | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [newStationId, setNewStationId] = React.useState('');
  const [newProposalTypeId, setNewProposalTypeId] = React.useState<string | null>(null);
  const [proposalTypes, setProposalTypes] = React.useState<ProposalType[]>([]);

  const { data: stations } = useListStations();
  const { data: programsCatalog } = useListProposalCategories();
  const createMutation = useCreateProposal();

  const stationOptions = React.useMemo(() => {
    return sortStations(((stations as any[]) || []).filter((item) => item.active !== false));
  }, [stations]);

  React.useEffect(() => {
    if (!newStationId && stationOptions.length > 0) {
      setNewStationId(stationOptions[0].id);
    }
  }, [newStationId, stationOptions]);

  React.useEffect(() => {
    fetch('/api/proposal-types?active=true', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((response) => response.json())
      .then((payload) => {
        const list = Array.isArray(payload) ? payload : [];
        setProposalTypes(list);
        setNewProposalTypeId((current) => current || list[0]?.id || null);
      })
      .catch(() => undefined);
  }, [token]);

  const filters = React.useMemo(() => ({ search, stationId, programId, status }), [search, stationId, programId, status]);

  const boardQuery = useQuery({
    queryKey: buildBoardQueryKey(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (stationId !== 'all') params.set('stationId', stationId);
      if (programId !== 'all') params.set('programId', programId);
      if (status !== 'all') params.set('status', status);

      const response = await fetch(`/api/proposals/program-board?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Erro ao carregar propostas por programa');
      return payload as { programs: BoardProgram[] };
    },
    enabled: Boolean(token),
  });

  const rejectMutation = useDeleteProposal({
    mutation: {
      onSuccess: () => {
        toast.success('Proposta marcada como rejeitada');
        queryClient.invalidateQueries({ queryKey: ['proposal-program-board'] });
        queryClient.invalidateQueries({ queryKey: [getListProposalsQueryKey()[0]] });
      },
      onError: () => toast.error('Erro ao rejeitar proposta'),
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      const response = await fetch(`/api/proposals/${proposalId}/duplicate`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Erro ao duplicar proposta');
      return payload;
    },
    onSuccess: (proposal) => {
      toast.success('Proposta duplicada');
      queryClient.invalidateQueries({ queryKey: ['proposal-program-board'] });
      setLocation(`/proposals/${proposal.id}/edit`);
    },
    onError: (error: any) => toast.error(error.message || 'Erro ao duplicar proposta'),
  });

  const programs = boardQuery.data?.programs || [];
  const selectedProgram = React.useMemo(() => {
    return programs.find((program) => program.id === selectedProgramId) || programs[0] || null;
  }, [programs, selectedProgramId]);

  React.useEffect(() => {
    if (programs.length === 0) {
      setSelectedProgramId(null);
      return;
    }
    if (!selectedProgramId || !programs.some((program) => program.id === selectedProgramId)) {
      setSelectedProgramId(programs[0].id);
    }
  }, [programs, selectedProgramId]);

  const openCreateDialog = () => {
    setCreateDialogOpen(true);
  };

  const createDraft = async () => {
    if (!newStationId) {
      toast.error('Selecione a empresa da proposta');
      return;
    }

    try {
      const selectedType = proposalTypes.find((type) => type.id === newProposalTypeId);
      const proposal = await createMutation.mutateAsync({
        data: {
          stationId: newStationId,
          proposalTypeId: newProposalTypeId,
          periodicity: 'MONTHLY' as any,
          propType: selectedType?.name || 'Proposta Comercial',
          propMonth: '',
          propYear: '',
        },
      } as any);
      toast.success('Rascunho criado');
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['proposal-program-board'] });
      setLocation(`/proposals/${proposal.id}/edit`);
    } catch {
      toast.error('Erro ao criar proposta');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Propostas</h1>
          <p className="mt-1 text-muted-foreground">
            Navegue por programas, produtos e propostas vinculadas em uma visão única.
          </p>
        </div>
        <Button onClick={openCreateDialog} size="lg">
          <Plus className="h-5 w-5" />
          Nova Proposta
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_220px_220px_190px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por cliente, produto, programa ou tipo de proposta"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={stationId} onValueChange={setStationId}>
            <SelectTrigger>
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as empresas</SelectItem>
              {stationOptions.map((station: any) => (
                <SelectItem key={station.id} value={station.id}>
                  {station.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={programId} onValueChange={setProgramId}>
            <SelectTrigger>
              <SelectValue placeholder="Programa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os programas</SelectItem>
              {((programsCatalog as any[]) || []).map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {boardQuery.isLoading ? (
        <Card className="p-10 text-center text-muted-foreground">Carregando programas e propostas...</Card>
      ) : boardQuery.isError ? (
        <Card className="p-10 text-center text-error">Erro ao carregar a visão de propostas.</Card>
      ) : programs.length === 0 ? (
        <Card className="py-16 text-center">
          <Layers className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
          <h3 className="text-lg font-medium">Nenhum programa encontrado</h3>
          <p className="mt-1 text-muted-foreground">Ajuste os filtros ou cadastre programas e produtos.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.4fr)]">
          <div className="space-y-3">
            {programs.map((program) => {
              const selected = selectedProgram?.id === program.id;
              return (
                <button
                  key={program.id}
                  type="button"
                  className={`w-full rounded-lg border bg-card p-4 text-left shadow-sm transition-colors ${
                    selected ? 'border-primary bg-primary/5' : 'hover:border-primary/40 hover:bg-muted/30'
                  }`}
                  onClick={() => setSelectedProgramId(program.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                          {program.icon ? <img src={program.icon} alt="" className="h-full w-full rounded-md object-cover" /> : program.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-bold">{program.name}</h2>
                          <p className="truncate text-xs text-muted-foreground">
                            {program.products.length} produtos · {program.proposals.length} propostas
                          </p>
                        </div>
                      </div>
                      {program.description && (
                        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{program.description}</p>
                      )}
                    </div>
                    <ChevronRight className={`mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${selected ? 'translate-x-1 text-primary' : ''}`} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {program.products.slice(0, 3).map((product) => (
                      <span key={product.id} className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">
                        {product.title}
                      </span>
                    ))}
                    {program.products.length > 3 && (
                      <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                        +{program.products.length - 3}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <Card className="min-h-[520px] overflow-hidden">
            {selectedProgram ? (
              <div className="grid h-full grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="border-b bg-muted/20 p-5 lg:border-b-0 lg:border-r">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-base font-bold text-primary">
                      {selectedProgram.icon ? <img src={selectedProgram.icon} alt="" className="h-full w-full rounded-md object-cover" /> : selectedProgram.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{selectedProgram.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Produtos disponíveis para montar propostas deste programa.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {selectedProgram.products.length ? selectedProgram.products.map((product) => (
                      <div key={product.id} className="rounded-lg border bg-background p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold">{product.title}</div>
                          {product.durationLabel && (
                            <Badge variant="outline">{product.durationLabel}</Badge>
                          )}
                        </div>
                        {product.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {product.stationName && <span>{product.stationName}</span>}
                          {product.suggestedValueMin && <span className="font-medium text-primary">Sugestão: {product.suggestedValueMin}</span>}
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        Nenhum produto vinculado a este programa.
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold">Propostas vinculadas</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedProgram.proposals.length} proposta(s) com produtos deste programa.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {selectedProgram.proposals.length ? selectedProgram.proposals.map((proposal) => (
                      <div key={proposal.id} className="rounded-lg border bg-background p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => setLocation(`/proposals/${proposal.id}/edit`)}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="truncate text-base font-bold">{proposal.advertiserName}</h4>
                              {getStatusBadge(proposal.status)}
                            </div>
                            <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                              <span className="inline-flex items-center gap-1">
                                <FileText className="h-3.5 w-3.5" />
                                {proposal.proposalTypeName || 'Proposta Comercial'}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                {proposal.stationName || 'Empresa não informada'}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <UserRound className="h-3.5 w-3.5" />
                                {proposal.createdByName || 'Responsável não informado'}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <CalendarClock className="h-3.5 w-3.5" />
                                {formatDate(proposal.updatedAt)}
                              </span>
                            </div>
                          </button>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            {proposal.investValue && <div className="text-sm font-bold">{proposal.investValue}</div>}
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => duplicateMutation.mutate(proposal.id)}>
                                Duplicar
                              </Button>
                              <Button size="sm" variant="ghost" className="text-error hover:bg-error/10 hover:text-error" onClick={() => setRejectTarget(proposal)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {proposal.products.length > 0 && (
                          <div className="mt-4 space-y-2 border-t pt-3">
                            {proposal.products.slice(0, 4).map((product) => (
                              <div key={product.id} className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">{product.qty || '01'}x {product.title}</span>
                                {product.durationLabel && <span>{product.durationLabel}</span>}
                                {product.airTime && <span>Horário: {product.airTime}</span>}
                                {product.seasonality && <span>{SEASONALITY_LABELS[product.seasonality] || product.seasonality}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )) : (
                      <div className="rounded-lg border border-dashed py-12 text-center">
                        <FilePlus className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                        <h4 className="font-medium">Nenhuma proposta neste programa</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Crie um rascunho e adicione produtos deste programa no editor.
                        </p>
                        <Button className="mt-4" onClick={openCreateDialog}>
                          <Plus className="h-4 w-4" />
                          Nova Proposta
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova proposta</DialogTitle>
            <DialogDescription>
              Escolha a empresa da veiculação e o tipo inicial. A montagem final acontece no editor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Empresa</label>
              <Select value={newStationId} onValueChange={setNewStationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de proposta</label>
              <Select value={newProposalTypeId || 'custom'} onValueChange={(value) => setNewProposalTypeId(value === 'custom' ? null : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {proposalTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                  <SelectItem value="custom">Proposta Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={createDraft} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar rascunho'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title="Rejeitar proposta?"
        description={`A proposta de ${rejectTarget?.advertiserName || 'cliente'} será marcada como rejeitada.`}
        onConfirm={() => {
          if (!rejectTarget) return;
          rejectMutation.mutate({ id: rejectTarget.id });
          setRejectTarget(null);
        }}
      />
    </div>
  );
}
