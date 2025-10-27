import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
  OneToMany,
} from 'typeorm';
import { BookingSchema } from 'src/events/infrastructure/typeorm/entities/booking.schema';

export type UserType = 'cliente' | 'administrador';

@Entity({ name: 'users' })
@Unique(['email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 160 })
  email: string;

  @Column({ select: true })
  password: string;

  @Column({ type: 'varchar', length: 20 })
  type: UserType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'int', name: 'token_version', default: 0 })
  tokenVersion: number;

  @OneToMany(() => BookingSchema, (b) => b.user, {
    cascade: false, // o true si así lo deseas
  })
  bookings: BookingSchema[];
}
