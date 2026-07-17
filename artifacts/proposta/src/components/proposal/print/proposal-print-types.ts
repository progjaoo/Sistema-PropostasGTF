import type { Proposal } from '@workspace/api-client-react';

export type ProposalPrintData = Partial<Proposal> & {
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
  showPeriod?: boolean | null;
};

export type NormalizedStat = {
  value: string;
  description: string;
};

export type PrintProduct = {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  qty?: string | null;
  program?: string | null;
  programName?: string | null;
  durationLabel?: string | null;
  airTime?: string | null;
  seasonality?: string | null;
};

export type ProductMeasurement = {
  productIndex: number;
  heightPx: number;
};

export type ProposalPrintMeasurements = {
  pageContentHeightPx: number;
  firstHeaderHeightPx: number;
  continuationHeaderHeightPx: number;
  heroHeightPx: number;
  statsHeightPx: number;
  productsLabelHeightPx: number;
  productsSectionMarginBottomPx: number;
  investmentHeightPx: number;
  footerHeightPx: number;
  productGridGapPx: number;
  emptyProductsHeightPx: number;
  products: ProductMeasurement[];
};

export type PrintPageKind = 'single' | 'first' | 'continuation' | 'last';

export type PrintPage = {
  kind: PrintPageKind;
  products: PrintProduct[];
  startIndex: number;
  showHero: boolean;
  showStats: boolean;
  showInvestment: boolean;
  showFooter: boolean;
};
