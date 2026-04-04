import { Court } from '../../domain/entities/court';

export class CourtsPresenter {
  static toHttp(dto: Court) {
    return {
      id: String(dto.id),
      title: dto.name ?? `Cancha ${dto.id}`,
      type: String(dto.type),
      // active: dto.active,
    };
  }

  static toHttpList(list: Court[]) {
    return list.map(CourtsPresenter.toHttp);
  }
}
