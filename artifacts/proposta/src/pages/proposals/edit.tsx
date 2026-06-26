import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { 
  useGetProposal, 
  useUpdateProposal, 
  useUpdateProposalStatus,
  useListAdvertisers,
  useListStations,
  getListProposalsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Save, Printer, Plus, Trash2, GripVertical } from 'lucide-react';
import { ProposalPreview } from '@/components/proposal/ProposalPreview';

import { Button } from '@/components/ui/button';
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

const COLORS = [
  { value: 'BLUE', label: 'Azul', class: 'bg-blue-500' },
  { value: 'YELLOW', label: 'Amarelo', class: 'bg-yellow-500' },
  { value: 'RED', label: 'Vermelho', class: 'bg-red-500' },
  { value: 'GREEN', label: 'Verde', class: 'bg-green-500' },
  { value: 'DARK', label: 'Escuro', class: 'bg-gray-800' }
];

export default function ProposalEdit({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<string>('Salvo');
  
  const { data: proposal, isLoading } = useGetProposal(params.id, {
    query: { enabled: !!params.id }
  });

  const { data: advertisers } = useListAdvertisers({ query: { queryKey: ['listAdvertisers', { active: true }] } });
  const { data: stations } = useListStations();

  const updateMutation = useUpdateProposal();
  const updateStatusMutation = useUpdateProposalStatus();

  // Local state for auto-save
  const [localData, setLocalData] = useState<any>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (proposal && !initialized.current) {
      setLocalData(proposal);
      initialized.current = true;
    }
  }, [proposal]);

  // Debounced auto-save
  useEffect(() => {
    if (!localData || !initialized.current) return;

    const timer = setTimeout(() => {
      setSaveStatus('Salvando...');
      const { id, stationId, advertiser, createdById, createdBy, station, createdAt, updatedAt, status, ...updateData } = localData;
      
      updateMutation.mutate({ id: params.id, data: updateData }, {
        onSuccess: () => {
          setSaveStatus(`Salvo às ${new Date().toLocaleTimeString()}`);
          queryClient.invalidateQueries({ queryKey: [getListProposalsQueryKey()[0]] });
        },
        onError: () => setSaveStatus('Erro ao salvar')
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [localData]);

  const handleChange = (field: string, value: any) => {
    setLocalData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleStatChange = (index: number, field: string, value: string) => {
    setLocalData((prev: any) => {
      const stats = [...(prev.stats || [])];
      if (!stats[index]) stats[index] = { num: '', suf: '', desc: '' };
      stats[index] = { ...stats[index], [field]: value };
      return { ...prev, stats };
    });
  };

  const addProduct = () => {
    setLocalData((prev: any) => ({
      ...prev,
      products: [
        ...(prev.products || []),
        { id: Math.random().toString(36).substr(2, 9), order: prev.products?.length || 0, qty: '1', title: 'Novo Produto', color: 'BLUE' }
      ]
    }));
  };

  const updateProduct = (index: number, field: string, value: any) => {
    setLocalData((prev: any) => {
      const products = [...(prev.products || [])];
      products[index] = { ...products[index], [field]: value };
      return { ...prev, products };
    });
  };

  const removeProduct = (index: number) => {
    setLocalData((prev: any) => {
      const products = [...(prev.products || [])];
      products.splice(index, 1);
      return { ...prev, products };
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStatusChange = (status: any) => {
    updateStatusMutation.mutate({ id: params.id, data: { status } }, {
      onSuccess: () => {
        toast.success(`Status atualizado para ${status}`);
        setLocalData((prev: any) => ({ ...prev, status }));
      }
    });
  };

  if (isLoading || !localData) {
    return <div className="p-8 text-center text-muted-foreground">Carregando editor...</div>;
  }

  const station = stations?.find(s => s.id === localData.stationId) || localData.station;

  return (
    <div className="flex h-[calc(100vh-6rem)] -m-6 border-t border-border overflow-hidden bg-background">
      {/* LEFT PANEL - Editor */}
      <div className="w-[420px] shrink-0 border-r border-border bg-card flex flex-col h-full z-10 shadow-sm no-print">
        <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-card/95 backdrop-blur z-20">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setLocation('/proposals')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="font-semibold text-sm">Editor</div>
              <div className="text-[10px] text-muted-foreground">{saveStatus}</div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <Accordion type="multiple" defaultValue={['proposta', 'campanha', 'produtos']} className="w-full">
            
            <AccordionItem value="emissora">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">Emissora</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="font-medium text-sm">{station?.name || 'Carregando...'}</div>
                  <div className="text-xs text-muted-foreground mt-1">{station?.slogan}</div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="proposta">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">Proposta</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Tipo</label>
                  <Input 
                    value={localData.propType || ''} 
                    onChange={e => handleChange('propType', e.target.value)} 
                    placeholder="Ex: PROPOSTA COMERCIAL"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Mês</label>
                    <Select value={localData.propMonth} onValueChange={v => handleChange('propMonth', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({length: 12}).map((_, i) => {
                          const m = String(i + 1).padStart(2, '0');
                          return <SelectItem key={m} value={m}>{m}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Ano</label>
                    <Input 
                      value={localData.propYear || ''} 
                      onChange={e => handleChange('propYear', e.target.value)} 
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="campanha">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">Campanha & Cliente</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Tag da Campanha</label>
                  <Input 
                    value={localData.campTag || ''} 
                    onChange={e => handleChange('campTag', e.target.value)} 
                    placeholder="Ex: CAMPANHA DE VENDAS"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Anunciante (Cadastro)</label>
                  <Select value={localData.advertiserId || ''} onValueChange={v => handleChange('advertiserId', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {advertisers?.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.tradeName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Cliente (Linha 1 - Principal)</label>
                  <Input 
                    value={localData.clientLine1 || ''} 
                    onChange={e => handleChange('clientLine1', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Cliente (Linha 2 - Secundária)</label>
                  <Input 
                    value={localData.clientLine2 || ''} 
                    onChange={e => handleChange('clientLine2', e.target.value)} 
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="periodo">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">Período</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Início</label>
                    <Input 
                      type="date"
                      value={localData.dateStart || ''} 
                      onChange={e => handleChange('dateStart', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Fim</label>
                    <Input 
                      type="date"
                      value={localData.dateEnd || ''} 
                      onChange={e => handleChange('dateEnd', e.target.value)} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Texto de Período Personalizado</label>
                  <Input 
                    value={localData.periodDesc || ''} 
                    onChange={e => handleChange('periodDesc', e.target.value)} 
                    placeholder="Ex: Novembro de 2024 a Março de 2025"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="banner">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">Capa (Banner)</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium block">Imagem de Fundo (Upload)</label>
                  <Input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          handleChange('bannerBase64', reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                  />
                  {localData.bannerBase64 && (
                    <div className="mt-2 text-xs text-muted-foreground">Imagem carregada</div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Opacidade da Máscara (%)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={localData.overlayOpacity || 70} 
                      onChange={e => handleChange('overlayOpacity', parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs w-8 text-right">{localData.overlayOpacity || 70}%</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="estatisticas">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">Estatísticas (4 blocos)</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {[0, 1, 2, 3].map(i => {
                  const stat = localData.stats?.[i] || { num: '', suf: '', desc: '' };
                  return (
                    <div key={i} className="flex gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
                      <div className="w-16 space-y-1">
                        <label className="text-[10px] text-muted-foreground">Número</label>
                        <Input value={stat.num} onChange={e => handleStatChange(i, 'num', e.target.value)} className="h-8 text-sm" placeholder="10" />
                      </div>
                      <div className="w-12 space-y-1">
                        <label className="text-[10px] text-muted-foreground">Sufixo</label>
                        <Input value={stat.suf} onChange={e => handleStatChange(i, 'suf', e.target.value)} className="h-8 text-sm" placeholder="M" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] text-muted-foreground">Descrição</label>
                        <Input value={stat.desc} onChange={e => handleStatChange(i, 'desc', e.target.value)} className="h-8 text-sm" placeholder="Ouvintes" />
                      </div>
                    </div>
                  );
                })}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="produtos">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">Plano de Ações</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {localData.products?.map((prod: any, i: number) => (
                  <div key={i} className="p-3 border border-border rounded-lg bg-card shadow-sm space-y-3 relative group">
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-error hover:bg-error/10" onClick={() => removeProduct(i)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-3 pr-8">
                      <div className="flex gap-1">
                        {COLORS.map(c => (
                          <button
                            key={c.value}
                            type="button"
                            className={`w-4 h-4 rounded-full ${c.class} ${prod.color === c.value ? 'ring-2 ring-offset-1 ring-primary' : 'opacity-50'}`}
                            onClick={() => updateProduct(i, 'color', c.value)}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Qtd</label>
                        <Input className="h-8 text-sm" value={prod.qty || ''} onChange={e => updateProduct(i, 'qty', e.target.value)} placeholder="10x" />
                      </div>
                      <div className="col-span-3 space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Título</label>
                        <Input className="h-8 text-sm font-medium" value={prod.title || ''} onChange={e => updateProduct(i, 'title', e.target.value)} placeholder="Título do Produto" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">Programa/Horário</label>
                      <Input className="h-8 text-sm" value={prod.program || ''} onChange={e => updateProduct(i, 'program', e.target.value)} placeholder="Ex: Manhã Show (08h as 12h)" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">Descrição</label>
                      <Textarea className="min-h-[60px] text-sm resize-none" value={prod.description || ''} onChange={e => updateProduct(i, 'description', e.target.value)} placeholder="Descrição do que compõe a ação..." />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">Tags (separadas por vírgula)</label>
                      <Input 
                        className="h-8 text-sm" 
                        value={prod.tags?.join(', ') || ''} 
                        onChange={e => updateProduct(i, 'tags', e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))} 
                        placeholder="Ex: Comercial, Digital, Merchandising" 
                      />
                    </div>
                  </div>
                ))}

                <Button variant="outline" className="w-full border-dashed" onClick={addProduct}>
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Produto
                </Button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="investimento">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">Investimento & Contato</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Descrição do Investimento</label>
                  <Input value={localData.investDesc || ''} onChange={e => handleChange('investDesc', e.target.value)} placeholder="Valor total da campanha" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Valor (R$)</label>
                  <Input value={localData.investValue || ''} onChange={e => handleChange('investValue', e.target.value)} placeholder="R$ 15.000,00" />
                </div>
                <div className="border-t pt-4 mt-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Nome do Contato</label>
                    <Input value={localData.contactName || ''} onChange={e => handleChange('contactName', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Cargo</label>
                      <Input value={localData.contactRole || ''} onChange={e => handleChange('contactRole', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Telefone</label>
                      <Input value={localData.contactPhone || ''} onChange={e => handleChange('contactPhone', e.target.value)} />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="p-4 border-t border-border bg-card/95 backdrop-blur sticky bottom-0 z-20 space-y-3">
          <Select value={localData.status} onValueChange={handleStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Rascunho</SelectItem>
              <SelectItem value="SENT">Enviada</SelectItem>
              <SelectItem value="APPROVED">Aprovada</SelectItem>
              <SelectItem value="REJECTED">Rejeitada</SelectItem>
              <SelectItem value="ARCHIVED">Arquivada</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => updateMutation.mutate({ id: params.id, data: localData })}>
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
            <Button className="flex-1" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> PDF
            </Button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Preview */}
      <div className="flex-1 bg-[#F4F4F5] relative overflow-y-auto overflow-x-hidden flex items-start justify-center p-8 print-only-container print:bg-white print:p-0 print:m-0">
        <div className="absolute top-4 right-4 text-xs font-bold text-muted-foreground/30 uppercase tracking-widest no-print">
          Preview
        </div>
        
        {localData.fromTemplateName && (
          <div className="absolute top-4 left-4 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium no-print">
            Template: {localData.fromTemplateName}
          </div>
        )}

        <div className="print-area print:!transform-none print:w-[210mm] print:h-auto shadow-2xl transition-transform origin-top">
          <ProposalPreview proposal={{...localData, station}} scale={0.8} />
        </div>
      </div>
    </div>
  );
}
