import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Court } from './court.schema'; // Asegúrate de importar Court

@Entity('maintenance')
export class Maintenance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Court, (court) => court.maintenance)
  @JoinColumn({ name: 'court_id' }) // Relación ManyToOne con Court, clave foránea 'court_id'
  court: Court;

  @Column('timestamptz')
  start_date: Date;

  @Column('timestamptz')
  end_date: Date;

  @Column()
  details: string;

  @Column()
  status: string; // pendiente, completado
}
