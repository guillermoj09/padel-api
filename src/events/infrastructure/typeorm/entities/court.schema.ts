import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BookingSchema } from './booking.schema';
import { Maintenance } from './maintenance.schema';

@Entity('courts')
export class Court {
  @PrimaryGeneratedColumn() // ✅ esto es obligatorio
  id: number;

  @Column()
  name: string;

  @Column()
  location: string;

  @Column()
  type: string; // indoor, outdoor, etc.

  @Column()
  status: string; // disponible, ocupada, en mantenimiento

  @OneToMany(() => BookingSchema, (booking) => booking.court)
  bookings: BookingSchema[];

  @OneToMany(() => Maintenance, (maintenance) => maintenance.court)
  maintenance: Maintenance[];
  
  @Column({ type: 'int', name: 'default_am_price', default: 0 })
  defaultAmPrice!: number;

  @Column({ type: 'int', name: 'default_pm_price', default: 0 })
  defaultPmPrice!: number;

  @Column({ type: 'varchar', length: 8, default: 'CLP' })
  currency!: string;

  @Column({ type: 'varchar', nullable: true, name: 'price_cutoff' })
  priceCutoff?: string | null; // ej "12:00" para separar AM/PM
}
