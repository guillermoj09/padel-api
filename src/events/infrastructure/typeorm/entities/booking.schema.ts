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
import { Court } from './court.schema';
import { Payment } from './payment.schema';
import { ContactSchema } from './contact.schema';
import { BookingStatus } from 'src/events/domain/entities/booking';

@Entity('bookings')
export class BookingSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  title?: string | null;

  // Relaciones
  @ManyToOne(() => User, (user) => user.bookings)
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @RelationId((booking: BookingSchema) => booking.user)
  userId: string | null;

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

  @ManyToOne(() => ContactSchema, (c) => c.bookings, { nullable: true })
  @JoinColumn({ name: 'contact_id' })
  contact: ContactSchema | null;

  @RelationId((b: BookingSchema) => b.contact)
  contactId: string | null;

  // Otros campos
  @Column('timestamptz')
  start_time: Date;

  @Column('timestamptz')
  end_time: Date;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    enumName: 'booking_status',
    name: 'status',
    default: BookingStatus.Pending, // 👈 default en DB
    nullable: false, // 👈 explícito (por claridad)
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

  // 👇 estos 3 son los que faltan si quieres guardar la cancelación
  @Column({ type: 'timestamptz', nullable: true, name: 'canceled_at' })
  canceledAt?: Date | null;

  @Column({ type: 'varchar', nullable: true, name: 'cancel_reason' })
  cancelReason?: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'canceled_by' })
  canceledBy?: string | number | null;
}
