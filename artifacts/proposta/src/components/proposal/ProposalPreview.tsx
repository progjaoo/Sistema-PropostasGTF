import React from 'react';
import type { Proposal } from '@workspace/api-client-react';

interface ProposalPreviewProps {
  proposal: Partial<Proposal> & {
    advertiser?: {
      tradeName?: string | null;
      legalName?: string | null;
    } | null;
    station?: {
      id?: string;
      name?: string | null;
      slogan?: string | null;
      logoBase64?: string | null;
      primaryColor?: string | null;
      tradeName?: string | null;
    } | null;
    proposalTypeName?: string | null;
    periodicity?: string | null;
  };
  scale?: number;
}

type NormalizedStat = {
  value: string;
  description: string;
};

const PERIODICITY_LABELS: Record<string, string> = {
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
};

const SEASONALITY_LABELS: Record<string, string> = {
  MONTHLY: 'Mensal',
  SEMIANNUAL: 'Semestral',
  ANNUAL: 'Anual',
};

const isHexColor = (value?: string | null) => /^#[0-9A-Fa-f]{6}$/.test(value || '');

function getPrimaryColor(proposal: ProposalPreviewProps['proposal']) {
  const color = proposal.station?.primaryColor;
  return isHexColor(color) ? color! : '#427EFF';
}

function formatDateBR(value?: string | null) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatPeriod(proposal: ProposalPreviewProps['proposal']) {
  const start = formatDateBR(proposal.dateStart);
  const end = formatDateBR(proposal.dateEnd);
  if (start || end) return `${start || '00/00/0000'} à ${end || '00/00/0000'}`;
  return PERIODICITY_LABELS[String(proposal.periodicity || 'MONTHLY')] || 'Mensal';
}

function normalizeStats(stats: unknown): NormalizedStat[] {
  if (!Array.isArray(stats)) return [];
  return stats
    .slice(0, 4)
    .map((item: any) => {
      const value = [item?.num, item?.suf].filter(Boolean).join(' ').trim()
        || String(item?.value ?? item?.title ?? '').trim();
      const description = String(item?.desc ?? item?.description ?? '').trim();
      return { value, description };
    })
    .filter((item) => item.value || item.description);
}

function getStationMonogram(name?: string | null) {
  const safeName = String(name || '').trim();
  const digits = safeName.match(/\d+/)?.[0];
  if (digits) return digits.slice(0, 3);
  const initials = safeName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return initials || 'G';
}

function getClientName(proposal: ProposalPreviewProps['proposal']) {
  return proposal.advertiser?.tradeName
    || proposal.advertiser?.legalName
    || proposal.clientLine1
    || 'NOME DO CLIENTE';
}

function getInvestmentValue(value?: string | null) {
  return value?.trim() || 'R$ 0,00';
}

