import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('court_base_rate_history')
@Index(['courtId', 'effectiveFrom'])
export class CourtBaseRateHistorySchema {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'court_id', type: 'int' })
  courtId!: number;

  @Column({ name: 'am_price', type: 'int' })
  amPrice!: number;

  @Column({ name: 'pm_price', type: 'int' })
  pmPrice!: number;

  @Column({ type: 'varchar', length: 8, default: 'CLP' })
  currency!: string;

  @Column({ type: 'varchar', nullable: true, name: 'price_cutoff' })
  priceCutoff?: string | null;

  @Column({ type: 'timestamptz', name: 'effective_from', default: () => 'CURRENT_TIMESTAMP' })
  effectiveFrom!: Date;

  @Column({ type: 'timestamptz', name: 'effective_to', nullable: true })
  effectiveTo?: Date | null;

  @Column({ name: 'set_by_admin_id', type: 'varchar', nullable: true })
  setByAdminId?: string | null;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}