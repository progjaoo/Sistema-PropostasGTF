import React from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getListAdvertisersQueryKey,
  getListProposalsQueryKey,
  useListProposalCategories,
  useListStations,
} from '@workspace/api-client-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Activity,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  GitBranch,
  Layers,
  PencilLine,
  Search,
  UserRound,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { ProposalProgressTimeline } from '@/components/proposal/ProposalProgressTimeline';
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
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

type TimelineItem = {
  id: string;
  step: string;
  label?: string | null;
  note?: string | null;
  createdByName?: string | null;
  createdAt?: string | null;
};

type ProgressProduct = {
  id: string;
  title: string;
  qty: string;
  airTime?: string | null;
  durationLabel?: string | null;
  seasonality?: string | null;
  programName?: string | null;
};

type ProgressProposal = {
  id: string;
  status: string;
  statusLabel?: string | null;
  viewerCanEdit: boolean;
  advertiserId?: string | null;
  advertiserName: string;
  advertiserStatus?: 'LEAD' | 'CLIENT' | null;
  stationName?: string | null;
  proposalTypeName?: string | null;
  createdByName?: string | null;
  investValue?: string | null;
  updatedAt: string;
  products: ProgressProduct[];
  timeline: TimelineItem[];
};

type ProgressProgram = {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  stationName?: string | null;
  primaryColor?: string | null;
  proposalCount: number;
  proposals: ProgressProposal[];
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'DRAFT', label: 'Rascunhos' },
  { value: 'SENT', label: 'Enviadas' },
  { value: 'APPROVED', label: 'Aceitas' },
  { value: 'REJECTED', label: 'Rejeitadas' },
];

const MANUAL_STEPS = [
  { value: 'IN_CONVERSATION', label: 'Em conversa' },
  { value: 'PROPOSAL_SENT', label: 'Proposta enviada' },
  { value: 'CLIENT_REVIEWING', label: 'Cliente analisando' },
  { value: 'NEGOTIATION', label: 'Negociação' },
];

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

function buildProgressQueryKey(filters: { search: string; stationId: string; programId: string; status: string }) {
  return ['proposal-progress-board', filters];
}

