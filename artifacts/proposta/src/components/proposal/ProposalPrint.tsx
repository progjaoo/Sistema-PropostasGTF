import React from 'react';
import { createPortal } from 'react-dom';

import { ProposalPrintLayout } from './print/ProposalPrintLayout';
import { ProposalPrintMeasure } from './print/ProposalPrintMeasure';
import { paginateProposalProducts } from './print/proposal-print-pagination';
import type { PrintPage, PrintProduct, ProposalPrintData, ProposalPrintMeasurements } from './print/proposal-print-types';
import { getPrimaryColor, normalizeStats } from './print/proposal-print-utils';

function normalizeProducts(products: unknown): PrintProduct[] {
  if (!Array.isArray(products)) return [];
  return products.map((product: any, index) => ({
    id: product?.id ?? `product-${index}`,
    title: product?.title ?? 'Produto',
    description: product?.description ?? null,
    qty: product?.qty ?? '01',
    program: product?.program ?? null,
    programName: product?.programName ?? null,
    durationLabel: product?.durationLabel ?? null,
    airTime: product?.airTime ?? null,
    seasonality: product?.seasonality ?? null,
  }));
}

export function ProposalPrint({
  proposal,
  onReady,
}: {
  proposal: ProposalPrintData;
  onReady?: () => void;
}) {
  const [measurements, setMeasurements] = React.useState<ProposalPrintMeasurements | null>(null);
  const [pages, setPages] = React.useState<PrintPage[]>([]);
  const readyNotifiedRef = React.useRef(false);

  const products = React.useMemo(() => normalizeProducts(proposal.products), [proposal.products]);
  const primaryColor = React.useMemo(() => getPrimaryColor(proposal), [proposal]);
  const stats = React.useMemo(() => normalizeStats(proposal.stats), [proposal.stats]);

  const handleMeasured = React.useCallback((nextMeasurements: ProposalPrintMeasurements) => {
    setMeasurements(nextMeasurements);
  }, []);

  React.useEffect(() => {
    readyNotifiedRef.current = false;
    setMeasurements(null);
    setPages([]);
  }, [products, primaryColor, stats]);

  React.useEffect(() => {
    if (!measurements) return;
    setPages(paginateProposalProducts({
      products,
      measurements,
      hasStats: stats.length > 0,
    }));
  }, [measurements, products, stats.length]);

  React.useEffect(() => {
    if (!pages.length || readyNotifiedRef.current) return;
    readyNotifiedRef.current = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        onReady?.();
      });
    });
  }, [onReady, pages.length]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {!measurements && (
        <ProposalPrintMeasure
          proposal={proposal}
          products={products}
          primaryColor={primaryColor}
          stats={stats}
          onMeasured={handleMeasured}
        />
      )}
      <div id="proposal-print-root" className="proposal-print-root">
        {pages.length > 0 && (
          <ProposalPrintLayout
            pages={pages}
            proposal={proposal}
            primaryColor={primaryColor}
            stats={stats}
          />
        )}
      </div>
    </>,
    document.body,
  );
}

export type { ProposalPrintData };
