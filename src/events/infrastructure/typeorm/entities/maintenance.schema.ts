import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CourtSchema } from 'src/courts/infrastructure/typeorm/entities/court.schema';

@Entity('maintenance')
export class Maintenance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CourtSchema, (court) => court.maintenance)
  @JoinColumn({ name: 'court_id' }) // Relación ManyToOne con Court, clave foránea 'court_id'
  court: CourtSchema;

  @Column('timestamptz')
  start_date: Date;

  @Column('timestamptz')
  end_date: Date;

  @Column()
  details: string;

  @Column()
  status: string; // pendiente, completado
}
