// roles.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as
      | { role?: string; type?: string; roles?: string[] }
      | undefined;
    if (!user) throw new UnauthorizedException('User not authenticated');

    const claimedRaw = user.roles ?? user.role ?? user.type ?? null;
    const have = (
      Array.isArray(claimedRaw) ? claimedRaw : [claimedRaw].filter(Boolean)
    ).map((r) => String(r).toLowerCase());
    const need = required.map((r) => r.toLowerCase());

    const ok = need.some((r) => have.includes(r));
    if (!ok) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
