import type { PrintPage, PrintProduct, ProposalPrintMeasurements } from './proposal-print-types';

function getProductHeight(measurements: ProposalPrintMeasurements, index: number) {
  return measurements.products.find((item) => item.productIndex === index)?.heightPx || 148;
}

function getGridHeight(
  measurements: ProposalPrintMeasurements,
  startIndex: number,
  count: number,
) {
  if (count <= 0) return measurements.emptyProductsHeightPx;

  let height = 0;
  for (let offset = 0; offset < count; offset += 2) {
    const first = getProductHeight(measurements, startIndex + offset);
    const second = offset + 1 < count ? getProductHeight(measurements, startIndex + offset + 1) : 0;
    if (offset > 0) height += measurements.productGridGapPx;
    height += Math.max(first, second);
  }
  return height;
}

function getReservedHeight(measurements: ProposalPrintMeasurements, options: {
  firstPage: boolean;
  finalPage: boolean;
  hasStats: boolean;
}) {
  const header = options.firstPage ? measurements.firstHeaderHeightPx : measurements.continuationHeaderHeightPx;
  const intro = options.firstPage
    ? measurements.heroHeightPx + (options.hasStats ? measurements.statsHeightPx : 0)
    : 0;
  const final = options.finalPage ? measurements.investmentHeightPx + measurements.footerHeightPx : 0;

  return header
    + intro
    + measurements.productsLabelHeightPx
    + measurements.productsSectionMarginBottomPx
    + final;
}

function maxProductsThatFit(input: {
  products: PrintProduct[];
  startIndex: number;
  measurements: ProposalPrintMeasurements;
  reservedHeightPx: number;
  maxCount: number;
}) {
  const availableHeight = Math.max(0, input.measurements.pageContentHeightPx - input.reservedHeightPx);
  let count = 0;

  for (let nextCount = 1; nextCount <= input.maxCount; nextCount += 1) {
    const gridHeight = getGridHeight(input.measurements, input.startIndex, nextCount);
    if (gridHeight <= availableHeight) {
      count = nextCount;
      continue;
    }
    break;
  }

  return count || Math.min(1, input.maxCount);
}

export function paginateProposalProducts(input: {
  products: PrintProduct[];
  measurements: ProposalPrintMeasurements;
  hasStats: boolean;
}): PrintPage[] {
  const { products, measurements, hasStats } = input;

  if (products.length === 0) {
    return [{
      kind: 'single',
      products: [],
      startIndex: 0,
      showHero: true,
      showStats: hasStats,
      showInvestment: true,
      showFooter: true,
    }];
  }

  const firstFinalReserve = getReservedHeight(measurements, { firstPage: true, finalPage: true, hasStats });
  const firstFinalCount = maxProductsThatFit({
    products,
    startIndex: 0,
    measurements,
    reservedHeightPx: firstFinalReserve,
    maxCount: products.length,
  });

  if (firstFinalCount >= products.length) {
    return [{
      kind: 'single',
      products,
      startIndex: 0,
      showHero: true,
      showStats: hasStats,
      showInvestment: true,
      showFooter: true,
    }];
  }

  const pages: PrintPage[] = [];
  const firstReserve = getReservedHeight(measurements, { firstPage: true, finalPage: false, hasStats });
  const firstCount = Math.min(
    products.length - 1,
    maxProductsThatFit({
      products,
      startIndex: 0,
      measurements,
      reservedHeightPx: firstReserve,
      maxCount: products.length - 1,
    }),
  );

  pages.push({
    kind: 'first',
    products: products.slice(0, Math.max(1, firstCount)),
    startIndex: 0,
    showHero: true,
    showStats: hasStats,
    showInvestment: false,
    showFooter: false,
  });

  let index = pages[0].products.length;

  while (index < products.length) {
    const remaining = products.length - index;
    const finalReserve = getReservedHeight(measurements, { firstPage: false, finalPage: true, hasStats: false });
    const finalCount = maxProductsThatFit({
      products,
      startIndex: index,
      measurements,
      reservedHeightPx: finalReserve,
      maxCount: remaining,
    });

    if (finalCount >= remaining) {
      pages.push({
        kind: 'last',
        products: products.slice(index),
        startIndex: index,
        showHero: false,
        showStats: false,
        showInvestment: true,
        showFooter: true,
      });
      break;
    }

    const continuationReserve = getReservedHeight(measurements, { firstPage: false, finalPage: false, hasStats: false });
    const continuationCount = Math.min(
      remaining - 1,
      maxProductsThatFit({
        products,
        startIndex: index,
        measurements,
        reservedHeightPx: continuationReserve,
        maxCount: remaining - 1,
      }),
    );
    const safeCount = Math.max(1, continuationCount);

    pages.push({
      kind: 'continuation',
      products: products.slice(index, index + safeCount),
      startIndex: index,
      showHero: false,
      showStats: false,
      showInvestment: false,
      showFooter: false,
    });

    index += safeCount;
  }

  return pages;
}
