import { BookingSchema } from 'src/events/infrastructure/typeorm/entities/booking.schema';
import { Maintenance } from 'src/events/infrastructure/typeorm/entities/maintenance.schema';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'courts' })
export class CourtSchema {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column()
  location: string;
  @Column()
  type: string; // indoor, outdoor, etc.
  @Column()
  status: string; // disponible, ocupada, en mantenimiento

  @Column({ type: 'int', name: 'default_am_price', default: 0 })
  defaultAmPrice!: number;

  @Column({ type: 'int', name: 'default_pm_price', default: 0 })
  defaultPmPrice!: number;

  @Column({ type: 'varchar', length: 8, default: 'CLP' })
  currency!: string;

  @OneToMany(() => BookingSchema, (booking) => booking.court)
  bookings: BookingSchema[];

  @OneToMany(() => Maintenance, (maintenance) => maintenance.court)
  maintenance: Maintenance[];

  @Column({ type: 'varchar', nullable: true, name: 'price_cutoff' })
  priceCutoff?: string | null; // ej "12:00" para separar AM/PM
}
