import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  RelationId,
} from 'typeorm';
import { User } from '../../../../auth/infrastructure/typeorm/entities/user.schema';
import { BookingSchema } from './booking.schema';

@Entity('contacts')
export class ContactSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wa_phone', unique: true })
  waPhone: string; // E.164 (ej: +56940145791)

  @Column({ name: 'display_name', type: 'text', nullable: true })
  displayName: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @RelationId((c: ContactSchema) => c.user)
  userId: string | null;

  @Column({ default: 'America/Santiago' })
  tz: string;

  @OneToMany(() => BookingSchema, (b) => b.contact)
  bookings: BookingSchema[];
}
