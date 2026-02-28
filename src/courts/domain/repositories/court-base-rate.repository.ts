export type ChangeBaseRateParams = {
  courtId: number;
  amPrice: number;
  pmPrice: number;
  currency?: string;
  priceCutoff?: string | null;
  setByAdminId?: string | null;
};

export type BaseRateAtResult = {
  courtId: number;
  amPrice: number;
  pmPrice: number;
  currency: string;
  priceCutoff: string | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
};

export interface CourtBaseRateRepository {
  changeBaseRate(params: ChangeBaseRateParams): Promise<BaseRateAtResult>;
  getBaseRateAt(courtId: number, at: Date): Promise<BaseRateAtResult | null>;
  listHistory(courtId: number, limit?: number): Promise<BaseRateAtResult[]>;
}