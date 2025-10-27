// src/events/application/use-cases/cancel-booking.use-case.ts
import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Booking } from '../../domain/entities/booking';
import { BookingRepository } from '../../domain/repositories/booking.repository';
import { CancelBookingDto } from '../dto/cancel-booking-input';

type Who = { kind: 'admin' | 'user' | 'wa'; value: string };

function parseBy(raw: string): Who {
  if (!raw) throw new ForbiddenException('Missing "by"');
  if (raw.startsWith('admin:')) return { kind: 'admin', value: raw.slice(6) };
  if (raw.startsWith('user:')) return { kind: 'user', value: raw.slice(5) };
  if (raw.startsWith('wa:')) return { kind: 'wa', value: raw.slice(3) };
  throw new ForbiddenException('Invalid "by" format');
}

function normalizeWa(e164: string): string {
  // normaliza a +XXXXXXXX
  const s = e164.startsWith('+') ? e164 : `+${e164}`;
  return s.replace(/\s+/g, '');
}

function minutesUntil(dateIso: string | Date): number {
  const now = new Date();
  const dt = new Date(dateIso);
  return Math.floor((+dt - +now) / 60000);
}

@Injectable()
export class CancelBookingUseCase {
  constructor(
    @Inject('BookingRepository')
    private readonly repo: BookingRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(
    id: string,
    dto: CancelBookingDto,
  ): Promise<Booking & { alreadyCancelled?: boolean }> {
    const booking = await this.repo.findById(id);
    if (!booking) throw new NotFoundException('Booking not found');

    const idempotent =
      (this.config.get('CANCEL_IDEMPOTENT') as any) !== 'false'; // default true
    if (booking.status === 'cancelled') {
      if (idempotent) return { ...(booking as any), alreadyCancelled: true };
      throw new ConflictException('Booking already cancelled');
    }

    const who = parseBy(dto.by);
    const grace = Number(this.config.get('CANCEL_GRACE_MINUTES') ?? 120) || 120;
    const allowInside =
      (this.config.get('CANCEL_ALLOW_CLIENT_INSIDE_GRACE') as any) === 'true';

    // PERMISOS
    if (who.kind === 'admin') {
      // admin siempre puede
    } else if (who.kind === 'user') {
      const owner = booking.userId && booking.userId === who.value;
      if (!owner)
        throw new ForbiddenException('Not allowed to cancel this booking');
      if (!allowInside && minutesUntil(booking.startTime) < grace) {
        throw new ForbiddenException('Too late to cancel');
      }
    } else if (who.kind === 'wa') {
      // Comprobación por teléfono del contacto
      const waPhone = await this.repo.findWaPhoneByBookingId(booking.id);
      if (!waPhone)
        throw new ForbiddenException(
          'Not allowed to cancel this booking (wa owner unknown)',
        );
      if (normalizeWa(waPhone) !== normalizeWa(who.value)) {
        throw new ForbiddenException('Not allowed to cancel this booking');
      }
      if (!allowInside && minutesUntil(booking.startTime) < grace) {
        throw new ForbiddenException('Too late to cancel');
      }
    }

    const updated = await this.repo.cancel(id, {
      reason: dto.reason ?? null,
      by: `${who.kind}:${who.value}`,
    });

    return updated;
  }
}
