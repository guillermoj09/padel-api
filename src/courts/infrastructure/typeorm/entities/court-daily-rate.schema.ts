import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('court_daily_rates')
@Unique(['courtId', 'date'])
export class CourtDailyRateSchema {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'court_id', type: 'int' })
  courtId!: number;

  @Column({ type: 'date' })
  date!: string; // "YYYY-MM-DD"

  @Column({ name: 'am_price', type: 'int' })
  amPrice!: number;

  @Column({ name: 'pm_price', type: 'int' })
  pmPrice!: number;

  @Column({ type: 'varchar', length: 8, default: 'CLP' })
  currency!: string;

  @Column({ name: 'set_by_admin_id', type: 'varchar', nullable: true })
  setByAdminId?: string | null;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
