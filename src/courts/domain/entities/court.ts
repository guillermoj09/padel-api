export class Court {
  constructor(
    public readonly id: number,
    public readonly type: string,
    public readonly name: string,
    public readonly active: boolean = true,
    public readonly defaultAmPrice?: number,
    public readonly defaultPmPrice?: number,
    public readonly currency?: string,
    public readonly priceCutoff?: string | null,
  ) {}
}
