export interface CourtPricingRepository {
  getPricingFor(
    courtId: number,
    dateYmd: string,
  ): Promise<{
    amPrice: number;
    pmPrice: number;
    currency: string;
    cutoff: string | null;
    source: 'DAILY' | 'COURT_DEFAULT';
  }>;
}