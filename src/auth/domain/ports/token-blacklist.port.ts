export abstract class TokenBlacklistPort {
  abstract revoke(jti: string, expiresInSeconds: number): Promise<void>;
  abstract isRevoked(jti: string): Promise<boolean>;
}