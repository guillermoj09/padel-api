import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('administrador')
export class AdminController {
  @Get('me')
  me() {
    return { ok: true, area: 'admin' };
  }
}
