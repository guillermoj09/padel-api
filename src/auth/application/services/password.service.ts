import * as bcrypt from 'bcrypt';

export class PasswordService {
  async hash(plain: string): Promise<string> {
    const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
    return bcrypt.hash(plain, rounds);
  }

  async compare(plain: string, hashedOrPlain: string): Promise<boolean> {
    try {
      const ok = await bcrypt.compare(plain, hashedOrPlain);
      if (ok) return true;
    } catch {}
    // fallback para entornos de dev si hay contraseñas sin hash
    return plain === hashedOrPlain;
  }
}