function getProductMetaLine(product: any) {
  return [
    product.durationLabel,
    product.airTime,
    product.seasonality ? SEASONALITY_LABELS[String(product.seasonality)] || product.seasonality : null,
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(' - ');
}

function SectionLabel({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="block h-[14px] w-1 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#111111]">
        {children}
      </span>
    </div>
  );
}

export function ProposalPreview({ proposal, scale = 1 }: ProposalPreviewProps) {
  const a4Width = 794;
  const a4Height = 1123;
  const primaryColor = getPrimaryColor(proposal);
  const stats = normalizeStats(proposal.stats);
  const stationName = proposal.station?.name || proposal.station?.tradeName || 'Empresa';
  const typeLabel = proposal.proposalTypeName || proposal.propType || 'Proposta Comercial';
  const clientName = getClientName(proposal);
  const periodRange = formatPeriod(proposal);
  const periodNote = proposal.periodDesc || '';
  const products = (proposal.products || []) as any[];
  const seller = (proposal as any).createdBy;
  const sellerContactName = seller?.name || proposal.contactName || 'Contato do vendedor';
  const sellerContactRole = seller?.jobTitle || proposal.contactRole || 'Comercial';
  const sellerContactPhone = seller?.contactPhone || proposal.contactPhone || '(00) 00000-0000';
  const investmentValue = getInvestmentValue(proposal.investValue);

  return (
    <div
      className="a4-preview proposal-preview-page relative overflow-hidden bg-white text-[#111111] shadow-2xl"
      style={{
        width: `${a4Width}px`,
        minHeight: `${a4Height}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        fontFamily: "'Montserrat', Arial, sans-serif",
      }}
    >
      <div className="proposal-preview-content px-[58px] pb-[48px] pt-[44px]">
        <header className="mb-8 flex items-center gap-4">
          <div
            className="flex h-[66px] w-[66px] shrink-0 items-center justify-center overflow-hidden rounded-xl text-[24px] font-black tracking-tight text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {proposal.station?.logoBase64 ? (
              <img src={proposal.station.logoBase64} alt="Logo" className="h-full w-full object-contain p-2" />
            ) : (
              getStationMonogram(stationName)
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[23px] font-black uppercase leading-none tracking-[0.03em]">
              {stationName}
            </div>
            <div className="mt-2 text-[13px] font-medium text-[#727272]">
              {proposal.station?.slogan || 'Propostas comerciais'}
            </div>
          </div>
        </header>

        <section
          className="proposal-hero-section mb-9 rounded-[28px] px-[42px] py-[44px] text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-white/75">
            {typeLabel}
          </div>
          <h1 className="mt-5 max-w-[620px] text-[58px] font-black uppercase leading-[0.93] tracking-tight">
            {clientName}
          </h1>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-white/85 px-5 py-2 text-[13px] font-bold">
              Período: {periodRange}
            </div>
            {periodNote && (
              <div className="max-w-[360px] text-[13px] font-medium text-white/80">
                {periodNote}
              </div>
            )}
          </div>
        </section>

        {stats.length > 0 && (
          <section className="mb-9">
            <SectionLabel color={primaryColor}>Apresentação</SectionLabel>
            <div className="grid grid-cols-4 overflow-hidden rounded-[18px] border border-[#E1E7F0] bg-[#F8FBFF]">
              {stats.map((stat, index) => {
                const accent = index % 2 === 0 ? primaryColor : '#727272';
                return (
                  <div key={`${stat.value}-${index}`} className="proposal-stat-card min-h-[116px] border-r border-[#E1E7F0] last:border-r-0">
                    <div className="h-[7px]" style={{ backgroundColor: accent }} />
                    <div className="px-5 py-5">
                      <div className="text-[33px] font-black leading-none" style={{ color: accent }}>
                        {stat.value || '00'}
                      </div>
                      <div className="mt-3 whitespace-pre-line text-[11px] font-bold uppercase leading-snug tracking-[0.08em] text-[#555555]">
                        {stat.description || 'Indicador'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mb-9">
          <SectionLabel color={primaryColor}>Plano de Ações</SectionLabel>
          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {products.map((product, index) => (
                <article
                  key={product.id || index}
                  className="proposal-product-card min-h-[150px] rounded-[20px] border border-[#DCE7F6] bg-[#F8FBFF] p-5 pl-6"
                  style={{ borderLeft: `12px solid ${primaryColor}` }}
                >
                  <div className="mb-4 flex items-start gap-3">
                    <div className="text-[38px] font-black leading-none" style={{ color: primaryColor }}>
                      {product.qty || '01'}
                    </div>
                    <div className="pt-1 text-[10px] font-extrabold uppercase leading-[1.15] tracking-[0.12em] text-[#727272]">
                      Quantidade<br />de inserções
                    </div>
                  </div>
                  <div className="text-[15px] font-black uppercase leading-tight">
                    {product.title || 'Produto'}
                  </div>
                  {getProductMetaLine(product) && (
                    <div className="mt-2 text-[12px] font-semibold uppercase leading-snug tracking-[0.02em] text-[#565656]">
                      {getProductMetaLine(product)}
                    </div>
                  )}
                  {product.description && (
                    <p className="proposal-product-description mt-2 line-clamp-3 text-[12px] leading-snug text-[#565656]">
                      {product.description}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {product.program && (
                      <div className="inline-flex max-w-full rounded-full bg-[#111111] px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white">
                        <span className="truncate">{product.program}</span>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[20px] border border-dashed border-[#DCE7F6] bg-[#F8FBFF] px-6 py-10 text-center text-[13px] font-medium text-[#727272]">
              Nenhum produto adicionado.
            </div>
          )}
        </section>

        <section className="proposal-investment-block mb-9 rounded-[28px] px-8 py-8 text-white" style={{ backgroundColor: '#000000' }}>
          <div className="grid grid-cols-[1fr_auto] items-end gap-6">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-white/55">
                Investimento
              </div>
              {proposal.investDesc && (
                <div className="mt-3 max-w-[390px] text-[13px] font-medium leading-snug text-white/72">
                  {proposal.investDesc}
                </div>
              )}
            </div>
            <div className="text-right text-[42px] font-black leading-none tracking-tight">
              {investmentValue}
            </div>
          </div>
        </section>

        <footer className="proposal-footer flex items-end justify-between border-t border-[#E1E7F0] pt-7">
          <div>
            <div className="text-[23px] font-black leading-none">{sellerContactName}</div>
            <div className="mt-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[#727272]">
              {sellerContactRole} · {stationName}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#727272]">
              Contato Direto
            </div>
            <div className="mt-2 text-[18px] font-black" style={{ color: primaryColor }}>
              {sellerContactPhone}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
