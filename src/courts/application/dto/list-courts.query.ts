export class ListCourtsQuery {
  constructor(
    public readonly q?: string,
    public readonly active?: boolean,
    public readonly limit: number = 10,
  ) {}
}