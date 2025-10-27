export type TokenPayload = { sub: string; email: string; type: string; v?: number };

export abstract class TokenSignerPort {
  abstract sign(payload: TokenPayload, expiresIn: string): Promise<string>;
}
