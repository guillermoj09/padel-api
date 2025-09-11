import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'courts' })
export class CourtSchema {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column()
  location: string;
  @Column()
  type: string; // indoor, outdoor, etc.
  @Column()
  status: string; // disponible, ocupada, en mantenimiento
}
