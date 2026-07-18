import React from 'react';
import { CheckCircle2, Circle, XCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

type TimelineItem = {
  id: string;
  step: string;
  label?: string | null;
  note?: string | null;
  createdByName?: string | null;
  createdAt?: string | null;
};

type ProposalProgressTimelineProps = {
  status: string;
  timeline?: TimelineItem[];
  compact?: boolean;
};

const BASE_STEPS = [
  { key: 'LEAD_CREATED', label: 'Lead criado' },
  { key: 'IN_CONVERSATION', label: 'Em conversa' },
  { key: 'PROPOSAL_SENT', label: 'Proposta enviada' },
  { key: 'CLIENT_REVIEWING', label: 'Cliente analisando' },
  { key: 'NEGOTIATION', label: 'Negociação' },
];

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function getFinalStep(status: string, entries: TimelineItem[]) {
  const rejected = status === 'REJECTED' || entries.some((item) => item.step === 'REJECTED');
  const accepted = status === 'APPROVED' || entries.some((item) => item.step === 'APPROVED');

  if (rejected) return { key: 'REJECTED', label: 'Rejeitada', final: true };
  if (accepted) return { key: 'APPROVED', label: 'Aceita', final: true };
  return { key: 'FINAL', label: 'Aceite', final: true };
}

export function ProposalProgressTimeline({ status, timeline = [], compact = false }: ProposalProgressTimelineProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const orderedItems = React.useMemo(() => {
    return [...timeline].sort((a, b) => {
      const aDate = new Date(a.createdAt || '').getTime();
      const bDate = new Date(b.createdAt || '').getTime();
      return aDate - bDate;
    });
  }, [timeline]);

  const steps = React.useMemo(() => [...BASE_STEPS, getFinalStep(status, orderedItems)], [orderedItems, status]);
  const itemByStep = React.useMemo(() => {
    return orderedItems.reduce<Record<string, TimelineItem>>((acc, item) => {
      acc[item.step] = item;
      return acc;
    }, {});
  }, [orderedItems]);

  const finalStepKey = status === 'REJECTED' ? 'REJECTED' : status === 'APPROVED' ? 'APPROVED' : 'FINAL';
  const completedKeys = new Set(orderedItems.map((item) => item.step));
  if (status === 'APPROVED') completedKeys.add('APPROVED');
  if (status === 'REJECTED') completedKeys.add('REJECTED');

  const activeIndex = steps.reduce((lastIndex, step, index) => {
    if (completedKeys.has(step.key)) return index;
    return lastIndex;
  }, -1);
  const latestItem = [...orderedItems].reverse()[0];

  React.useEffect(() => {
    const currentStep = scrollContainerRef.current?.querySelector<HTMLElement>('[data-current="true"]');
    currentStep?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeIndex, status]);

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-medium text-muted-foreground sm:hidden">
        Arraste para acompanhar as próximas etapas.
      </p>
      <div
        ref={scrollContainerRef}
        className="touch-pan-x snap-x snap-mandatory overflow-x-auto overscroll-x-contain pb-2"
        aria-label="Etapas do andamento da proposta"
      >
        <div className={cn('grid min-w-[680px] grid-cols-6', compact ? 'gap-2' : 'gap-3')}>
          {steps.map((step, index) => {
            const isFinalStatus = step.key === 'APPROVED' || step.key === 'REJECTED';
            const isCompleted = completedKeys.has(step.key) || (step.key === finalStepKey && isFinalStatus);
            const isCurrent = index === activeIndex || (activeIndex < 0 && index === 0);
            const isRejected = step.key === 'REJECTED';
            const item = itemByStep[step.key];

            return (
              <div
                key={step.key}
                className="relative min-w-0 snap-start"
                data-current={isCurrent ? 'true' : undefined}
              >
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'absolute left-[26px] right-[-18px] top-4 h-0.5 rounded-full',
                      index < activeIndex ? 'bg-primary' : 'bg-border',
                    )}
                  />
                )}
                <div className="relative z-10 flex flex-col gap-2">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm',
                      isCompleted && !isRejected && 'border-primary bg-primary text-primary-foreground',
                      isRejected && 'border-destructive bg-destructive text-destructive-foreground',
                      !isCompleted && isCurrent && 'border-primary text-primary',
                    )}
                  >
                    {isRejected ? (
                      <XCircle className="h-4 w-4" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 pr-2">
                    <div
                      className={cn(
                        'truncate text-xs font-semibold',
                        isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {step.label}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {formatDate(item?.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {latestItem ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="font-semibold">{latestItem.label || latestItem.step}</span>
            {latestItem.createdByName && <span className="text-muted-foreground">por {latestItem.createdByName}</span>}
            {latestItem.createdAt && <span className="text-muted-foreground">{formatDate(latestItem.createdAt)}</span>}
          </div>
          {latestItem.note && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{latestItem.note}</p>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Nenhuma etapa registrada para esta proposta.
        </div>
      )}
    </div>
  );
}
