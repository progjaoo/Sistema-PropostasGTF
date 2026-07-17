import React from 'react';
import { Clock, Plus } from 'lucide-react';
import { feedback } from '@/lib/feedback';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/auth';

type TimelineItem = {
  id: string;
  step: string;
  label?: string | null;
  note?: string | null;
  createdByName?: string | null;
  createdAt?: string | null;
};

interface ProposalTimelineProps {
  proposalId: string;
  items?: TimelineItem[];
  onAdded?: (item: TimelineItem) => void;
}

const manualSteps = [
  { value: 'IN_CONVERSATION', label: 'Em conversa' },
  { value: 'PROPOSAL_SENT', label: 'Proposta enviada' },
  { value: 'CLIENT_REVIEWING', label: 'Cliente analisando' },
  { value: 'NEGOTIATION', label: 'Negociação' },
];

function formatDate(value?: string | null) {
  if (!value) return 'Agora';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ProposalTimeline({ proposalId, items, onAdded }: ProposalTimelineProps) {
  const token = useAuthStore((state) => state.accessToken);
  const [loadedItems, setLoadedItems] = React.useState<TimelineItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [step, setStep] = React.useState('IN_CONVERSATION');
  const [note, setNote] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const controlledItems = items !== undefined;
  const timelineItems = controlledItems ? items : loadedItems;

  React.useEffect(() => {
    if (controlledItems || !proposalId) return;

    let cancelled = false;
    setLoading(true);
    fetch(`/api/proposals/${proposalId}/timeline`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Erro ao carregar andamento');
        if (!cancelled) setLoadedItems(Array.isArray(payload) ? payload : []);
      })
      .catch((error: any) => {
        if (!cancelled) feedback.error(error.message || 'Erro ao carregar andamento');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [controlledItems, proposalId, token]);

  const orderedItems = React.useMemo(() => {
    return [...timelineItems].sort((a, b) => {
      const aDate = new Date(a.createdAt || '').getTime();
      const bDate = new Date(b.createdAt || '').getTime();
      return aDate - bDate;
    });
  }, [timelineItems]);

  const addEntry = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/proposals/${proposalId}/timeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ step, note: note.trim() || null }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Erro ao registrar etapa');
      onAdded?.(payload);
      if (!controlledItems) {
        setLoadedItems((current) => [...current, payload]);
      }
      setNote('');
      feedback.created('Etapa registrada');
    } catch (error: any) {
      feedback.error(error.message || 'Erro ao registrar etapa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/20 p-3">
        {loading ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            Carregando andamento...
          </div>
        ) : orderedItems.length ? (
          <div className="space-y-3">
            {orderedItems.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1 border-b pb-3 last:border-b-0 last:pb-0">
                  <div className="text-sm font-semibold">{item.label || item.step}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {[formatDate(item.createdAt), item.createdByName].filter(Boolean).join(' · ')}
                  </div>
                  {item.note && (
                    <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{item.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-sm text-muted-foreground">
            Nenhuma etapa registrada ainda.
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Adicionar etapa manual</div>
        <Select value={step} onValueChange={setStep}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {manualSteps.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          rows={3}
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Observação interna sobre esta etapa"
        />
        <Button type="button" className="w-full" disabled={saving} onClick={addEntry}>
          <Plus className="mr-2 h-4 w-4" />
          {saving ? 'Registrando...' : 'Registrar etapa'}
        </Button>
      </div>
    </div>
  );
}
