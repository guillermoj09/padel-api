// src/courts/application/dto/list-courts.query.ts
export class ListCourtsQuery {
  q?: string;
  active?: boolean;
  limit = 10;

  constructor(init?: Partial<ListCourtsQuery>) {
    Object.assign(this, init);
  }
}
