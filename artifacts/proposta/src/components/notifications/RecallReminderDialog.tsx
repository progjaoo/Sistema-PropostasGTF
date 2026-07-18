import React from 'react';
import { useLocation } from 'wouter';
import { CalendarClock, ExternalLink, RotateCcw, Target, UserRoundCheck } from 'lucide-react';
import { feedback } from '@/lib/feedback';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  completeRecallReminder,
  formatDate,
  formatDateTime,
  snoozeRecallReminder,
  type RecallReminder,
} from '@/lib/recall-reminders';

type RecallReminderDialogProps = {
  open: boolean;
  reminders: RecallReminder[];
  onOpenChange: (open: boolean) => void;
};

const queryKeys = {
  list: ['recall-reminders'],
  count: ['recall-reminders-count'],
};

function milestoneLabel(months: number) {
  return `${months} meses`;
}

function invalidateReminders(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.list });
  queryClient.invalidateQueries({ queryKey: queryKeys.count });
}

export function RecallReminderDialog({ open, reminders, onOpenChange }: RecallReminderDialogProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [snoozeDaysById, setSnoozeDaysById] = React.useState<Record<string, string>>({});

  const completeMutation = useMutation({
    mutationFn: (id: string) => completeRecallReminder(id),
    onSuccess: () => {
      invalidateReminders(queryClient);
      feedback.updated('Aviso marcado como tratado');
    },
    onError: (error: Error) => feedback.error(error.message),
  });

  const snoozeMutation = useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => snoozeRecallReminder(id, days),
    onSuccess: () => {
      invalidateReminders(queryClient);
      feedback.updated('Aviso reagendado');
    },
    onError: (error: Error) => feedback.error(error.message),
  });

  const visibleReminders = reminders.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Clientes e leads para recaptura</DialogTitle>
              <DialogDescription>
                Estas propostas foram rejeitadas ha 3, 6 ou 10 meses. Avalie uma nova abordagem comercial.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          {visibleReminders.map((reminder) => {
            const advertiser = reminder.advertiser;
            return (
            <div key={reminder.id} className="rounded-md border bg-card p-3 sm:p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold">{advertiser?.name ?? 'Lead sem nome'}</h3>
                    <Badge className="bg-warning/10 text-warning hover:bg-warning/10">
                      {milestoneLabel(reminder.milestoneMonths)}
                    </Badge>
                    <Badge variant={advertiser?.status === 'LEAD' ? 'outline' : 'secondary'}>
                      {advertiser?.statusLabel ?? 'Sem cliente'}
                    </Badge>
                  </div>
                  <div className="grid gap-1 text-sm text-muted-foreground md:grid-cols-2">
                    <span>{reminder.proposal.propType}</span>
                    <span>{reminder.station?.name ?? 'Empresa nao vinculada'}</span>
                    <span>Rejeitada em {formatDate(reminder.rejectedAt)}</span>
                    <span>Responsavel: {reminder.assignedTo?.name ?? 'Sem responsavel'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="h-4 w-4 text-warning" />
                  Venceu em {formatDateTime(reminder.effectiveDueAt)}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 border-t pt-3 md:flex-row md:items-center md:justify-between">
                <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                  <Button size="sm" className="w-full sm:w-auto" variant="outline" onClick={() => setLocation(`/proposals/${reminder.proposal.id}/edit`)}>
                    <ExternalLink className="h-4 w-4" />
                    Abrir proposta
                  </Button>
                  {advertiser && (
                    <Button
                      size="sm"
                      className="w-full sm:w-auto"
                      variant="outline"
                      onClick={() => setLocation(advertiser.status === 'LEAD' ? `/leads/${advertiser.id}/edit` : `/advertisers/${advertiser.id}/edit`)}
                    >
                      <UserRoundCheck className="h-4 w-4" />
                      Abrir {advertiser.statusLabel}
                    </Button>
                  )}
                </div>

                <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                  <Select
                    value={snoozeDaysById[reminder.id] ?? '15'}
                    onValueChange={(days) => setSnoozeDaysById((current) => ({ ...current, [reminder.id]: days }))}
                  >
                    <SelectTrigger className="w-full text-xs sm:h-8 sm:w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="15">15 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    variant="secondary"
                    onClick={() => snoozeMutation.mutate({ id: reminder.id, days: Number(snoozeDaysById[reminder.id] ?? 15) })}
                    disabled={snoozeMutation.isPending}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Lembrar depois
                  </Button>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => completeMutation.mutate(reminder.id)}
                    disabled={completeMutation.isPending}
                  >
                    Marcar tratado
                  </Button>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar por agora
          </Button>
          <Button onClick={() => setLocation('/recall-reminders')}>
            Ver todos os avisos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
