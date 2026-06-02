import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'court_schedule_windows' })
@Index('idx_court_schedule_windows_type_active_order', [
  'courtType',
  'active',
  'sortOrder',
])
export class CourtScheduleWindowSchema {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, name: 'court_type' })
  courtType!: string;

  @Column({ type: 'varchar', length: 80 })
  label!: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  emoji!: string | null;

  @Column({ type: 'varchar', length: 5, name: 'open_time' })
  openTime!: string;

  @Column({ type: 'varchar', length: 5, name: 'close_time' })
  closeTime!: string;

  @Column({ type: 'int', name: 'slot_minutes', default: 60 })
  slotMinutes!: number;

  @Column({ type: 'varchar', length: 2, name: 'price_slot', default: 'AM' })
  priceSlot!: 'AM' | 'PM';

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  active!: boolean;
}
