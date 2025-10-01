export type UserType = 'cliente' | 'administrador';

export class AuthUser {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly password: string,
    public readonly type: UserType,
    public readonly name?: string,
  ) {}
}
