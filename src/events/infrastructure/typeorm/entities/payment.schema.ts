import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BookingSchema } from './booking.schema';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id' })
  bookingId: string;

  @OneToOne(() => BookingSchema, (booking) => booking.payment)
  @JoinColumn({ name: 'booking_id' })
  booking: BookingSchema;

  @Column('decimal')
  amount: number;

  @Column('timestamptz')
  payment_date: Date;

  @Column()
  status: string; // pendiente, completado, fallido
}
