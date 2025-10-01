// Este bridge existe solo para desacoplar el dominio de dónde vive la entidad TypeORM.
// Reexporta la entidad real usada por TypeORM.
export { User } from '../typeorm/entities/user.schema';
