import React from 'react';

import type { NormalizedStat, PrintProduct, ProposalPrintData } from './proposal-print-types';
import {
  formatPeriod,
  formatQty,
  getClientName,
  getInvestmentValue,
  getPrimaryColor,
  getProductMetaLine,
  getStationMonogram,
  getStationName,
} from './proposal-print-utils';

export function PrintSectionLabel({
  color,
  children,
  continuation,
}: {
  color: string;
  children: React.ReactNode;
  continuation?: boolean;
}) {
  return (
    <div className="proposal-print-section-label">
      <span style={{ backgroundColor: color }} />
      <strong>
        {children}
        {continuation && <em>Continuação</em>}
      </strong>
    </div>
  );
}

export function PrintHeader({
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
    <header className="proposal-print-header" data-measure="header">
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

export function PrintHero({ proposal, primaryColor }: { proposal: ProposalPrintData; primaryColor: string }) {
  const typeLabel = proposal.proposalTypeName || proposal.propType || 'Proposta Comercial';
  const periodRange = formatPeriod(proposal);
  const periodNote = proposal.periodDesc || '';
  const showPeriod = proposal.showPeriod !== false;

  return (
    <section className="proposal-print-hero" style={{ backgroundColor: primaryColor }} data-measure="hero">
      <div className="proposal-print-hero-type">{typeLabel}</div>
      <h1>{getClientName(proposal)}</h1>
      {showPeriod && (
        <div className="proposal-print-period-row">
          <div className="proposal-print-period-pill">Período: {periodRange}</div>
          {periodNote && <div className="proposal-print-period-note">{periodNote}</div>}
        </div>
      )}
    </section>
  );
}

export function PrintStats({
  stats,
  primaryColor,
}: {
  stats: NormalizedStat[];
  primaryColor: string;
}) {
  if (stats.length === 0) return null;

  return (
    <section className="proposal-print-stats-section" data-measure="stats">
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

export function PrintProductCard({
  product,
  primaryColor,
  index,
}: {
  product: PrintProduct;
  primaryColor: string;
  index: number;
}) {
  const programName = product.programName || product.program;

  return (
    <article
      data-product-index={index}
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
        {programName && (
          <span className="proposal-print-product-program">{programName}</span>
        )}
      </div>
    </article>
  );
}

export function PrintProducts({
  products,
  primaryColor,
  startIndex = 0,
  continuation,
}: {
  products: PrintProduct[];
  primaryColor: string;
  startIndex?: number;
  continuation?: boolean;
}) {
  return (
    <section className="proposal-print-products-section" data-measure="products-section">
      <PrintSectionLabel color={primaryColor} continuation={continuation}>Plano de Ações</PrintSectionLabel>
      {products.length > 0 ? (
        <div className="proposal-print-products-grid" data-measure="products-grid">
          {products.map((product, index) => (
            <PrintProductCard
              key={product.id || `${startIndex}-${index}`}
              product={product}
              primaryColor={primaryColor}
              index={startIndex + index}
            />
          ))}
        </div>
      ) : (
        <div className="proposal-print-empty-products" style={{ backgroundColor: '#F8FBFF' }} data-measure="empty-products">
          Nenhum produto adicionado.
        </div>
      )}
    </section>
  );
}

export function PrintInvestment({ proposal }: { proposal: ProposalPrintData }) {
  return (
    <section className="proposal-print-investment" style={{ backgroundColor: '#000000' }} data-measure="investment">
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

export function PrintFooter({
  proposal,
  primaryColor,
}: {
  proposal: ProposalPrintData;
  primaryColor?: string;
}) {
  const stationName = getStationName(proposal);
  const seller = (proposal as any).createdBy;
  const sellerContactName = seller?.name || proposal.contactName || 'Contato do vendedor';
  const sellerContactRole = seller?.jobTitle || proposal.contactRole || 'Comercial';
  const sellerContactPhone = seller?.contactPhone || proposal.contactPhone || '(00) 00000-0000';
  const color = primaryColor || getPrimaryColor(proposal);

  return (
    <footer className="proposal-print-footer" data-measure="footer">
      <div>
        <div className="proposal-print-footer-name">{sellerContactName}</div>
        <div className="proposal-print-footer-role">
          {sellerContactRole} · {stationName}
        </div>
      </div>
      <div className="proposal-print-footer-contact">
        <div className="proposal-print-footer-label">Contato Direto</div>
        <div className="proposal-print-footer-phone" style={{ color }}>
          {sellerContactPhone}
        </div>
      </div>
    </footer>
  );
}
