import React from 'react';
import type { Proposal } from '@workspace/api-client-react';

interface ProposalPreviewProps {
  proposal: Partial<Proposal> & {
    advertiser?: {
      tradeName?: string | null;
      legalName?: string | null;
    } | null;
    proposalTypeName?: string | null;
    periodicity?: string | null;
  };
  scale?: number;
}

const PERIODICITY_LABELS: Record<string, string> = {
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
};

export function ProposalPreview({ proposal, scale = 1 }: ProposalPreviewProps) {
  const a4Width = 794;
  const a4Height = 1123;

  const getAccentColor = (colorCode?: string) => {
    switch (colorCode) {
      case 'BLUE': return '#3B82F6';
      case 'YELLOW': return '#EAB308';
      case 'RED': return '#EF4444';
      case 'GREEN': return '#22C55E';
      case 'DARK': return '#374151';
      default: return '#6366F1';
    }
  };

  const typeLabel = proposal.proposalTypeName || proposal.propType || 'Proposta Comercial';
  const periodicityLabel = proposal.periodDesc
    || (proposal.dateStart || proposal.dateEnd ? `${proposal.dateStart || ''} a ${proposal.dateEnd || ''}` : PERIODICITY_LABELS[String(proposal.periodicity || 'MONTHLY')]);
  const clientName = proposal.advertiser?.tradeName || proposal.advertiser?.legalName || 'NOME DO CLIENTE';
  const seller = (proposal as any).createdBy;
  const sellerContactName = seller?.name || proposal.contactName || 'Contato do vendedor';
  const sellerContactRole = seller?.jobTitle || proposal.contactRole || 'Comercial';
  const sellerContactPhone = seller?.contactPhone || proposal.contactPhone || '(00) 00000-0000';
  const sellerContactEmail = seller?.contactEmail || '';

  return (
    <div
      className="bg-white shadow-2xl relative overflow-hidden"
      style={{
        width: `${a4Width}px`,
        height: `${a4Height}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[38%] bg-[#111827]" />
      <div className="absolute top-0 left-0 right-0 h-[38%] bg-indigo-700/20" />

      <div className="relative z-10 p-12 h-full flex flex-col">
        <div className="flex justify-between items-start text-white">
          <div className="flex items-center gap-3">
            {proposal.station?.logoBase64 ? (
              <img src={proposal.station.logoBase64} alt="Logo" className="h-12 object-contain" />
            ) : (
              <div className="text-2xl font-bold font-['General_Sans'] tracking-tight">
                {proposal.station?.name || 'Empresa'}
              </div>
            )}
            {proposal.station?.slogan && (
              <div className="pl-3 border-l border-white/20 text-sm opacity-80">
                {proposal.station.slogan}
              </div>
            )}
          </div>

          <div className="bg-indigo-600 px-4 py-1.5 rounded-full text-sm font-bold tracking-wider font-['Barlow_Condensed'] uppercase">
            {typeLabel} • {periodicityLabel}
          </div>
        </div>

        <div className="mt-24 text-white">
          <h1 className="text-5xl font-bold font-['Barlow_Condensed'] leading-none uppercase">
            {clientName}
          </h1>
          {periodicityLabel && (
            <div className="mt-6 inline-flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg text-sm border border-white/10">
              <span className="opacity-70 mr-2">PERÍODO:</span>
              <span className="font-semibold">{periodicityLabel}</span>
            </div>
          )}
        </div>

        <div className="flex-1 mt-32">
          <h3 className="text-xl font-bold font-['Barlow_Condensed'] text-gray-900 tracking-widest uppercase mb-4 flex items-center">
            <span className="w-6 h-1 bg-indigo-600 mr-3" />
            Produtos
          </h3>

          <div className="space-y-3">
            {proposal.products && proposal.products.length > 0 ? (
              proposal.products.map((prod, i) => (
                <div key={i} className="flex bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                  <div
                    className="w-2 shrink-0"
                    style={{ backgroundColor: getAccentColor(prod.color) }}
                  />
                  <div className="p-4 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-bold">
                        {prod.qty}
                      </span>
                      <h4 className="font-bold text-gray-900">{prod.title}</h4>
                      {prod.program && <span className="text-xs text-gray-500">• {prod.program}</span>}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{prod.description}</p>
                    {prod.tags && prod.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {prod.tags.map((tag, j) => (
                          <span key={j} className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-500 uppercase tracking-wider">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl text-center text-gray-400 text-sm">
                Nenhum produto adicionado.
              </div>
            )}
          </div>

          <div className="mt-8 flex gap-8">
            <div className="flex-1 bg-gray-900 text-white rounded-xl p-6">
              <div className="text-sm text-gray-400 uppercase tracking-wider mb-2 font-bold">Investimento</div>
              <div className="text-4xl font-bold font-['Barlow_Condensed'] text-indigo-400">
                {proposal.investValue || 'R$ 0,00'}
              </div>
            </div>

            <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex flex-col justify-center">
              <div className="text-sm text-indigo-400 uppercase tracking-wider mb-2 font-bold">Contato Comercial</div>
              <div className="font-bold text-gray-900">{sellerContactName}</div>
              <div className="text-sm text-gray-600">{sellerContactRole}</div>
              <div className="text-sm text-indigo-600 font-medium mt-1">{sellerContactPhone}</div>
              {sellerContactEmail && <div className="text-xs text-indigo-500 mt-1">{sellerContactEmail}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
