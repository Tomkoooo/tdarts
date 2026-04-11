import type { useFormatter } from 'next-intl'
import { normalizeEntryFeeCurrency } from '@tdarts/core/entry-fee-currency'

type FormatterNumber = ReturnType<typeof useFormatter>['number']

export function formatTournamentEntryFee(
  formatNumber: FormatterNumber,
  amount: number,
  currency?: string | null
): string {
  const c = normalizeEntryFeeCurrency(currency)
  return formatNumber(amount, {
    style: 'currency',
    currency: c,
    maximumFractionDigits: c === 'HUF' ? 0 : 2,
  })
}
