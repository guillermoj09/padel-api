export type PricingEngineSource = 'DAILY' | 'COURT_DEFAULT';
export type BookingPricingSource = 'DAILY' | 'RATE_CARD';

export function mapPricingSource(
  source: PricingEngineSource,
): BookingPricingSource {
  return source === 'DAILY' ? 'DAILY' : 'RATE_CARD';
}