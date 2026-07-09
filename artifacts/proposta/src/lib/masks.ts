export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function formatCpfCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

export function formatPhoneBR(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function formatCurrencyBRL(value: string) {
  const digits = onlyDigits(value);
  if (!digits) return '';

  const amount = Number(digits) / 100;
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function currencyToNumberString(value: string) {
  const digits = onlyDigits(value);
  if (!digits) return '';
  return String(Number(digits) / 100);
}

export function normalizeEmailInput(value: string) {
  return value.trim().replace(/\s+/g, '').toLowerCase();
}

export function formatUf(value: string) {
  return value.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
}
