import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { User } from '../../../../auth/infrastructure/typeorm/entities/user.schema';
import { CourtSchema } from 'src/courts/infrastructure/typeorm/entities/court.schema';
import { Payment } from './payment.schema';
import { ContactSchema } from './contact.schema';
import {
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
} from 'src/events/domain/entities/booking';

@Entity('bookings')
export class BookingSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  title?: string | null;

  @ManyToOne(() => User, (user) => user.bookings)
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @RelationId((booking: BookingSchema) => booking.user)
  userId: string | null;

  @ManyToOne(() => CourtSchema, (court) => court.bookings)
  @JoinColumn({ name: 'court_id' })
  court: CourtSchema;

  @RelationId((booking: BookingSchema) => booking.court)
  courtId: number;

  @OneToOne(() => Payment, (payment) => payment.booking, { nullable: true })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @RelationId((booking: BookingSchema) => booking.payment)
  paymentId: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'payment_method',
    default: PaymentMethod.Pendiente,
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'payment_status',
    default: PaymentStatus.Pending,
  })
  paymentStatus: PaymentStatus;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'paid_at',
  })
  paidAt?: Date | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'payment_confirmed_by',
  })
  paymentConfirmedBy?: string | null;

  @ManyToOne(() => ContactSchema, (c) => c.bookings, { nullable: true })
  @JoinColumn({ name: 'contact_id' })
  contact: ContactSchema | null;

  @RelationId((b: BookingSchema) => b.contact)
  contactId: string | null;

  @Column('timestamptz')
  start_time: Date;

  @Column('timestamptz')
  end_time: Date;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    enumName: 'booking_status',
    name: 'status',
    default: BookingStatus.Pending,
    nullable: false,
  })
  status: BookingStatus;

  @Column('date')
  date: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt?: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'canceled_at' })
  canceledAt?: Date | null;

  @Column({ type: 'varchar', nullable: true, name: 'cancel_reason' })
  cancelReason?: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'canceled_by' })
  canceledBy?: string | number | null;

  @Column({ type: 'int', name: 'price_applied', nullable: true })
  priceApplied?: number | null;

  @Column({ type: 'varchar', length: 8, name: 'currency_applied', nullable: true })
  currencyApplied?: string | null;

  @Column({ type: 'varchar', length: 4, name: 'slot_applied', nullable: true })
  slotApplied?: 'AM' | 'PM' | null;

  @Column({ type: 'varchar', length: 20, name: 'pricing_source', nullable: true })
  pricingSource?: 'DAILY' | 'RATE_CARD' | null;

  @Column({ type: 'varchar', length: 10, name: 'cutoff_applied', nullable: true })
  cutoffApplied?: string | null;
}
