import { CourtSchema } from 'src/courts/infrastructure/typeorm/entities/court.schema';
import {
  CourtBlockStatus,
  CourtBlockType,
} from 'src/events/domain/entities/court-block';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

@Entity({ name: 'court_blocks' })
export class CourtBlockSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CourtSchema, { nullable: false })
  @JoinColumn({ name: 'court_id' })
  court: CourtSchema;

  @RelationId((b: CourtBlockSchema) => b.court)
  courtId: number;

  @Column('timestamptz', { name: 'start_time' })
  startTime: Date;

  @Column('timestamptz', { name: 'end_time' })
  endTime: Date;

  @Column('date')
  date: string;

  @Column({
    type: 'enum',
    enum: CourtBlockType,
    enumName: 'court_block_type',
    default: CourtBlockType.AdminBlock,
  })
  type: CourtBlockType;

  @Column({
    type: 'enum',
    enum: CourtBlockStatus,
    enumName: 'court_block_status',
    default: CourtBlockStatus.Active,
  })
  status: CourtBlockStatus;

  @Column({ type: 'varchar', length: 150, nullable: true })
  title?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason?: string | null;

  @Column({ type: 'varchar', length: 100, name: 'created_by', nullable: true })
  createdBy?: string | null;

  @Column({ type: 'timestamptz', name: 'cancelled_at', nullable: true })
  cancelledAt?: Date | null;

  @Column({ type: 'varchar', length: 100, name: 'cancelled_by', nullable: true })
  cancelledBy?: string | null;

  @Column({ type: 'varchar', length: 500, name: 'cancel_reason', nullable: true })
  cancelReason?: string | null;

  @Column({
    type: 'timestamptz',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: true,
  })
  createdAt?: Date | null;

  @Column({
    type: 'timestamptz',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: true,
  })
  updatedAt?: Date | null;
}
