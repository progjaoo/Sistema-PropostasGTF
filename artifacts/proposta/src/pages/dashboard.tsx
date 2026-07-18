import React from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  type DashboardStats,
  type ProposalSummary,
  useGetDashboardStats,
  useListProposals,
  useListStations,
  useListUsers,
} from '@workspace/api-client-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowRight,
  Building2,
  CheckCircle,
  Clock,
  FileText,
  Plus,
  Search,
  UserRound,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/responsive/PageHeader';
import { ResponsiveFilters } from '@/components/responsive/ResponsiveFilters';

type DashboardStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';

type ProposalTypeOption = {
  id: string;
  name: string;
  active: boolean;
};

const STATUS_CONFIG: Record<DashboardStatus, {
  title: string;
  listTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}> = {
  DRAFT: {
    title: 'Rascunhos',
    listTitle: 'Propostas Rascunho',
    icon: Clock,
    color: 'text-neutral-500',
    bg: 'bg-neutral-100',
  },
  SENT: {
    title: 'Enviadas',
    listTitle: 'Propostas Enviadas',
    icon: ArrowRight,
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  APPROVED: {
    title: 'Aceitas',
    listTitle: 'Propostas Aceitas',
    icon: CheckCircle,
    color: 'text-success',
    bg: 'bg-success/10',
  },
  REJECTED: {
    title: 'Rejeitadas',
    listTitle: 'Propostas Rejeitadas',
    icon: XCircle,
    color: 'text-error',
    bg: 'bg-error/10',
  },
};

const STATUS_ORDER: DashboardStatus[] = ['DRAFT', 'SENT', 'APPROVED', 'REJECTED'];

function buildHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
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
    case 'ARCHIVED':
      return <Badge className="border-neutral-300 bg-neutral-100 text-neutral-700 hover:bg-neutral-100">Arquivada</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getProposalTitle(proposal: ProposalSummary) {
  return proposal.advertiserName || proposal.advertiserTradeName || proposal.clientLine1 || 'Sem cliente';
}

function getProposalType(proposal: ProposalSummary) {
  return proposal.proposalTypeName || proposal.propType || proposal.fromTemplateName || 'Proposta Comercial';
}

function getStatValue(status: DashboardStatus, stats?: DashboardStats) {
  if (!stats) return 0;
  if (status === 'DRAFT') return stats.draft;
  if (status === 'SENT') return stats.sent;
  if (status === 'APPROVED') return stats.approved;
  return stats.rejected;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const token = useAuthStore((state) => state.accessToken);
  const [selectedStatus, setSelectedStatus] = React.useState<DashboardStatus>('DRAFT');
  const [search, setSearch] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);
  const [stationId, setStationId] = React.useState('all');
  const [createdById, setCreatedById] = React.useState('all');
  const [proposalTypeId, setProposalTypeId] = React.useState('all');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');
  const [page, setPage] = React.useState(1);
  const limit = 8;

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: stations } = useListStations();
  const { data: users } = useListUsers();

  const proposalTypesQuery = useQuery({
    queryKey: ['proposal-types', 'dashboard-filter'],
    queryFn: async () => {
      const response = await fetch('/api/proposal-types?active=true', {
        headers: buildHeaders(token),
      });
      if (!response.ok) throw new Error('Erro ao carregar tipos de proposta');
      return response.json() as Promise<ProposalTypeOption[]>;
    },
    enabled: Boolean(token),
  });

  const proposalParams = React.useMemo(() => ({
    page,
    limit,
    status: selectedStatus,
    search: deferredSearch.trim() || undefined,
    stationId: stationId === 'all' ? undefined : stationId,
    createdById: createdById === 'all' ? undefined : createdById,
    proposalTypeId: proposalTypeId === 'all' ? undefined : proposalTypeId,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sortBy: 'updatedAt' as const,
    sortDir,
  }), [createdById, dateFrom, dateTo, deferredSearch, page, proposalTypeId, selectedStatus, sortDir, stationId]);

  const proposalsQuery = useListProposals(proposalParams);
  const proposals = proposalsQuery.data?.data ?? [];
  const total = proposalsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const activeConfig = STATUS_CONFIG[selectedStatus];
  const activeFilterCount = [
    stationId !== 'all',
    createdById !== 'all',
    proposalTypeId !== 'all',
    Boolean(dateFrom),
    Boolean(dateTo),
    sortDir !== 'desc',
  ].filter(Boolean).length;

  const resetPage = React.useCallback(() => setPage(1), []);

  const clearInternalFilters = () => {
    setSearch('');
    setStationId('all');
    setCreatedById('all');
    setProposalTypeId('all');
    setDateFrom('');
    setDateTo('');
    setSortDir('desc');
    setPage(1);
  };

  const selectStatus = (status: DashboardStatus) => {
    setSelectedStatus(status);
    setPage(1);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Dashboard"
        description="Visão geral e gestão rápida das propostas por status."
        action={(
          <Button onClick={() => setLocation('/proposals/new')} size="lg" className="w-full shadow-sm sm:w-auto">
          <Plus className="mr-2 h-5 w-5" />
          Nova Proposta
          </Button>
        )}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {STATUS_ORDER.map((status) => {
          const config = STATUS_CONFIG[status];
          const Icon = config.icon;
          const selected = selectedStatus === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => selectStatus(status)}
              className={cn(
                'rounded-lg text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                selected ? 'ring-2 ring-primary ring-offset-2' : 'sm:hover:-translate-y-0.5 sm:hover:shadow-md',
              )}
              aria-pressed={selected}
            >
              <Card className={cn('border-border/60 shadow-sm', selected && 'border-primary bg-primary/5')}>
                <CardContent className="flex min-h-32 flex-col items-center justify-center p-3 text-center sm:p-4">
                  <div className={cn('mb-2 flex h-9 w-9 items-center justify-center rounded-full sm:mb-3 sm:h-10 sm:w-10', config.bg, config.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">{config.title}</p>
                  <h3 className="mt-1 text-xl font-bold sm:text-2xl">{statsLoading ? '-' : getStatValue(status, stats)}</h3>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-lg">{activeConfig.listTitle}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {proposalsQuery.isLoading ? 'Carregando propostas...' : `${total} proposta(s) encontradas neste filtro.`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button variant="outline" size="sm" onClick={clearInternalFilters}>
                Limpar filtros
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setLocation('/proposals')}>
                Ir para Propostas <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por cliente, tipo, empresa, responsável ou produto"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetPage();
                }}
              />
            </div>
            <ResponsiveFilters
              activeCount={activeFilterCount}
              onClear={clearInternalFilters}
              desktopClassName="lg:grid-cols-3 xl:grid-cols-6"
            >
              <Select value={stationId} onValueChange={(value) => { setStationId(value); resetPage(); }}>
                <SelectTrigger><SelectValue placeholder="Empresa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas empresas</SelectItem>
                  {(stations ?? []).map((station: any) => (
                    <SelectItem key={station.id} value={station.id}>{station.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={createdById} onValueChange={(value) => { setCreatedById(value); resetPage(); }}>
                <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos responsáveis</SelectItem>
                  {(users ?? []).filter((user: any) => user.active !== false).map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={proposalTypeId} onValueChange={(value) => { setProposalTypeId(value); resetPage(); }}>
                <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {(proposalTypesQuery.data ?? []).map((type) => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  resetPage();
                }}
                aria-label="Data inicial"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  resetPage();
                }}
                aria-label="Data final"
              />
              <Select value={sortDir} onValueChange={(value: 'asc' | 'desc') => { setSortDir(value); resetPage(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Mais recentes</SelectItem>
                  <SelectItem value="asc">Mais antigas</SelectItem>
                </SelectContent>
              </Select>
            </ResponsiveFilters>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {proposalsQuery.isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Carregando propostas...</div>
          ) : proposals.length > 0 ? (
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <ProposalDashboardRow
                  key={proposal.id}
                  proposal={proposal}
                  onOpen={() => setLocation(`/proposals/${proposal.id}/edit`)}
                />
              ))}

              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Página {page} de {totalPages} · {total} proposta(s)
                </p>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
              Nenhuma proposta encontrada para este filtro.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProposalDashboardRow({ proposal, onOpen }: { proposal: ProposalSummary; onOpen: () => void }) {
  return (
    <div
      className="rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/40 sm:p-4"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr_auto] lg:items-center">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h4 className="line-clamp-2 text-base font-semibold sm:truncate">{getProposalTitle(proposal)}</h4>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground sm:truncate">{getProposalType(proposal)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground lg:grid-cols-1">
          <span className="flex min-w-0 items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{proposal.stationName || 'Empresa não informada'}</span>
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <UserRound className="h-4 w-4 shrink-0" />
            <span className="truncate">{proposal.createdByName || 'Responsável não informado'}</span>
          </span>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Atualizado em</p>
          <p className="font-medium text-foreground">{formatDate(proposal.updatedAt)}</p>
        </div>

        <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:gap-3 lg:justify-end">
          {getStatusBadge(proposal.status)}
          {proposal.investValue && <span className="text-sm font-bold">{proposal.investValue}</span>}
          <Button
            size="sm"
            variant="outline"
            className="col-span-2 w-full sm:w-auto"
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
          >
            Abrir
          </Button>
        </div>
      </div>
    </div>
  );
}
