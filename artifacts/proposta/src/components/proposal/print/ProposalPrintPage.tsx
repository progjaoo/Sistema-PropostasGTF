import React from 'react';

import type { NormalizedStat, PrintPage, ProposalPrintData } from './proposal-print-types';
import {
  PrintFooter,
  PrintHeader,
  PrintHero,
  PrintInvestment,
  PrintProducts,
  PrintStats,
} from './ProposalPrintSections';

export function ProposalPrintPage({
  page,
  pageIndex,
  pageCount,
  proposal,
  primaryColor,
  stats,
}: {
  page: PrintPage;
  pageIndex: number;
  pageCount: number;
  proposal: ProposalPrintData;
  primaryColor: string;
  stats: NormalizedStat[];
}) {
  const isFirstVisualPage = page.kind === 'single' || page.kind === 'first';
  const isLastPage = pageIndex === pageCount - 1;

  return (
    <div
      className="proposal-print-page"
      style={{
        width: '210mm',
        height: '297mm',
        minHeight: '297mm',
        maxHeight: '297mm',
        padding: '10mm 14mm 8mm',
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
        pageBreakAfter: isLastPage ? 'auto' : 'always',
        breakAfter: isLastPage ? 'auto' : 'page',
        fontFamily: "'Montserrat', Arial, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <PrintHeader proposal={proposal} primaryColor={primaryColor} isContinuation={!isFirstVisualPage} />
      {page.showHero && <PrintHero proposal={proposal} primaryColor={primaryColor} />}
      {page.showStats && <PrintStats stats={stats} primaryColor={primaryColor} />}
      <PrintProducts
        products={page.products}
        primaryColor={primaryColor}
        startIndex={page.startIndex}
        continuation={!isFirstVisualPage}
      />
      {page.showInvestment && <div className="proposal-print-spacer" style={{ flex: 1 }} />}
      {page.showInvestment && <PrintInvestment proposal={proposal} />}
      {page.showFooter && <PrintFooter proposal={proposal} primaryColor={primaryColor} />}
    </div>
  );
}
