import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BookingSchema } from './booking.schema';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  type: string; // cliente o administrador

  @OneToMany(() => BookingSchema, (booking) => booking.user)
  bookings: BookingSchema[];
}
