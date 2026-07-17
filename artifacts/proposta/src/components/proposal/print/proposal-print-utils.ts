import type { NormalizedStat, ProposalPrintData } from './proposal-print-types';

export const PERIODICITY_LABELS: Record<string, string> = {
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
};

export const SEASONALITY_LABELS: Record<string, string> = {
  MONTHLY: 'Mensal',
  SEMIANNUAL: 'Semestral',
  ANNUAL: 'Anual',
};

export const isHexColor = (value?: string | null) => /^#[0-9A-Fa-f]{6}$/.test(value || '');

export function getPrimaryColor(proposal: ProposalPrintData) {
  const color = proposal.station?.primaryColor;
  return isHexColor(color) ? color! : '#427EFF';
}

export function formatDateBR(value?: string | null) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function formatPeriod(proposal: ProposalPrintData) {
  const start = formatDateBR(proposal.dateStart);
  const end = formatDateBR(proposal.dateEnd);
  if (start || end) return `${start || '00/00/0000'} à ${end || '00/00/0000'}`;
  return PERIODICITY_LABELS[String(proposal.periodicity || 'MONTHLY')] || 'Mensal';
}

export function normalizeStats(stats: unknown): NormalizedStat[] {
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

export function getStationName(proposal: ProposalPrintData) {
  return proposal.station?.name || proposal.station?.tradeName || 'Empresa';
}

export function getStationMonogram(name?: string | null) {
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

export function getClientName(proposal: ProposalPrintData) {
  return proposal.advertiser?.tradeName
    || proposal.advertiser?.legalName
    || proposal.clientLine1
    || 'NOME DO CLIENTE';
}

export function getInvestmentValue(value?: string | null) {
  return value?.trim() || 'R$ 0,00';
}

export function formatQty(value: unknown) {
  const text = String(value || '01').trim();
  if (/^\d$/.test(text)) return text.padStart(2, '0');
  return text || '01';
}

export function getProductMetaLine(product: any) {
  return [
    product.durationLabel,
    product.airTime,
    product.seasonality ? SEASONALITY_LABELS[String(product.seasonality)] || product.seasonality : null,
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(' - ');
}
