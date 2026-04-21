export enum CourtBlockType {
  Maintenance = 'maintenance',
  Professor = 'professor',
  Tournament = 'tournament',
  PrivateEvent = 'private_event',
  AdminBlock = 'admin_block',
}

export enum CourtBlockStatus {
  Active = 'active',
  Cancelled = 'cancelled',
}

export interface CourtBlock {
  id: string;
  courtId: number;
  startTime: Date;
  endTime: Date;
  date: string;
  type: CourtBlockType;
  status: CourtBlockStatus;
  title?: string | null;
  reason?: string | null;
  createdBy?: string | null;
  cancelledAt?: Date | null;
  cancelledBy?: string | null;
  cancelReason?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}
