import {
  Body,
  Controller,
  Post,
  Query,
  Get,
  Param,
  UseGuards,
  Req,
  UnauthorizedException,
  UsePipes,
  Patch,
  ValidationPipe,
} from '@nestjs/common';
import { CreateBookingUseCase } from '../../application/use-cases/create-booking.use-case';
import { GetBookingsByCourtUseCase } from 'src/events/application/use-cases/get-bookings-by-court.use-case';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { nowYMD } from '../utils/date';
import { CancelBookingDto } from 'src/events/application/dto/cancel-booking-input';
import { CancelBookingUseCase } from '../../application/use-cases/cancel-booking.use-case';
import { GetCourtReservationsByDateRangeAndStatus } from '../../application/use-cases/get-bookings-by-court-by-range-and-state';
import {
  Booking,
  BookingFilterStatus,
  BookingStatus,
  PaymentMethod,
} from 'src/events/domain/entities/booking';
import { ConfirmBookingPaymentDto } from '../dto/confirm-booking-payment.dto';
import { ConfirmBookingPaymentUseCase } from '../../application/use-cases/confirm-booking-payment.use-case';

@Controller('bookings')
export class BookingController {
  constructor(
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly getBookingsByCourtUseCase: GetBookingsByCourtUseCase,
    private readonly cancelBooking: CancelBookingUseCase,
    private readonly getCourtReservationsByDateRangeAndStatus: GetCourtReservationsByDateRangeAndStatus,
    private readonly confirmBookingPaymentUseCase: ConfirmBookingPaymentUseCase,
  ) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('administrador')
  @Get('court/:courtId/events')
  async getBookingsByCourt(
    @Param('courtId') courtId: string,
    @Query('start') start: Date,
    @Query('end') end: Date,
  ) {
    const data = await this.getBookingsByCourtUseCase.execute(
      courtId,
      start,
      end,
    );
    return data;
  }

  @UseGuards(AuthGuard('jwt'))
  @Roles('administrador')
  @Get('me')
  me(@Req() req: any) {
    return { user: req.user || null };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createBooking(
    @Body() dto: CreateBookingDto,
    @Req() req: Request & { user?: any },
  ) {
    const userId = req.user?.id as string | undefined;
    if (!userId) throw new UnauthorizedException('Sin usuario');

    const bookingInput = {
      userId,
      courtId: dto.courtId,
      paymentId: dto.paymentId ?? null,
      paymentMethod: dto.paymentMethod ?? PaymentMethod.Pendiente,
      startTime: dto.startTime,
      endTime: dto.endTime,
      status: dto.status as BookingStatus,
      title: dto.title,
      contactId: dto.contactId ?? null,
      date: nowYMD(),
    };

    return this.createBookingUseCase.execute(bookingInput);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/cancel')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async cancelBookingById(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @Req() req: Request & { user?: any },
  ): Promise<Booking> {
    const userId = req.user?.id as string | undefined;
    if (!userId) throw new UnauthorizedException('Sin usuario');

    dto.by = `admin:${userId}`;
    return this.cancelBooking.execute(id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/confirm-payment')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async confirmPayment(
    @Param('id') id: string,
    @Body() dto: ConfirmBookingPaymentDto,
    @Req() req: Request & { user?: any },
  ): Promise<Booking> {
    const userId = req.user?.id as string | undefined;
    if (!userId) throw new UnauthorizedException('Sin usuario');

    return this.confirmBookingPaymentUseCase.execute(id, {
      paymentMethod: dto.paymentMethod,
      confirmedBy: userId,
    });
  }

  @Get('court/:courtId')
  async getBookignsByRange(
    @Param('courtId') courtId: string,
    @Query('from') from: Date,
    @Query('to') to: Date,
    @Query('filter') filter?: BookingFilterStatus,
    @Query('status') legacyStatus?: BookingFilterStatus,
  ) {
    const appliedFilter = filter ?? legacyStatus;

    return this.getCourtReservationsByDateRangeAndStatus.execute(
      courtId,
      appliedFilter,
      from,
      to,
    );
  }
}
