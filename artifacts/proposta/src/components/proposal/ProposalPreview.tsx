import React from 'react';
import type { GetProposalResponse as Proposal } from '@workspace/api-client-react';

interface ProposalPreviewProps {
  proposal: Partial<Proposal>;
  scale?: number;
}

export function ProposalPreview({ proposal, scale = 1 }: ProposalPreviewProps) {
  // A4 dimensions: 794px x 1123px (at 96dpi)
  const a4Width = 794;
  const a4Height = 1123;

  const bgStyle = proposal.bannerBase64 
    ? { 
        backgroundImage: `url(${proposal.bannerBase64})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
      } 
    : { backgroundColor: '#0f172a' }; // Fallback dark background
    
  const overlayOpacity = proposal.overlayOpacity ?? 70;

  const getAccentColor = (colorCode?: string) => {
    switch(colorCode) {
      case 'BLUE': return '#3B82F6';
      case 'YELLOW': return '#EAB308';
      case 'RED': return '#EF4444';
      case 'GREEN': return '#22C55E';
      case 'DARK': return '#374151';
      default: return '#6366F1';
    }
  };

  return (
    <div 
      className="bg-white shadow-2xl relative overflow-hidden"
      style={{
        width: `${a4Width}px`,
        height: `${a4Height}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        fontFamily: "'DM Sans', sans-serif"
      }}
    >
      {/* Background Section (Top half) */}
      <div 
        className="absolute top-0 left-0 right-0 h-[45%]"
        style={bgStyle}
      >
        <div 
          className="absolute inset-0 bg-black" 
          style={{ opacity: overlayOpacity / 100 }} 
        />
      </div>

      <div className="relative z-10 p-12 h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start text-white">
          <div className="flex items-center gap-3">
            {proposal.station?.logoBase64 ? (
              <img src={proposal.station.logoBase64} alt="Logo" className="h-12 object-contain" />
            ) : (
              <div className="text-2xl font-bold font-['General_Sans'] tracking-tight">
                {proposal.station?.name || 'Radio 88 FM'}
              </div>
            )}
            {proposal.station?.slogan && (
              <div className="pl-3 border-l border-white/20 text-sm opacity-80">
                {proposal.station.slogan}
              </div>
            )}
          </div>
          
          <div className="bg-indigo-600 px-4 py-1.5 rounded-full text-sm font-bold tracking-wider font-['Barlow_Condensed'] uppercase">
            {proposal.propType || 'PROPOSTA COMERCIAL'} • {proposal.propMonth}/{proposal.propYear}
          </div>
        </div>

        {/* Client Title */}
        <div className="mt-20 text-white">
          {proposal.campTag && (
            <div className="text-indigo-400 font-bold tracking-widest text-sm uppercase mb-2 font-['Barlow_Condensed']">
              {proposal.campTag}
            </div>
          )}
          <h1 className="text-5xl font-bold font-['Barlow_Condensed'] leading-none uppercase">
            {proposal.clientLine1 || 'NOME DO CLIENTE'}
          </h1>
          {proposal.clientLine2 && (
            <h2 className="text-2xl mt-1 text-white/80 font-['Barlow_Condensed']">
              {proposal.clientLine2}
            </h2>
          )}
          
          {(proposal.dateStart || proposal.periodDesc) && (
            <div className="mt-6 inline-flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg text-sm border border-white/10">
              <span className="opacity-70 mr-2">PERÍODO:</span>
              <span className="font-semibold">
                {proposal.periodDesc || `${proposal.dateStart} a ${proposal.dateEnd}`}
              </span>
            </div>
          )}
        </div>

        {/* Stats Row */}
        {proposal.stats && proposal.stats.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mt-auto mb-8 relative">
            {proposal.stats.map((stat, i) => (
              <div key={i} className="text-white border-l border-white/20 pl-4">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold font-['Barlow_Condensed']">{stat.num}</span>
                  <span className="text-lg font-bold ml-1 text-indigo-400">{stat.suf}</span>
                </div>
                <div className="text-xs uppercase tracking-wider opacity-70 mt-1 font-semibold">
                  {stat.desc}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Half - White Background Area */}
        <div className="flex-1 mt-4">
          <h3 className="text-xl font-bold font-['Barlow_Condensed'] text-gray-900 tracking-widest uppercase mb-4 flex items-center">
            <span className="w-6 h-1 bg-indigo-600 mr-3"></span>
            Plano de Ações
          </h3>

          <div className="space-y-3">
            {proposal.products && proposal.products.length > 0 ? (
              proposal.products.map((prod, i) => (
                <div key={i} className="flex bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                  <div 
                    className="w-2 shrink-0" 
                    style={{ backgroundColor: getAccentColor(prod.color) }}
                  />
                  <div className="p-4 flex-1 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-bold">
                          {prod.qty}
                        </span>
                        <h4 className="font-bold text-gray-900">{prod.title}</h4>
                        {prod.program && (
                          <span className="text-xs text-gray-500">• {prod.program}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {prod.description}
                      </p>
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
                </div>
              ))
            ) : (
              <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl text-center text-gray-400 text-sm">
                Nenhum produto adicionado ao plano.
              </div>
            )}
          </div>

          <div className="mt-8 flex gap-8">
            <div className="flex-1 bg-gray-900 text-white rounded-xl p-6">
              <div className="text-sm text-gray-400 uppercase tracking-wider mb-1 font-bold">Investimento</div>
              <div className="text-sm text-gray-300 mb-2">{proposal.investDesc || 'Valor total da campanha'}</div>
              <div className="text-4xl font-bold font-['Barlow_Condensed'] text-indigo-400">
                {proposal.investValue || 'R$ 0,00'}
              </div>
            </div>
            
            <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex flex-col justify-center">
              <div className="text-sm text-indigo-400 uppercase tracking-wider mb-2 font-bold">Contato Comercial</div>
              <div className="font-bold text-gray-900">{proposal.contactName || 'Nome do Contato'}</div>
              <div className="text-sm text-gray-600">{proposal.contactRole || 'Executivo de Contas'}</div>
              <div className="text-sm text-indigo-600 font-medium mt-1">{proposal.contactPhone || '(00) 00000-0000'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
