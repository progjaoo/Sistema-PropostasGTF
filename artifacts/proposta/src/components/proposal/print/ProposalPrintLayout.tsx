import React from 'react';

import type { NormalizedStat, PrintPage, ProposalPrintData } from './proposal-print-types';
import { ProposalPrintPage } from './ProposalPrintPage';

export function ProposalPrintLayout({
  pages,
  proposal,
  primaryColor,
  stats,
}: {
  pages: PrintPage[];
  proposal: ProposalPrintData;
  primaryColor: string;
  stats: NormalizedStat[];
}) {
  return (
    <>
      {pages.map((page, index) => (
        <ProposalPrintPage
          key={`${page.kind}-${page.startIndex}-${index}`}
          page={page}
          pageIndex={index}
          pageCount={pages.length}
          proposal={proposal}
          primaryColor={primaryColor}
          stats={stats}
        />
      ))}
    </>
  );
}
