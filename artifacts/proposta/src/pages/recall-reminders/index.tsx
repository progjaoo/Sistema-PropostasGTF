import React from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BellRing,
  Building2,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Search,
  Target,
  UserRound,
} from 'lucide-react';
import { feedback } from '@/lib/feedback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/responsive/PageHeader';
import { ResponsiveFilters } from '@/components/responsive/ResponsiveFilters';
import { useAuthStore } from '@/store/auth';
import {
  completeRecallReminder,
  fetchRecallReminders,
  formatDate,
  formatDateTime,
  snoozeRecallReminder,
  type RecallReminder,
} from '@/lib/recall-reminders';
import { cn } from '@/lib/utils';

type StationOption = {
  id: string;
  name: string;
};

type UserOption = {
  id: string;
  name: string;
  role: string;
  active: boolean;
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Vencidos' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'NOTIFIED', label: 'Avisados' },
  { value: 'SNOOZED', label: 'Reagendados' },
  { value: 'DONE', label: 'Tratados' },
  { value: 'CANCELLED', label: 'Cancelados' },
];

const MILESTONE_OPTIONS = [
  { value: 'all', label: 'Todos os marcos' },
  { value: '3', label: '3 meses' },
  { value: '6', label: '6 meses' },
  { value: '10', label: '10 meses' },
];

const SNOOZE_OPTIONS = [
  { value: '7', label: '7 dias' },
  { value: '15', label: '15 dias' },
  { value: '30', label: '30 dias' },
];

