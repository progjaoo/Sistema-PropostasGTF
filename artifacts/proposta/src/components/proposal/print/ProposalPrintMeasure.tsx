import React from 'react';

import type {
  NormalizedStat,
  PrintProduct,
  ProposalPrintData,
  ProposalPrintMeasurements,
} from './proposal-print-types';
import {
  PrintFooter,
  PrintHeader,
  PrintHero,
  PrintInvestment,
  PrintProductCard,
  PrintSectionLabel,
  PrintStats,
} from './ProposalPrintSections';

function numberFromCss(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function outerHeight(element: Element | null) {
  if (!element) return 0;
  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  return rect.height + numberFromCss(styles.marginTop) + numberFromCss(styles.marginBottom);
}

function measurePageContentHeight(page: HTMLElement | null) {
  if (!page) return 1123;
  const rect = page.getBoundingClientRect();
  const styles = window.getComputedStyle(page);
  return rect.height - numberFromCss(styles.paddingTop) - numberFromCss(styles.paddingBottom);
}

function getGridGap(grid: Element | null) {
  if (!grid) return 16;
  const styles = window.getComputedStyle(grid);
  return numberFromCss(styles.rowGap || styles.gap) || 16;
}

export function ProposalPrintMeasure({
  proposal,
  products,
  primaryColor,
  stats,
  onMeasured,
}: {
  proposal: ProposalPrintData;
  products: PrintProduct[];
  primaryColor: string;
  stats: NormalizedStat[];
  onMeasured: (measurements: ProposalPrintMeasurements) => void;
}) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useLayoutEffect(() => {
    let cancelled = false;

    const runMeasurement = async () => {
      if ('fonts' in document) {
        await document.fonts.ready.catch(() => undefined);
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled || !rootRef.current) return;

          const root = rootRef.current;
          const page = root.querySelector<HTMLElement>('[data-measure-page]');
          const firstHeader = root.querySelector('[data-measure="header-first"]')?.firstElementChild ?? null;
          const continuationHeader = root.querySelector('[data-measure="header-continuation"]')?.firstElementChild ?? null;
          const hero = root.querySelector('[data-measure="hero"]');
          const statsElement = root.querySelector('[data-measure="stats"]');
          const label = root.querySelector('[data-measure="products-label"]')?.firstElementChild ?? null;
          const productsSection = root.querySelector('[data-measure="products-section"]');
          const investment = root.querySelector('[data-measure="investment"]');
          const footer = root.querySelector('[data-measure="footer"]');
          const grid = root.querySelector('[data-measure="products-grid"]');
          const emptyProducts = root.querySelector('[data-measure="empty-products"]');
          const productElements = Array.from(root.querySelectorAll<HTMLElement>('[data-product-index]'));

          const productsSectionStyles = productsSection ? window.getComputedStyle(productsSection) : null;
          const productMeasurements = productElements.map((element) => ({
            productIndex: Number(element.dataset.productIndex || 0),
            heightPx: outerHeight(element),
          }));

          onMeasured({
            pageContentHeightPx: measurePageContentHeight(page),
            firstHeaderHeightPx: outerHeight(firstHeader),
            continuationHeaderHeightPx: outerHeight(continuationHeader),
            heroHeightPx: outerHeight(hero),
            statsHeightPx: stats.length ? outerHeight(statsElement) : 0,
            productsLabelHeightPx: outerHeight(label),
            productsSectionMarginBottomPx: productsSectionStyles ? numberFromCss(productsSectionStyles.marginBottom) : 0,
            investmentHeightPx: outerHeight(investment),
            footerHeightPx: outerHeight(footer),
            productGridGapPx: getGridGap(grid),
            emptyProductsHeightPx: outerHeight(emptyProducts),
            products: productMeasurements,
          });
        });
      });
    };

    runMeasurement();

    return () => {
      cancelled = true;
    };
  }, [onMeasured, primaryColor, products, proposal, stats]);

  return (
    <div id="proposal-print-measure-root" ref={rootRef} aria-hidden="true">
      <div className="proposal-print-page" data-measure-page>
        <div data-measure="header-first">
          <PrintHeader proposal={proposal} primaryColor={primaryColor} isContinuation={false} />
        </div>
        <div data-measure="header-continuation">
          <PrintHeader proposal={proposal} primaryColor={primaryColor} isContinuation />
        </div>
        <PrintHero proposal={proposal} primaryColor={primaryColor} />
        <PrintStats stats={stats} primaryColor={primaryColor} />
        <section className="proposal-print-products-section" data-measure="products-section">
          <div data-measure="products-label">
            <PrintSectionLabel color={primaryColor}>Plano de Ações</PrintSectionLabel>
          </div>
          <div className="proposal-print-products-grid" data-measure="products-grid">
            {products.map((product, index) => (
              <PrintProductCard
                key={product.id || index}
                product={product}
                primaryColor={primaryColor}
                index={index}
              />
            ))}
          </div>
          <div className="proposal-print-empty-products" style={{ backgroundColor: '#F8FBFF' }} data-measure="empty-products">
            Nenhum produto adicionado.
          </div>
        </section>
        <PrintInvestment proposal={proposal} />
        <PrintFooter proposal={proposal} primaryColor={primaryColor} />
      </div>
    </div>
  );
}
