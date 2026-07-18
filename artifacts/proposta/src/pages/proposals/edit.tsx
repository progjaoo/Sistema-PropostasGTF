import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import {
  getListAdvertisersQueryKey,
  getListProductTemplatesQueryKey,
  getListProposalsQueryKey,
  useCreateAdvertiser,
  useGetProposal,
  useListAdvertisers,
  useListProductTemplates,
  useListStations,
  useUpdateProposal,
  useUpdateProposalStatus,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { feedback } from '@/lib/feedback';
import { AlertTriangle, ArrowLeft, Eye, Plus, Printer, Save, Search, SlidersHorizontal, Trash2 } from 'lucide-react';

import { ResponsiveProposalPreview } from '@/components/proposal/ResponsiveProposalPreview';
import { ProposalPrint } from '@/components/proposal/ProposalPrint';
import { ProposalTimeline } from '@/components/proposal/ProposalTimeline';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { formatCurrencyBRL, formatPhoneBR, normalizeEmailInput } from '@/lib/masks';
import { cn } from '@/lib/utils';

const PERIODICITY_LABELS: Record<string, string> = {
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviada',
  APPROVED: 'Aceita',
  REJECTED: 'Rejeitada',
};

const SEASONALITY_LABELS: Record<string, string> = {
  MONTHLY: 'Mensal',
  SEMIANNUAL: 'Semestral',
  ANNUAL: 'Anual',
};

type ProposalType = {
  id: string;
  name: string;
  active: boolean;
};

type AdvertiserDraft = {
  tradeName: string;
  cnpj: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
};

const emptyAdvertiser: AdvertiserDraft = {
  tradeName: '',
  cnpj: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  notes: '',
};

type PrintIntent = 'button' | 'keyboard' | null;

function currencyLikeToNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const normalized = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function formatCurrencyFromNumber(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function getSuggestedUnitValue(product: any) {
  const min = currencyLikeToNumber(product?.suggestedValueMin);
  const max = currencyLikeToNumber(product?.suggestedValueMax);

  if (min !== null) return min;
  if (max !== null) return max;
  return null;
}

function getSuggestedRangeText(product: any) {
  const min = currencyLikeToNumber(product?.suggestedValueMin);
  const max = currencyLikeToNumber(product?.suggestedValueMax);

  if (min !== null) return `Sugerido: ${formatCurrencyFromNumber(min)}`;
  if (max !== null) return `Sugerido: ${formatCurrencyFromNumber(max)}`;
  return null;
}

function parseQty(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return 0;
  const qty = Number(digits);
  return Number.isFinite(qty) ? qty : 0;
}

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

function normalizeStatsForPayload(stats: unknown, keepEmpty = false) {
  if (!Array.isArray(stats)) return [];
  const normalized = stats
    .slice(0, 4)
    .map((item: any) => ({
      num: String(item?.num ?? item?.value ?? item?.title ?? ''),
      suf: String(item?.suf ?? ''),
      desc: String(item?.desc ?? item?.description ?? ''),
    }));
  if (keepEmpty) return normalized;
  return normalized
    .map((item) => ({
      num: item.num.trim(),
      suf: item.suf.trim(),
      desc: item.desc.trim(),
    }))
    .filter((item) => item.num || item.desc);
}

function cleanProposalPayload(data: any) {
  const {
    id,
    station,
    advertiser,
    createdById,
    createdBy,
    createdAt,
    updatedAt,
    status,
    fromTemplateName,
    proposalTypeName,
    timeline,
    ...payload
  } = data;

  return {
    ...payload,
    campTag: null,
    clientLine1: null,
    clientLine2: null,
    bannerBase64: null,
    overlayOpacity: 70,
    showPeriod: data.showPeriod !== false,
    investDesc: data.investDesc || null,
    contactName: data.createdBy?.name ?? null,
    contactRole: data.createdBy?.jobTitle ?? null,
    contactPhone: data.createdBy?.contactPhone ?? null,
    products: (data.products || []).map((product: any, index: number) => ({
      productTemplateId: product.productTemplateId ?? null,
      order: index,
      qty: product.qty || '01',
      title: product.title || 'Produto',
      description: product.description || null,
      detail: product.detail || null,
      program: product.program || null,
      durationLabel: product.durationLabel || null,
      airTime: product.airTime || null,
      seasonality: product.seasonality || null,
      tags: product.tags || [],
      color: product.color || 'BLUE',
    })),
  };
}

export default function ProposalEdit({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const [saveStatus, setSaveStatus] = useState<string>('Salvo');
  const [localData, setLocalData] = useState<any>(null);
  const [proposalTypes, setProposalTypes] = useState<ProposalType[]>([]);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [advertiserSearch, setAdvertiserSearch] = useState('');
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [advertiserDialogOpen, setAdvertiserDialogOpen] = useState(false);
  const [advertiserDraft, setAdvertiserDraft] = useState<AdvertiserDraft>(emptyAdvertiser);
  const [catalogProductSearch, setCatalogProductSearch] = useState('');
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [printIntent, setPrintIntent] = useState<PrintIntent>(null);
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const dirtyRef = useRef(false);
  const initialized = useRef(false);

  const { data: proposal, isLoading } = useGetProposal(params.id);
  const { data: advertisers } = useListAdvertisers({ active: true, search: advertiserSearch || undefined } as any);
  const { data: products } = useListProductTemplates(
    { stationId: localData?.stationId || undefined },
    {
      query: {
        queryKey: getListProductTemplatesQueryKey({ stationId: localData?.stationId || undefined }),
        enabled: Boolean(localData?.stationId),
      },
    },
  );
  const { data: stations } = useListStations();
  const updateMutation = useUpdateProposal();
  const updateStatusMutation = useUpdateProposalStatus();
  const createAdvertiserMutation = useCreateAdvertiser();

  useEffect(() => {
    fetch('/api/proposal-types?active=true', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((response) => response.json())
      .then((payload) => setProposalTypes(Array.isArray(payload) ? payload : []))
      .catch(() => feedback.error('Erro ao carregar tipos de proposta'));
  }, [token]);

  useEffect(() => {
    if (proposal && !initialized.current) {
      setLocalData({
        ...proposal,
        periodicity: (proposal as any).periodicity || 'MONTHLY',
        showPeriod: (proposal as any).showPeriod !== false,
        proposalTypeId: (proposal as any).proposalTypeId || '',
      });
      initialized.current = true;
      dirtyRef.current = false;
    }
  }, [proposal]);

  useEffect(() => {
    if (!localData || !dirtyRef.current) return;

    const timer = setTimeout(() => {
      setSaveStatus('Salvando...');
      updateMutation.mutate(
        { id: params.id, data: cleanProposalPayload(localData) as any },
        {
          onSuccess: (saved: any) => {
            setSaveStatus(`Salvo às ${new Date().toLocaleTimeString()}`);
            dirtyRef.current = false;
            setLocalData((prev: any) => ({ ...prev, ...saved }));
            queryClient.invalidateQueries({ queryKey: [getListProposalsQueryKey()[0]] });
          },
          onError: () => {
            setSaveStatus('Erro ao salvar');
            feedback.error('Erro ao salvar automaticamente');
          },
        },
      );
    }, 2000);

    return () => clearTimeout(timer);
  }, [localData, params.id, queryClient, updateMutation]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const selectedAdvertiser = useMemo(() => {
    const current = (localData as any)?.advertiser;
    const found = (advertisers as any[])?.find((advertiser) => advertiser.id === localData?.advertiserId);
    return found || current || null;
  }, [advertisers, localData]);

  const startProposalPrint = useCallback((intent: Exclude<PrintIntent, null>) => {
    if (!localData) return;
    setPrintIntent(intent);
  }, [localData]);

  const handleProposalPrintReady = useCallback(() => {
    window.print();
    window.setTimeout(() => setPrintIntent(null), 3000);
  }, []);

  useEffect(() => {
    const handleAfterPrint = () => setPrintIntent(null);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  useEffect(() => {
    const handlePrintShortcut = (event: KeyboardEvent) => {
      const isPrintShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p';
      if (!isPrintShortcut) return;
      event.preventDefault();
      startProposalPrint('keyboard');
    };

    window.addEventListener('keydown', handlePrintShortcut);
    return () => window.removeEventListener('keydown', handlePrintShortcut);
  }, [startProposalPrint]);

  const groupedProducts = useMemo(() => {
    const list = ((products as any[]) || []).filter((product) => {
      if (product.active === false) return false;
      if (!localData?.stationId) return true;
      return product.stationId === localData.stationId || product.programStationId === localData.stationId;
    });
    return list.reduce<Record<string, any[]>>((groups, product) => {
      const groupName = product.programName || product.program || 'Sem programa';
      groups[groupName] = [...(groups[groupName] || []), product];
      return groups;
    }, {});
  }, [products, localData?.stationId]);

  const filteredGroupedProducts = useMemo(() => {
    const needle = catalogProductSearch.trim().toLowerCase();
    if (!needle) return groupedProducts;

    return Object.entries(groupedProducts).reduce<Record<string, any[]>>((groups, [program, items]) => {
      const filtered = items.filter((product) => {
        const content = `${product.title || ''} ${product.description || ''} ${product.durationLabel || ''} ${program}`.toLowerCase();
        return content.includes(needle);
      });
      if (filtered.length > 0) groups[program] = filtered;
      return groups;
    }, {});
  }, [catalogProductSearch, groupedProducts]);

  const stationOptions = useMemo(() => {
    return sortStations(
      ((stations as any[]) || []).filter(
        (item) => item.active !== false && (currentUser?.role === 'ADMIN' || item.viewerCanCreateProposals !== false),
      ),
    );
  }, [currentUser?.role, stations]);

  const investmentSuggestion = useMemo(() => {
    const items = (localData?.products || []) as any[];
    return items.reduce(
      (acc, product) => {
        if (!product.productTemplateId) return acc;

        const unitValue = getSuggestedUnitValue(product);
        const qty = parseQty(product.qty);
        if (unitValue === null || qty <= 0) return acc;

        return {
          total: acc.total + unitValue * qty,
          itemCount: acc.itemCount + 1,
        };
      },
      { total: 0, itemCount: 0 },
    );
  }, [localData?.products]);

  const proposalStats = useMemo(() => normalizeStatsForPayload(localData?.stats, true), [localData?.stats]);

  const markDirty = () => {
    dirtyRef.current = true;
    setSaveStatus('Alterações pendentes');
  };

  const handleChange = (field: string, value: any) => {
    markDirty();
    setLocalData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleBack = () => {
    if (!dirtyRef.current) {
      setLocation('/proposals');
      return;
    }

    setLeaveDialogOpen(true);
  };

  const handleManualSave = () => {
    setSaveStatus('Salvando...');
    updateMutation.mutate(
      { id: params.id, data: cleanProposalPayload(localData) as any },
      {
        onSuccess: (saved: any) => {
          dirtyRef.current = false;
          setSaveStatus(`Salvo às ${new Date().toLocaleTimeString()}`);
          setLocalData((prev: any) => ({ ...prev, ...saved }));
          feedback.updated('Proposta salva');
          queryClient.invalidateQueries({ queryKey: [getListProposalsQueryKey()[0]] });
        },
        onError: () => {
          setSaveStatus('Erro ao salvar');
          feedback.error('Erro ao salvar proposta');
        },
      },
    );
  };

  const createProposalType = async () => {
    const name = newTypeName.trim();
    if (!name) {
      feedback.error('Informe o nome do tipo de proposta');
      return;
    }

    try {
      const response = await fetch('/api/proposal-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Erro ao criar tipo');
      setProposalTypes((prev) => [...prev, payload].sort((a, b) => a.name.localeCompare(b.name)));
      handleChange('proposalTypeId', payload.id);
      handleChange('propType', payload.name);
      setNewTypeName('');
      setTypeDialogOpen(false);
      feedback.created('Tipo de proposta criado');
    } catch (error: any) {
      feedback.error(error.message || 'Erro ao criar tipo de proposta');
    }
  };

  const selectAdvertiser = (advertiser: any) => {
    markDirty();
    setLocalData((prev: any) => ({
      ...prev,
      advertiserId: advertiser.id,
      advertiser,
    }));
    setAdvertiserSearch('');
    setClientPickerOpen(false);
  };

  const createAdvertiser = async () => {
    const phoneDigits = advertiserDraft.contactPhone.replace(/\D/g, '');
    if (!advertiserDraft.tradeName.trim()) {
      feedback.error('Informe o nome do lead');
      return;
    }
    if (!advertiserDraft.contactName.trim()) {
      feedback.error('Informe o nome do contato');
      return;
    }
    if (phoneDigits.length < 10) {
      feedback.error('Informe um telefone válido');
      return;
    }

    try {
      const advertiser = await createAdvertiserMutation.mutateAsync({
        data: {
          tradeName: advertiserDraft.tradeName.trim(),
          contactName: advertiserDraft.contactName.trim(),
          contactPhone: advertiserDraft.contactPhone,
          contactEmail: advertiserDraft.contactEmail || undefined,
          notes: advertiserDraft.notes || undefined,
          status: 'LEAD',
        } as any,
      });
      feedback.created('Lead salvo');
      queryClient.invalidateQueries({ queryKey: [getListAdvertisersQueryKey()[0]] });
      setAdvertiserDraft(emptyAdvertiser);
      setAdvertiserDialogOpen(false);
      selectAdvertiser(advertiser as any);
    } catch {
      feedback.error('Erro ao salvar lead');
    }
  };

  const handleStationChange = (nextStationId: string) => {
    const selectedStation = stationOptions.find((item) => item.id === nextStationId);
    const catalogProducts = (localData?.products || []).filter((product: any) => product.productTemplateId);
    markDirty();
    setLocalData((prev: any) => ({
      ...prev,
      stationId: nextStationId,
      station: selectedStation || prev.station,
      products: (prev.products || []).filter((product: any) => !product.productTemplateId),
    }));
    if (catalogProducts.length > 0) {
      feedback.warning('Produtos do catálogo anterior foram removidos porque pertencem a outra empresa.');
    }
  };

  const addBlankProduct = () => {
    markDirty();
    setLocalData((prev: any) => ({
      ...prev,
      products: [
        ...(prev.products || []),
        {
          id: Math.random().toString(36).slice(2),
          productTemplateId: null,
          order: prev.products?.length || 0,
          qty: '01',
          title: 'Produto avulso',
          description: '',
          program: '',
          durationLabel: '',
          airTime: '',
          seasonality: null,
          tags: [],
          color: 'BLUE',
        },
      ],
    }));
  };

  const addCatalogProduct = (productId: string) => {
    const product = ((products as any[]) || []).find((item) => item.id === productId);
    if (!product) {
      feedback.error('Selecione um produto do catálogo');
      return;
    }
    markDirty();
    setLocalData((prev: any) => ({
      ...prev,
      products: [
        ...(prev.products || []),
        {
          id: Math.random().toString(36).slice(2),
          productTemplateId: product.id,
          order: prev.products?.length || 0,
          qty: '01',
          title: product.title,
          description: product.description || '',
          detail: product.detail || '',
          program: product.programName || product.program || '',
          durationLabel: product.durationLabel || product.duration?.label || '',
          airTime: '',
          seasonality: null,
          suggestedValueMin: product.suggestedValueMin || null,
          suggestedValueMax: product.suggestedValueMax || null,
          tags: product.tags || [],
          color: product.color || 'BLUE',
        },
      ],
    }));
    setCatalogProductSearch('');
    feedback.created('Produto do catálogo adicionado');
  };

  const updateProduct = (index: number, field: string, value: any) => {
    markDirty();
    setLocalData((prev: any) => {
      const nextProducts = [...(prev.products || [])];
      nextProducts[index] = { ...nextProducts[index], [field]: value };
      return { ...prev, products: nextProducts };
    });
  };

  const removeProduct = (index: number) => {
    markDirty();
    setLocalData((prev: any) => {
      const nextProducts = [...(prev.products || [])];
      nextProducts.splice(index, 1);
      return { ...prev, products: nextProducts };
    });
  };

  const addStatItem = () => {
    const currentStats = normalizeStatsForPayload(localData?.stats, true);
    if (currentStats.length >= 4) {
      feedback.error('A apresentação permite no máximo 4 itens');
      return;
    }
    handleChange('stats', [...currentStats, { num: '', suf: '', desc: '' }]);
  };

  const updateStatItem = (index: number, field: 'num' | 'desc', value: string) => {
    const currentStats = normalizeStatsForPayload(localData?.stats, true);
    const nextStats = [...currentStats];
    nextStats[index] = {
      ...(nextStats[index] || { num: '', suf: '', desc: '' }),
      [field]: value,
    };
    handleChange('stats', nextStats);
  };

  const removeStatItem = (index: number) => {
    const currentStats = normalizeStatsForPayload(localData?.stats, true);
    handleChange('stats', currentStats.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleStatusChange = (status: any) => {
    updateStatusMutation.mutate(
      { id: params.id, data: { status } },
      {
        onSuccess: (saved: any) => {
          if (status === 'REJECTED') {
            feedback.destructive(`Status atualizado para ${STATUS_LABELS[status] || status}`);
          } else {
            feedback.updated(`Status atualizado para ${STATUS_LABELS[status] || status}`);
          }
          setLocalData((prev: any) => ({ ...prev, ...saved, status }));
          queryClient.invalidateQueries({ queryKey: [getListProposalsQueryKey()[0]] });
          queryClient.invalidateQueries({ queryKey: [getListAdvertisersQueryKey()[0]] });
        },
        onError: () => feedback.error('Erro ao atualizar status'),
      },
    );
  };

  const handlePrint = () => {
    startProposalPrint('button');
  };

  if (isLoading || !localData) {
    return <div className="p-8 text-center text-muted-foreground">Carregando editor...</div>;
  }

  const station = stationOptions.find((item) => item.id === localData.stationId) || localData.station;
  const currentTypeName = proposalTypes.find((type) => type.id === localData.proposalTypeId)?.name || localData.propType;
  const seller = localData.createdBy || null;
  const sellerProfileIncomplete = !seller?.jobTitle || !seller?.contactPhone;
  const suggestedInvestmentText = formatCurrencyFromNumber(investmentSuggestion.total);
  const proposalPrintData = { ...localData, station, advertiser: selectedAdvertiser };

  return (
    <div className="relative -m-4 flex min-h-[calc(100dvh-4.5rem)] flex-col overflow-hidden border-t border-border bg-background sm:-m-6 sm:min-h-[calc(100dvh-5.75rem)] lg:h-[calc(100dvh-3rem)] lg:min-h-0 lg:flex-row">
      {printIntent && <ProposalPrint proposal={proposalPrintData} onReady={handleProposalPrintReady} />}
      <ConfirmActionDialog
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        title="Sair sem salvar?"
        description="Você tem alterações pendentes nesta proposta. Ao sair agora, as últimas mudanças podem ser perdidas."
        onConfirm={() => {
          setLeaveDialogOpen(false);
          setLocation('/proposals');
        }}
      />
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Criar tipo de proposta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input value={newTypeName} onChange={(event) => setNewTypeName(event.target.value)} placeholder="Ex: Pacote Promocional" />
            <Button className="w-full" onClick={createProposalType}>Salvar tipo</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Selecionar cliente ou lead</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={advertiserSearch}
                onChange={(event) => setAdvertiserSearch(event.target.value)}
                placeholder="Buscar por nome, contato ou documento"
                autoFocus
              />
            </div>
            <div className="max-h-[50dvh] overflow-y-auto rounded-lg border sm:max-h-[360px]">
              {(advertisers as any[])?.length ? (advertisers as any[]).slice(0, 12).map((advertiser) => (
                <button
                  key={advertiser.id}
                  type="button"
                  className={`block w-full border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted ${localData.advertiserId === advertiser.id ? 'bg-primary/10 text-primary' : ''}`}
                  onClick={() => selectAdvertiser(advertiser)}
                >
                  <span className="font-semibold">{advertiser.tradeName}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {[advertiser.status === 'LEAD' ? 'Lead' : 'Cliente', advertiser.contactName, advertiser.contactPhone].filter(Boolean).join(' · ')}
                  </span>
                </button>
              )) : (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum cliente ou lead encontrado.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={advertiserDialogOpen} onOpenChange={setAdvertiserDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Novo lead</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input placeholder="Nome *" value={advertiserDraft.tradeName} onChange={(e) => setAdvertiserDraft((prev) => ({ ...prev, tradeName: e.target.value }))} />
            <Input placeholder="Nome do contato *" value={advertiserDraft.contactName} onChange={(e) => setAdvertiserDraft((prev) => ({ ...prev, contactName: e.target.value }))} />
            <Input inputMode="tel" placeholder="Telefone *" value={advertiserDraft.contactPhone} onChange={(e) => setAdvertiserDraft((prev) => ({ ...prev, contactPhone: formatPhoneBR(e.target.value) }))} />
            <Input type="email" placeholder="contato@cliente.com.br" value={advertiserDraft.contactEmail} onChange={(e) => setAdvertiserDraft((prev) => ({ ...prev, contactEmail: normalizeEmailInput(e.target.value) }))} />
            <Textarea className="sm:col-span-2" rows={3} placeholder="Informação interna" value={advertiserDraft.notes} onChange={(e) => setAdvertiserDraft((prev) => ({ ...prev, notes: e.target.value }))} />
          </div>
          <Button className="w-full" disabled={createAdvertiserMutation.isPending} onClick={createAdvertiser}>
            {createAdvertiserMutation.isPending ? 'Salvando...' : 'Salvar lead'}
          </Button>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 gap-1 border-b bg-card p-2 no-print lg:hidden">
        <Button
          type="button"
          variant={mobileView === 'editor' ? 'default' : 'ghost'}
          onClick={() => setMobileView('editor')}
          aria-pressed={mobileView === 'editor'}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Editar
        </Button>
        <Button
          type="button"
          variant={mobileView === 'preview' ? 'default' : 'ghost'}
          onClick={() => setMobileView('preview')}
          aria-pressed={mobileView === 'preview'}
        >
          <Eye className="h-4 w-4" />
          Preview
        </Button>
      </div>

      <div
        className={cn(
          'z-10 min-h-0 w-full flex-1 flex-col border-r border-border bg-card shadow-sm no-print lg:flex lg:h-full lg:w-[420px] lg:flex-none',
          mobileView === 'editor' ? 'flex' : 'hidden',
        )}
      >
        <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-card/95 backdrop-blur z-20">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="font-semibold text-sm">Editor</div>
              <div className="text-[10px] text-muted-foreground">{saveStatus}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <Accordion type="multiple" defaultValue={['empresa', 'proposta', 'cliente', 'produtos']} className="w-full">
            <AccordionItem value="empresa">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">Empresa</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Empresa onde será anunciada</label>
                  <Select
                    value={localData.stationId || ''}
                    onValueChange={handleStationChange}
                    disabled={stationOptions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {stationOptions.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                  <span className="h-8 w-8 rounded-md border" style={{ backgroundColor: station?.primaryColor || '#427EFF' }} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{station?.name || 'Empresa não selecionada'}</div>
                    <div className="text-xs text-muted-foreground">{station?.primaryColor || '#427EFF'}</div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="proposta">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">Proposta</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Tipo de proposta</label>
                  <Select
                    value={localData.proposalTypeId || 'custom'}
                    onValueChange={(value) => {
                      if (value === 'new') {
                        setTypeDialogOpen(true);
                        return;
                      }
                      const selected = proposalTypes.find((type) => type.id === value);
                      handleChange('proposalTypeId', value === 'custom' ? null : value);
                      handleChange('propType', selected?.name || localData.propType || 'Proposta Comercial');
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {proposalTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                      <SelectItem value="custom">{currentTypeName || 'Tipo livre atual'}</SelectItem>
                      <SelectItem value="new">+ Criar novo tipo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
               {/*  <div className="space-y-2">
                  <label className="text-xs font-medium">Periodicidade</label>
                  <Select value={localData.periodicity || 'MONTHLY'} onValueChange={(value) => handleChange('periodicity', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Mensal</SelectItem>
                      <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                      <SelectItem value="YEARLY">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div> */}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="cliente">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">Cliente</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-[10px] font-semibold uppercase text-muted-foreground">Cliente ou lead selecionado</div>
                  {selectedAdvertiser ? (
                    <div className="mt-2">
                      <div className="text-sm font-semibold">{selectedAdvertiser.tradeName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {[selectedAdvertiser.status === 'LEAD' ? 'Lead' : 'Cliente', selectedAdvertiser.contactName, selectedAdvertiser.contactPhone].filter(Boolean).join(' · ') || 'Sem contato cadastrado'}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-muted-foreground">Nenhum cliente selecionado.</div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button variant="outline" className="w-full" onClick={() => setClientPickerOpen(true)}>
                    <Search className="w-4 h-4 mr-2" /> Selecionar
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setAdvertiserDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Novo Lead
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="periodo">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">Período</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/30 p-3">
                  <Checkbox
                    checked={localData.showPeriod === false}
                    onCheckedChange={(checked) => handleChange('showPeriod', checked ? false : true)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-sm font-medium">Não exibir período na proposta</span>
                    <span className="block text-xs text-muted-foreground">
                      As datas continuam salvas, mas não aparecem no preview nem no PDF.
                    </span>
                  </span>
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Início</label>
                    <Input type="date" disabled={localData.showPeriod === false} value={localData.dateStart || ''} onChange={(e) => handleChange('dateStart', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Fim</label>
                    <Input type="date" disabled={localData.showPeriod === false} value={localData.dateEnd || ''} onChange={(e) => handleChange('dateEnd', e.target.value)} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="estatisticas">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">Apresentação</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Apresentação definida pela Empresa. O conteúdo abaixo é aplicado automaticamente e preservado como snapshot da proposta.
                </div>
                <div className="space-y-3">
                  {proposalStats.length > 0 ? (
                    proposalStats.map((stat, index) => (
                      <div key={index} className="grid grid-cols-1 items-start gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[1fr_1.6fr]">
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium uppercase text-muted-foreground">Destaque</label>
                          <Input
                            className="h-8"
                            value={stat.num}
                            maxLength={12}
                            placeholder="Ex: 350 mil"
                            readOnly
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium uppercase text-muted-foreground">Descrição</label>
                          <Textarea
                            className="min-h-16 resize-none text-sm"
                            value={stat.desc}
                            maxLength={140}
                            placeholder="Ex: ouvintes por dia, com quebra de linha se necessário"
                            readOnly
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      Nenhum item de apresentação cadastrado para esta empresa.
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="produtos">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">Produtos</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                  <label className="text-xs font-medium">Pesquisar produto do catálogo</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      value={catalogProductSearch}
                      onChange={(event) => setCatalogProductSearch(event.target.value)}
                      placeholder="Digite para buscar e clique no produto"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-md border bg-background">
                    {Object.keys(filteredGroupedProducts).length ? Object.entries(filteredGroupedProducts).map(([program, items]) => (
                      <div key={program} className="border-b last:border-b-0">
                        <div className="bg-muted/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{program}</div>
                        {items.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            className="block w-full border-t px-3 py-2 text-left hover:bg-primary/5"
                            onClick={() => addCatalogProduct(product.id)}
                          >
                            <span className="text-sm font-semibold">{product.title}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {[product.durationLabel, getSuggestedRangeText(product)?.replace('Sugerido: ', 'Sugestão: ')].filter(Boolean).join(' · ') || 'Produto cadastrado'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )) : (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                        Nenhum produto encontrado.
                      </div>
                    )}
                  </div>
                </div>

                {localData.products?.map((prod: any, i: number) => (
                  <div key={prod.id || i} className="p-3 border border-border rounded-lg bg-card shadow-sm space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <div className="grid min-w-0 flex-1 grid-cols-4 gap-2">
                        <div className="col-span-1 space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground">Qtd</label>
                          <Input className="h-8 text-sm" value={prod.qty || ''} onChange={(e) => updateProduct(i, 'qty', e.target.value)} />
                        </div>
                        <div className="col-span-3 min-w-0 space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground">Nome do Produto</label>
                          <Input className="h-8 text-sm font-medium" value={prod.title || ''} onChange={(e) => updateProduct(i, 'title', e.target.value)} />
                          {getSuggestedRangeText(prod) && (
                            <div className="text-[10px] font-medium text-primary">
                              {getSuggestedRangeText(prod)}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8 shrink-0 shadow-sm"
                        onClick={() => removeProduct(i)}
                        aria-label="Remover produto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">Descrição</label>
                      <Input className="h-8 text-sm" value={prod.program || ''} onChange={(e) => updateProduct(i, 'program', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Duração</label>
                        <Input
                          className="h-8 text-sm"
                          value={prod.durationLabel || ''}
                          onChange={(e) => updateProduct(i, 'durationLabel', e.target.value)}
                          placeholder="Ex: 30s"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Horário</label>
                        <Input
                          className="h-8 text-sm"
                          value={prod.airTime || ''}
                          onChange={(e) => updateProduct(i, 'airTime', e.target.value)}
                          placeholder="Ex: 13H AS 15H"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Sazonalidade</label>
                        <Select
                          value={prod.seasonality || 'none'}
                          onValueChange={(value) => updateProduct(i, 'seasonality', value === 'none' ? null : value)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Não informar</SelectItem>
                            {Object.entries(SEASONALITY_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">Informação</label>
                      <Textarea className="min-h-[60px] text-sm resize-none" value={prod.description || ''} onChange={(e) => updateProduct(i, 'description', e.target.value)} />
                    </div>
                  </div>
                ))}

                <Button variant="outline" className="w-full border-dashed" onClick={addBlankProduct}>
                  <Plus className="w-4 h-4 mr-2" /> Criar Produto Novo
                </Button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="investimento">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">Investimento & Contato</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {investmentSuggestion.itemCount > 0 && investmentSuggestion.total > 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                    <div>
                      <div className="text-xs font-semibold uppercase text-primary">Sugestão de investimento</div>
                      <div className="text-2xl font-bold text-foreground">{suggestedInvestmentText}</div>
                      <p className="text-xs text-muted-foreground">
                        Soma do valor sugerido dos produtos do catálogo multiplicada pela quantidade.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleChange('investValue', suggestedInvestmentText)}
                    >
                      Usar valor sugerido
                    </Button>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-medium">Descrição do investimento</label>
                  <Textarea
                    rows={2}
                    value={localData.investDesc || ''}
                    onChange={(e) => handleChange('investDesc', e.target.value)}
                    placeholder="Ex: Investimento mensal com produção inclusa"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Valor (R$)</label>
                  <Input inputMode="numeric" value={localData.investValue || ''} onChange={(e) => handleChange('investValue', formatCurrencyBRL(e.target.value))} placeholder="R$ 15.000,00" />
                </div>
                {sellerProfileIncomplete && (
                  <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-yellow-900">
                    <div className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="space-y-1">
                        <div className="text-sm font-semibold">Perfil comercial incompleto</div>
                        <p className="text-xs">
                          Complete seu cargo e telefone para que o contato apareça corretamente na proposta.
                        </p>
                        <Button type="button" variant="link" className="h-auto p-0 text-yellow-900 underline" onClick={() => setLocation('/profile')}>
                          Abrir Meu Perfil
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="rounded-lg bg-muted/50 border p-3 space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Contato comercial da proposta</div>
                  <div className="text-sm font-semibold text-foreground">{seller?.name || 'Vendedor não carregado'}</div>
                  <div className="text-xs text-muted-foreground">{seller?.jobTitle || 'Cargo não cadastrado'}</div>
                  <div className="text-xs text-muted-foreground">{seller?.contactPhone || 'Telefone não cadastrado'}</div>
                  <div className="text-xs text-muted-foreground">{seller?.contactEmail || 'E-mail não cadastrado'}</div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="timeline">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">Andamento da Proposta</AccordionTrigger>
              <AccordionContent className="pt-2">
                <ProposalTimeline
                  proposalId={params.id}
                  items={localData.timeline || []}
                  onAdded={(item) => {
                    setLocalData((prev: any) => ({
                      ...prev,
                      timeline: [...(prev.timeline || []), item],
                    }));
                    queryClient.invalidateQueries({ queryKey: [getListProposalsQueryKey()[0]] });
                    queryClient.invalidateQueries({ queryKey: [getListAdvertisersQueryKey()[0]] });
                  }}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="sticky bottom-0 z-20 space-y-3 border-t border-border bg-card/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          <Select value={localData.status} onValueChange={handleStatusChange}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Rascunho</SelectItem>
              <SelectItem value="SENT">Enviada</SelectItem>
              <SelectItem value="APPROVED">Aceita</SelectItem>
              <SelectItem value="REJECTED">Rejeitada</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleManualSave} disabled={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
            <Button className="flex-1" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> PDF
            </Button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'relative min-h-0 flex-1 items-start justify-center overflow-y-auto overflow-x-hidden bg-[#F4F4F5] p-3 print-only-container print:m-0 print:bg-white print:p-0 sm:p-6 lg:flex lg:p-8',
          mobileView === 'preview' ? 'flex' : 'hidden',
        )}
      >
        <div className="absolute top-4 right-4 text-xs font-bold text-muted-foreground/30 uppercase tracking-widest no-print">
          Preview
        </div>
        <ResponsiveProposalPreview proposal={proposalPrintData} />
      </div>
    </div>
  );
}