function authHeaders() {
  const token = useAuthStore.getState().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

async function fetchStations() {
  const response = await fetch('/api/stations', { headers: authHeaders() });
  if (!response.ok) throw new Error('Nao foi possivel carregar empresas.');
  return response.json() as Promise<StationOption[]>;
}

async function fetchUsers() {
  const response = await fetch('/api/users', { headers: authHeaders() });
  if (!response.ok) throw new Error('Nao foi possivel carregar usuarios.');
  return response.json() as Promise<UserOption[]>;
}

function statusBadge(reminder: RecallReminder) {
  if (reminder.status === 'DONE') {
    return <Badge className="bg-success/10 text-success hover:bg-success/10">Tratado</Badge>;
  }
  if (reminder.status === 'SNOOZED') {
    return <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Reagendado</Badge>;
  }
  if (reminder.status === 'CANCELLED') {
    return <Badge variant="secondary">Cancelado</Badge>;
  }
  return <Badge className="bg-warning/10 text-warning hover:bg-warning/10">{reminder.statusLabel}</Badge>;
}

function leadBadge(reminder: RecallReminder) {
  if (!reminder.advertiser) return <Badge variant="outline">Sem cliente</Badge>;
  return (
    <Badge variant={reminder.advertiser.status === 'LEAD' ? 'outline' : 'secondary'}>
      {reminder.advertiser.statusLabel}
    </Badge>
  );
}

export default function RecallRemindersPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = React.useState('');
  const [stationId, setStationId] = React.useState('all');
  const [assignedToId, setAssignedToId] = React.useState('all');
  const [milestoneMonths, setMilestoneMonths] = React.useState('all');
  const [status, setStatus] = React.useState('active');
  const [snoozeDaysById, setSnoozeDaysById] = React.useState<Record<string, string>>({});
  const [doneTarget, setDoneTarget] = React.useState<RecallReminder | null>(null);
  const [doneNote, setDoneNote] = React.useState('');

  const remindersQuery = useQuery({
    queryKey: ['recall-reminders', { search, stationId, assignedToId, milestoneMonths, status }],
    queryFn: () =>
      fetchRecallReminders({
        search,
        stationId,
        assignedToId,
        milestoneMonths,
        status,
        includeFuture: status !== 'active',
        limit: 100,
      }),
  });

  const stationsQuery = useQuery({
    queryKey: ['stations', 'recall-reminders'],
    queryFn: fetchStations,
  });

  const usersQuery = useQuery({
    queryKey: ['users', 'recall-reminders'],
    queryFn: fetchUsers,
    enabled: user?.role === 'ADMIN',
  });

  const snoozeMutation = useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => snoozeRecallReminder(id, days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recall-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['recall-reminders-count'] });
      feedback.updated('Aviso reagendado');
    },
    onError: (error: Error) => feedback.error(error.message),
  });

  const doneMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => completeRecallReminder(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recall-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['recall-reminders-count'] });
      setDoneTarget(null);
      setDoneNote('');
      feedback.updated('Aviso marcado como tratado');
    },
    onError: (error: Error) => feedback.error(error.message),
  });

  const reminders = remindersQuery.data?.items ?? [];
  const due = remindersQuery.data?.meta.due ?? 0;
  const activeFilterCount = [
    stationId !== 'all',
    milestoneMonths !== 'all',
    status !== 'active',
    user?.role === 'ADMIN' && assignedToId !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setStationId('all');
    setAssignedToId('all');
    setMilestoneMonths('all');
    setStatus('active');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avisos de Recaptura"
        description="Revise leads e clientes com propostas rejeitadas nos marcos de 3, 6 e 10 meses."
        action={(
          <div className="flex w-full items-center gap-3 rounded-md border bg-card px-4 py-3 sm:w-auto">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-warning/15 text-warning">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{due}</p>
              <p className="text-xs text-muted-foreground">avisos vencidos</p>
            </div>
          </div>
        )}
      />

      <div className="rounded-md border bg-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por lead, cliente, proposta ou responsável"
            className="pl-9"
          />
        </div>
        <ResponsiveFilters
          className="mt-3"
          desktopClassName="lg:grid-cols-4"
          activeCount={activeFilterCount}
          onClear={clearFilters}
        >
          <Select value={stationId} onValueChange={setStationId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as empresas</SelectItem>
              {(stationsQuery.data ?? []).map((station) => (
                <SelectItem key={station.id} value={station.id}>
                  {station.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={milestoneMonths} onValueChange={setMilestoneMonths}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MILESTONE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {user?.role === 'ADMIN' ? (
            <Select value={assignedToId} onValueChange={setAssignedToId}>
              <SelectTrigger>
                <SelectValue placeholder="Responsavel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsaveis</SelectItem>
                {(usersQuery.data ?? []).filter((item) => item.active).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} · {item.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : <div className="hidden lg:block" />}
        </ResponsiveFilters>
      </div>

      {remindersQuery.isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-36 animate-pulse rounded-md border bg-muted/30" />
          ))}
        </div>
      ) : reminders.length === 0 ? (
        <div className="rounded-md border border-dashed bg-card px-6 py-12 text-center">
          <Target className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Nenhum aviso encontrado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando uma proposta rejeitada completar 3, 6 ou 10 meses, ela aparece aqui para recaptura.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {reminders.map((reminder) => {
            const snoozeValue = snoozeDaysById[reminder.id] ?? '15';
            const advertiser = reminder.advertiser;
            return (
              <Card key={reminder.id} className="overflow-hidden p-0">
                <div className={cn('h-1 bg-warning', reminder.status === 'DONE' && 'bg-success', reminder.status === 'SNOOZED' && 'bg-primary')} />
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="break-words text-lg font-semibold sm:text-xl">
                          {advertiser?.name ?? 'Lead sem nome'}
                        </h2>
                        {leadBadge(reminder)}
                        {statusBadge(reminder)}
                        <Badge className="bg-warning/10 text-warning hover:bg-warning/10">
                          {reminder.milestoneMonths} meses
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                        <span className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          {reminder.proposal.propType}
                        </span>
                        <span className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {reminder.station?.name ?? 'Sem empresa'}
                        </span>
                        <span className="flex items-center gap-2">
                          <UserRound className="h-4 w-4" />
                          {reminder.assignedTo?.name ?? 'Sem responsavel'}
                        </span>
                        <span className="flex items-center gap-2">
                          <CalendarClock className="h-4 w-4" />
                          Venceu em {formatDate(reminder.effectiveDueAt)}
                        </span>
                      </div>

                      <div className="grid gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground sm:grid-cols-3">
                        <span>Rejeitada em: <strong className="text-foreground">{formatDateTime(reminder.rejectedAt)}</strong></span>
                        <span>Marco original: <strong className="text-foreground">{formatDate(reminder.dueAt)}</strong></span>
                        <span>Investimento: <strong className="text-foreground">{reminder.proposal.investValue ?? 'Nao informado'}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 xl:w-[420px]">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Button variant="outline" onClick={() => setLocation(`/proposals/${reminder.proposal.id}/edit`)}>
                          <ExternalLink className="h-4 w-4" />
                          Abrir proposta
                        </Button>
                        {advertiser && (
                          <Button
                            variant="outline"
                            onClick={() => setLocation(advertiser.status === 'LEAD' ? `/leads/${advertiser.id}/edit` : `/advertisers/${advertiser.id}/edit`)}
                          >
                            Abrir {advertiser.statusLabel}
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[120px_1fr_1fr]">
                        <Select
                          value={snoozeValue}
                          onValueChange={(days) => setSnoozeDaysById((current) => ({ ...current, [reminder.id]: days }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SNOOZE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="secondary"
                          onClick={() => snoozeMutation.mutate({ id: reminder.id, days: Number(snoozeValue) })}
                          disabled={snoozeMutation.isPending}
                        >
                          <RotateCcw className="h-4 w-4" />
                          Lembrar
                        </Button>
                        <Button onClick={() => setDoneTarget(reminder)}>
                          <CheckCircle2 className="h-4 w-4" />
                          Tratado
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(doneTarget)} onOpenChange={(open) => !open && setDoneTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar aviso como tratado?</DialogTitle>
            <DialogDescription>
              Registre uma observacao opcional para manter o historico da recaptura.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="done-note">Observacao</Label>
            <Textarea
              id="done-note"
              value={doneNote}
              onChange={(event) => setDoneNote(event.target.value)}
              placeholder="Ex: comercial entrou em contato e combinou nova abordagem."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDoneTarget(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => doneTarget && doneMutation.mutate({ id: doneTarget.id, note: doneNote })}
              disabled={doneMutation.isPending}
            >
              Marcar tratado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
