import React from 'react';
import { createPortal } from 'react-dom';
import type { Proposal } from '@workspace/api-client-react';

type ProposalPrintData = Partial<Proposal> & {
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

type NormalizedStat = {
  value: string;
  description: string;
};

const PRODUCTS_PER_PAGE = 4;

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

function getPrimaryColor(proposal: ProposalPrintData) {
  const color = proposal.station?.primaryColor;
  return isHexColor(color) ? color! : '#427EFF';
}

function formatDateBR(value?: string | null) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatPeriod(proposal: ProposalPrintData) {
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

function paginateProducts<T>(products: T[]): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < products.length; i += PRODUCTS_PER_PAGE) {
    pages.push(products.slice(i, i + PRODUCTS_PER_PAGE));
  }
  return pages.length > 0 ? pages : [[]];
}

function getStationName(proposal: ProposalPrintData) {
  return proposal.station?.name || proposal.station?.tradeName || 'Empresa';
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

function getClientName(proposal: ProposalPrintData) {
  return proposal.advertiser?.tradeName
    || proposal.advertiser?.legalName
    || proposal.clientLine1
    || 'NOME DO CLIENTE';
}

function getInvestmentValue(value?: string | null) {
  return value?.trim() || 'R$ 0,00';
}

function formatQty(value: unknown) {
  const text = String(value || '01').trim();
  if (/^\d$/.test(text)) return text.padStart(2, '0');
  return text || '01';
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

function PrintSectionLabel({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="proposal-print-section-label">
      <span style={{ backgroundColor: color }} />
      <strong>{children}</strong>
    </div>
  );
}

function PrintHeader({
  proposal,
  primaryColor,
  isContinuation,
}: {
  proposal: ProposalPrintData;
  primaryColor: string;
  isContinuation: boolean;
}) {
  const stationName = getStationName(proposal);

  return (
    <header className="proposal-print-header">
      <div className="proposal-print-logo" style={{ backgroundColor: primaryColor }}>
        {proposal.station?.logoBase64 ? (
          <img src={proposal.station.logoBase64} alt="Logo" />
        ) : (
          getStationMonogram(stationName)
        )}
      </div>
      <div>
        <div className="proposal-print-station-name">{stationName}</div>
        <div className="proposal-print-slogan">
          {proposal.station?.slogan || 'Propostas comerciais'}
          {isContinuation && <span> · CONTINUACAO</span>}
        </div>
      </div>
    </header>
  );
}

function PrintHero({ proposal, primaryColor }: { proposal: ProposalPrintData; primaryColor: string }) {
  const typeLabel = proposal.proposalTypeName || proposal.propType || 'Proposta Comercial';
  const periodRange = formatPeriod(proposal);
  const periodNote = proposal.periodDesc || '';

  return (
    <section className="proposal-print-hero" style={{ backgroundColor: primaryColor }}>
      <div className="proposal-print-hero-type">{typeLabel}</div>
      <h1>{getClientName(proposal)}</h1>
      <div className="proposal-print-period-row">
        <div className="proposal-print-period-pill">Período: {periodRange}</div>
        {periodNote && <div className="proposal-print-period-note">{periodNote}</div>}
      </div>
    </section>
  );
}

function PrintStats({
  stats,
  primaryColor,
}: {
  stats: NormalizedStat[];
  primaryColor: string;
}) {
  if (stats.length === 0) return null;

  return (
    <section className="proposal-print-stats-section">
      <PrintSectionLabel color={primaryColor}>Apresentação</PrintSectionLabel>
      <div className="proposal-print-stats-grid" style={{ backgroundColor: '#F8FBFF' }}>
        {stats.map((stat, index) => {
          const accent = index % 2 === 0 ? primaryColor : '#727272';
          return (
            <div key={`${stat.value}-${index}`} className="proposal-print-stat-card">
              <div className="proposal-print-stat-bar" style={{ backgroundColor: accent }} />
              <div className="proposal-print-stat-body">
                <div className="proposal-print-stat-value" style={{ color: accent }}>
                  {stat.value || '00'}
                </div>
                <div className="proposal-print-stat-description">
                  {stat.description || 'Indicador'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PrintProducts({
  products,
  primaryColor,
}: {
  products: any[];
  primaryColor: string;
}) {
  return (
    <section className="proposal-print-products-section">
      <PrintSectionLabel color={primaryColor}>Plano de Ações</PrintSectionLabel>
      {products.length > 0 ? (
        <div className="proposal-print-products-grid">
          {products.map((product, index) => (
            <article
              key={product.id || index}
              className="proposal-print-product-card"
              style={{
                backgroundColor: '#F8FBFF',
                '--proposal-primary': primaryColor,
              } as React.CSSProperties}
            >
              <div className="proposal-print-product-top">
                <div className="proposal-print-product-qty" style={{ color: primaryColor }}>
                  {formatQty(product.qty)}
                </div>
                <div className="proposal-print-product-qty-label">
                  Quantidade<br />de inserções
                </div>
              </div>
              <div className="proposal-print-product-title">
                {product.title || 'Produto'}
              </div>
              {getProductMetaLine(product) && (
                <div className="proposal-print-product-meta">
                  {getProductMetaLine(product)}
                </div>
              )}
              {product.description && (
                <p className="proposal-print-product-description">
                  {product.description}
                </p>
              )}
              <div className="proposal-print-product-tags">
                {product.program && (
                  <span className="proposal-print-product-program">{product.program}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="proposal-print-empty-products" style={{ backgroundColor: '#F8FBFF' }}>
          Nenhum produto adicionado.
        </div>
      )}
    </section>
  );
}

function PrintInvestment({ proposal }: { proposal: ProposalPrintData }) {
  return (
    <section className="proposal-print-investment" style={{ backgroundColor: '#000000' }}>
      <div>
        <div className="proposal-print-investment-label">Investimento</div>
        {proposal.investDesc && (
          <div className="proposal-print-investment-description">{proposal.investDesc}</div>
        )}
      </div>
      <div className="proposal-print-investment-value">
        {getInvestmentValue(proposal.investValue)}
      </div>
    </section>
  );
}

function PrintFooter({
  proposal,
  primaryColor,
}: {
  proposal: ProposalPrintData;
  primaryColor: string;
}) {
  const stationName = getStationName(proposal);
  const seller = (proposal as any).createdBy;
  const sellerContactName = seller?.name || proposal.contactName || 'Contato do vendedor';
  const sellerContactRole = seller?.jobTitle || proposal.contactRole || 'Comercial';
  const sellerContactPhone = seller?.contactPhone || proposal.contactPhone || '(00) 00000-0000';

  return (
    <footer className="proposal-print-footer">
      <div>
        <div className="proposal-print-footer-name">{sellerContactName}</div>
        <div className="proposal-print-footer-role">
          {sellerContactRole} · {stationName}
        </div>
      </div>
      <div className="proposal-print-footer-contact">
        <div className="proposal-print-footer-label">Contato Direto</div>
        <div className="proposal-print-footer-phone" style={{ color: primaryColor }}>
          {sellerContactPhone}
        </div>
      </div>
    </footer>
  );
}

export function ProposalPrint({ proposal }: { proposal: ProposalPrintData }) {
  if (typeof document === 'undefined') return null;

  const products = (proposal.products || []) as any[];
  const productPages = paginateProducts(products);
  const primaryColor = getPrimaryColor(proposal);
  const stats = normalizeStats(proposal.stats);

  return createPortal(
    <div id="proposal-print-root" className="proposal-print-root">
      {productPages.map((pageProducts, pageIndex) => {
        const firstPage = pageIndex === 0;
        const lastPage = pageIndex === productPages.length - 1;

        return (
          <div
            key={pageIndex}
            className="proposal-print-page"
            style={{
              width: '210mm',
              minHeight: '297mm',
              padding: '10mm 14mm 8mm',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
              pageBreakAfter: lastPage ? 'auto' : 'always',
              breakAfter: lastPage ? 'auto' : 'page',
              fontFamily: "'Montserrat', Arial, sans-serif",
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <PrintHeader proposal={proposal} primaryColor={primaryColor} isContinuation={!firstPage} />
            {firstPage && <PrintHero proposal={proposal} primaryColor={primaryColor} />}
            {firstPage && <PrintStats stats={stats} primaryColor={primaryColor} />}
            <PrintProducts products={pageProducts} primaryColor={primaryColor} />
            {lastPage && <div className="proposal-print-spacer" style={{ flex: 1 }} />}
            {lastPage && <PrintInvestment proposal={proposal} />}
            {lastPage && <PrintFooter proposal={proposal} primaryColor={primaryColor} />}
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
