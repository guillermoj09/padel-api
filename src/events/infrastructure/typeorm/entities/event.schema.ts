import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('events')
export class EventSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'timestamp' })
  start: Date;

  @Column({ type: 'timestamp' })
  end: Date;

  @Column()
  courtId: number;
}