function formatDate(value?: string | null) {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return format(date, "dd MMM yyyy, HH:mm", { locale: ptBR });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'DRAFT':
      return <Badge variant="secondary">Rascunho</Badge>;
    case 'SENT':
      return <Badge className="border-warning/20 bg-warning/10 text-warning hover:bg-warning/10">Enviada</Badge>;
    case 'APPROVED':
      return <Badge className="border-success/20 bg-success/10 text-success hover:bg-success/10">Aceita</Badge>;
    case 'REJECTED':
      return <Badge variant="destructive">Rejeitada</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatInvestment(value?: string | null) {
  if (!value) return 'Sem valor';
  return value;
}

export default function ProposalProgress() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.accessToken);
  const [search, setSearch] = React.useState('');
  const [stationId, setStationId] = React.useState('all');
  const [programId, setProgramId] = React.useState('all');
  const [status, setStatus] = React.useState('all');
  const [selectedProgramId, setSelectedProgramId] = React.useState<string | null>(null);
  const [acceptTarget, setAcceptTarget] = React.useState<ProgressProposal | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<ProgressProposal | null>(null);
  const [stepTarget, setStepTarget] = React.useState<ProgressProposal | null>(null);
  const [manualStep, setManualStep] = React.useState('IN_CONVERSATION');
  const [manualNote, setManualNote] = React.useState('');

  const { data: stations } = useListStations();
  const { data: programsCatalog } = useListProposalCategories();

  const stationOptions = React.useMemo(() => {
    return sortStations(((stations as any[]) || []).filter((item) => item.active !== false));
  }, [stations]);

  const filters = React.useMemo(() => ({ search, stationId, programId, status }), [search, stationId, programId, status]);

  const boardQuery = useQuery({
    queryKey: buildProgressQueryKey(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (stationId !== 'all') params.set('stationId', stationId);
      if (programId !== 'all') params.set('programId', programId);
      if (status !== 'all') params.set('status', status);

      const response = await fetch(`/api/proposals/progress-board?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Erro ao carregar andamento de propostas');
      return payload as { programs: ProgressProgram[] };
    },
    enabled: Boolean(token),
  });

  const invalidateProgress = () => {
    queryClient.invalidateQueries({ queryKey: ['proposal-progress-board'] });
    queryClient.invalidateQueries({ queryKey: ['proposal-program-board'] });
    queryClient.invalidateQueries({ queryKey: [getListProposalsQueryKey()[0]] });
    queryClient.invalidateQueries({ queryKey: [getListAdvertisersQueryKey()[0]] });
  };

  const statusMutation = useMutation({
    mutationFn: async ({ proposalId, nextStatus }: { proposalId: string; nextStatus: 'APPROVED' | 'REJECTED' }) => {
      const response = await fetch(`/api/proposals/${proposalId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Erro ao atualizar status da proposta');
      return payload;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.nextStatus === 'APPROVED' ? 'Proposta aprovada' : 'Proposta rejeitada');
      invalidateProgress();
      setAcceptTarget(null);
      setRejectTarget(null);
    },
    onError: (error: any) => toast.error(error.message || 'Erro ao atualizar status da proposta'),
  });

  const addStepMutation = useMutation({
    mutationFn: async () => {
      if (!stepTarget) throw new Error('Selecione uma proposta');
      const response = await fetch(`/api/proposals/${stepTarget.id}/timeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ step: manualStep, note: manualNote.trim() || null }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Erro ao registrar andamento');
      return payload;
    },
    onSuccess: () => {
      toast.success('Andamento registrado');
      invalidateProgress();
      setManualNote('');
      setManualStep('IN_CONVERSATION');
      setStepTarget(null);
    },
    onError: (error: any) => toast.error(error.message || 'Erro ao registrar andamento'),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-xs font-semibold uppercase text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-primary" />
            Gestão comercial
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Propostas</h1>
          <p className="mt-1 max-w-3xl text-muted-foreground">
            Acompanhe propostas por programa, registre etapas comerciais e gerencie aprovações.
          </p>
        </div>
        <Button size="lg" onClick={() => setLocation('/proposals/new')}>
          <FileText className="h-5 w-5" />
          Nova Proposta
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_220px_220px_190px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por cliente, proposta, produto ou responsável"
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
        <Card className="p-10 text-center text-muted-foreground">Carregando andamento de propostas...</Card>
      ) : boardQuery.isError ? (
        <Card className="p-10 text-center text-error">Erro ao carregar o andamento de propostas.</Card>
      ) : programs.length === 0 ? (
        <Card className="py-16 text-center">
          <GitBranch className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
          <h3 className="text-lg font-medium">Nenhum andamento encontrado</h3>
          <p className="mt-1 text-muted-foreground">Ajuste os filtros ou crie propostas vinculadas a programas.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
          <div className="space-y-3">
            {programs.map((program) => {
              const selected = selectedProgram?.id === program.id;
              return (
                <button
                  key={program.id}
                  type="button"
                  className={cn(
                    'w-full rounded-lg border bg-card p-4 text-left shadow-sm transition-colors',
                    selected ? 'border-primary bg-primary/5' : 'hover:border-primary/40 hover:bg-muted/30',
                  )}
                  onClick={() => setSelectedProgramId(program.id)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-sm font-bold"
                      style={{
                        backgroundColor: `${program.primaryColor || '#427EFF'}18`,
                        color: program.primaryColor || '#427EFF',
                      }}
                    >
                      {program.icon ? <img src={program.icon} alt="" className="h-full w-full rounded-md object-cover" /> : program.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-bold">{program.name}</h2>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {program.proposalCount} proposta(s) em andamento
                      </p>
                      {program.stationName && (
                        <p className="mt-0.5 truncate text-[11px] font-medium text-primary">{program.stationName}</p>
                      )}
                    </div>
                    <Badge variant={selected ? 'default' : 'outline'}>{program.proposalCount}</Badge>
                  </div>
                  {program.description && (
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{program.description}</p>
                  )}
                </button>
              );
            })}
          </div>

          <Card className="min-h-[560px] overflow-hidden">
            {selectedProgram && (
              <div className="p-5">
                <div className="flex flex-col gap-3 border-b pb-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Programa selecionado</p>
                    <h2 className="mt-1 text-2xl font-bold">{selectedProgram.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedProgram.proposalCount} proposta(s) para acompanhamento comercial.
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit">
                    Andamento por proposta
                  </Badge>
                </div>

                <div className="mt-5 space-y-4">
                  {selectedProgram.proposals.length ? selectedProgram.proposals.map((proposal) => {
                    const isApproved = proposal.status === 'APPROVED';
                    const isRejected = proposal.status === 'REJECTED';
                    const canApprove = proposal.viewerCanEdit && !isApproved;
                    const canReject = proposal.viewerCanEdit && !isRejected;

                    return (
                      <div key={proposal.id} className="rounded-lg border bg-background p-4 shadow-sm">
                        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="line-clamp-2 text-xl font-bold leading-tight">{proposal.advertiserName}</h3>
                              {proposal.advertiserStatus === 'LEAD' && <Badge variant="outline">Lead</Badge>}
                              {getStatusBadge(proposal.status)}
                            </div>
                            <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                              <div className="rounded-md bg-muted/30 px-3 py-2">
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                  <FileText className="h-3.5 w-3.5" />
                                  Proposta
                                </span>
                                <p className="mt-1 truncate">{proposal.proposalTypeName || 'Proposta Comercial'}</p>
                              </div>
                              <div className="rounded-md bg-muted/30 px-3 py-2">
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                  <Building2 className="h-3.5 w-3.5" />
                                  Empresa
                                </span>
                                <p className="mt-1 truncate">{proposal.stationName || 'Empresa não informada'}</p>
                              </div>
                              <div className="rounded-md bg-muted/30 px-3 py-2">
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                  <UserRound className="h-3.5 w-3.5" />
                                  Responsável
                                </span>
                                <p className="mt-1 truncate">{proposal.createdByName || 'Não informado'}</p>
                              </div>
                              <div className="rounded-md bg-muted/30 px-3 py-2">
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  Atualização
                                </span>
                                <p className="mt-1 truncate">{formatDate(proposal.updatedAt)}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2 2xl:justify-end">
                            <Button size="sm" variant="outline" onClick={() => setLocation(`/proposals/${proposal.id}/edit`)}>
                              Abrir proposta
                            </Button>
                            {proposal.viewerCanEdit && (
                              <Button size="sm" variant="outline" disabled={isApproved} onClick={() => setStepTarget(proposal)}>
                                <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                                Registrar andamento
                              </Button>
                            )}
                            {canApprove && (
                              <Button
                                size="sm"
                                className="!border-success !bg-success !text-white shadow-sm hover:!bg-success/90 focus-visible:!ring-success"
                                onClick={() => setAcceptTarget(proposal)}
                              >
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                Aprovada
                              </Button>
                            )}
                            {canReject && (
                                <Button size="sm" variant="destructive" onClick={() => setRejectTarget(proposal)}>
                                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                  Rejeitar
                                </Button>
                            )}
                          </div>
                        </div>

                        <div className="mt-4">
                          <ProposalProgressTimeline status={proposal.status} timeline={proposal.timeline} />
                        </div>

                        <div className="mt-4 grid gap-4 border-t pt-4 lg:grid-cols-[1fr_auto]">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Produtos vinculados</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {proposal.products.length ? proposal.products.slice(0, 5).map((product) => (
                                <span key={product.id} className="rounded-md border bg-muted/20 px-2.5 py-1 text-xs">
                                  <span className="font-semibold">{product.qty || '01'}x {product.title}</span>
                                  {product.durationLabel && <span className="ml-1 text-muted-foreground">{product.durationLabel}</span>}
                                  {product.airTime && <span className="ml-1 text-muted-foreground">{product.airTime}</span>}
                                  {product.seasonality && <span className="ml-1 text-muted-foreground">{SEASONALITY_LABELS[product.seasonality] || product.seasonality}</span>}
                                </span>
                              )) : (
                                <span className="text-sm text-muted-foreground">Nenhum produto cadastrado.</span>
                              )}
                              {proposal.products.length > 5 && (
                                <span className="rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                                  +{proposal.products.length - 5}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="rounded-md bg-muted/30 px-4 py-3 text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Investimento</p>
                            <p className="text-lg font-bold">{formatInvestment(proposal.investValue)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="rounded-lg border border-dashed py-12 text-center">
                      <Layers className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                      <h4 className="font-medium">Nenhuma proposta neste programa</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Crie ou filtre propostas vinculadas aos produtos deste programa.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      <Dialog open={Boolean(stepTarget)} onOpenChange={(open) => !open && setStepTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar andamento</DialogTitle>
            <DialogDescription>
              {stepTarget ? `${stepTarget.advertiserName} · ${stepTarget.proposalTypeName || 'Proposta Comercial'}` : 'Informe a próxima etapa comercial.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Etapa</label>
              <Select value={manualStep} onValueChange={setManualStep}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_STEPS.map((step) => (
                    <SelectItem key={step.value} value={step.value}>
                      {step.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Observação interna</label>
              <Textarea
                rows={4}
                maxLength={500}
                value={manualNote}
                onChange={(event) => setManualNote(event.target.value)}
                placeholder="Ex: Cliente pediu revisão do pacote para o próximo mês."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStepTarget(null)}>Cancelar</Button>
            <Button onClick={() => addStepMutation.mutate()} disabled={addStepMutation.isPending}>
              {addStepMutation.isPending ? 'Registrando...' : 'Registrar andamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(acceptTarget)}
        onOpenChange={(open) => !open && setAcceptTarget(null)}
        title="Marcar proposta como aprovada?"
        description={`A proposta de ${acceptTarget?.advertiserName || 'cliente'} será marcada como aprovada. Se o registro ainda for Lead, ele será promovido para Cliente.`}
        actionLabel="Aprovada"
        cancelLabel="Cancelar"
        destructive={false}
        actionClassName="!border-success !bg-success !text-white shadow-sm hover:!bg-success/90 focus-visible:!ring-success"
        onConfirm={() => {
          if (!acceptTarget) return;
          statusMutation.mutate({ proposalId: acceptTarget.id, nextStatus: 'APPROVED' });
        }}
      />

      <ConfirmActionDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title="Rejeitar proposta?"
        description={`A proposta de ${rejectTarget?.advertiserName || 'cliente'} será marcada como rejeitada.`}
        actionLabel="Rejeitar"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (!rejectTarget) return;
          statusMutation.mutate({ proposalId: rejectTarget.id, nextStatus: 'REJECTED' });
        }}
      />
    </div>
  );
}
