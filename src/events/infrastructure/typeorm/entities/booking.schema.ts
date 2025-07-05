import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { User } from './user.schema';
import { Court } from './court.schema';
import { Payment } from './payment.schema';

@Entity('bookings')
export class BookingSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relaciones
  @ManyToOne(() => User, (user) => user.bookings)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @RelationId((booking: BookingSchema) => booking.user)
  userId: string;

  @ManyToOne(() => Court, (court) => court.bookings)
  @JoinColumn({ name: 'court_id' })
  court: Court;

  @RelationId((booking: BookingSchema) => booking.court)
  courtId: number;

  @OneToOne(() => Payment, (payment) => payment.booking, { nullable: true })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @RelationId((booking: BookingSchema) => booking.payment)
  paymentId: string | null;

  // Otros campos
  @Column('timestamptz')
  start_time: Date;

  @Column('timestamptz')
  end_time: Date;

  @Column()
  status: string;

  @Column('date')
  date: Date;
}
