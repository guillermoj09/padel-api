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
}
