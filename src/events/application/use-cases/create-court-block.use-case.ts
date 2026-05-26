import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { BookingRepository } from '../../domain/repositories/booking.repository';
import {
  CourtBlock,
  CourtBlockStatus,
} from '../../domain/entities/court-block';
import { CourtBlockRepository } from '../../domain/repositories/court-block.repository';
import { CreateCourtBlockDto } from '../../interface/dto/create-court-block.dto';

const BUSINESS_TZ = 'America/Santiago';

function getLocalDateTimeParts(date: Date, timeZone = BUSINESS_TZ): {
  ymd: string;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const year = String(map.year ?? '0000');
  const month = String(map.month ?? '01');
  const day = String(map.day ?? '01');

  return {
    ymd: `${year}-${month}-${day}`,
  };
}

@Injectable()
export class CreateCourtBlockUseCase {
  constructor(
    @Inject('CourtBlockRepository')
    private readonly blocksRepo: CourtBlockRepository,
    @Inject('BookingRepository')
    private readonly bookingRepo: BookingRepository,
  ) {}

  async execute(
    dto: CreateCourtBlockDto,
    createdBy?: string | null,
  ): Promise<CourtBlock> {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    if (!(start instanceof Date) || isNaN(start.getTime())) {
      throw new ConflictException('startTime inválido');
    }

    if (!(end instanceof Date) || isNaN(end.getTime()) || end <= start) {
      throw new ConflictException(
        'endTime inválido (debe ser mayor a startTime)',
      );
    }

    const startLocal = getLocalDateTimeParts(start);
    const endLocal = getLocalDateTimeParts(end);

    if (startLocal.ymd !== endLocal.ymd) {
      throw new ConflictException('El bloqueo no puede cruzar de día.');
    }

    const blockDate = dto.date?.trim() || startLocal.ymd;

    if (blockDate !== startLocal.ymd) {
      throw new ConflictException(
        'La fecha enviada no coincide con el horario del bloqueo.',
      );
    }

    const overlapsBlock = await this.blocksRepo.existsActiveOverlap(
      dto.courtId,
      start,
      end,
    );

    if (overlapsBlock) {
      throw new ConflictException(
        'Ya existe un bloqueo activo en ese día/horario para esa cancha.',
      );
    }

    const overlapsBooking = await this.bookingRepo.existsActiveOverlap(
      dto.courtId,
      start,
      end,
    );

    if (overlapsBooking) {
      throw new ConflictException(
        'No se puede bloquear la cancha porque ya existe una reserva activa en ese horario.',
      );
    }

    const toCreate: Omit<CourtBlock, 'id'> = {
      courtId: dto.courtId,
      startTime: start,
      endTime: end,
      date: blockDate,
      type: dto.type,
      status: dto.status ?? CourtBlockStatus.Active,
      title: dto.title ?? null,
      reason: dto.reason ?? null,
      createdBy: createdBy ?? null,
      cancelledAt: null,
      cancelledBy: null,
      cancelReason: null,
      createdAt: null,
      updatedAt: null,
    };

    return this.blocksRepo.create(toCreate);
  }
}
