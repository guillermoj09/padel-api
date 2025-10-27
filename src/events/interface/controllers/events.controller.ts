import {
  Body,
  Controller,
  Post,
  Query,
  Get,
  Param,
  UseGuards,
  Req,
  Delete,
  HttpCode,
  ParseIntPipe,
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
import { Booking, BookingStatus } from 'src/events/domain/entities/booking';

@Controller('bookings')
export class BookingController {
  constructor(
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly getBookingsByCourtUseCase: GetBookingsByCourtUseCase,
    private readonly cancelBooking: CancelBookingUseCase,
  ) {}
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('administrador')
  @Get('court/:courtId/events')
  async getBookingsByCourt(
    @Param('courtId') courtId: string,
    @Query('start') start: Date,
    @Query('end') end: Date,
  ) {
    const data = this.getBookingsByCourtUseCase.execute(courtId, start, end);
    return data;
  }

  @UseGuards(AuthGuard('jwt'))
  @Roles('administrador')
  @Get('me')
  me(@Req() req: any) {
    console.log(`hola ${process.env.JWT_SECRET}`);
    return { user: req.user || null };
  }

  @Post()
  async createBooking(@Body() dto: CreateBookingDto) {
    console.log('entro');
    console.log(
      `cuerpo ${dto.courtId} ${dto.endTime} ${dto.userId} ${dto.startTime}`,
    );
    const bookingInput = {
      userId: dto.userId,
      courtId: dto.courtId,
      paymentId: null,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      status: dto.status as BookingStatus,
      date: nowYMD(), // día de la reserva (recomendado)
    };

    return this.createBookingUseCase.execute(bookingInput);
  }
  @Patch(':id/cancel')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  // @ApiOkResponse({ description: 'Booking cancelado', type: BookingSwaggerModel })
  async cancelBookingById(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ): Promise<Booking> {
    return this.cancelBooking.execute(id, dto);
  }
}
