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
import { Booking, BookingStatus } from 'src/events/domain/entities/booking';
import { title } from 'process';

@Controller('bookings')
export class BookingController {
  constructor(
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly getBookingsByCourtUseCase: GetBookingsByCourtUseCase,
    private readonly cancelBooking: CancelBookingUseCase,
    private readonly getCourtReservationsByDateRangeAndStatus: GetCourtReservationsByDateRangeAndStatus,
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

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createBooking(
    @Body() dto: CreateBookingDto,
    @Req() req: Request & { user?: any }, // 👈 recibe req
  ) {
    console.log('entro 1');
    const userId = req.user?.id as string | undefined; // viene de JwtStrategy.validate()
    if (!userId) throw new UnauthorizedException('Sin usuario');
    console.log(`entro ${dto.title} `);
    const bookingInput = {
      userId,
      courtId: dto.courtId,
      paymentId: null,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      status: dto.status as BookingStatus,
      title: dto.title,
      date: nowYMD(),
    };

    return this.createBookingUseCase.execute(bookingInput);
  }
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/cancel')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  // @ApiOkResponse({ description: 'Booking cancelado', type: BookingSwaggerModel })
  async cancelBookingById(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @Req() req: Request & { user?: any },
  ): Promise<Booking> {
    const userId = req.user?.id as string | undefined; // viene de JwtStrategy.validate()
    if (!userId) throw new UnauthorizedException('Sin usuario');
    dto.by = `admin:${userId}`;
    return this.cancelBooking.execute(id, dto);
  }

  @Get('court/:courtId')
  async getBookignsByRange(
    @Param('courtId') courtId: string,
    @Query('from') from: Date,
    @Query('to') to: Date,
    @Query('status') status: BookingStatus,
  ) {
    // Mapear string de la query a BookingStatus (o undefined si es inválido)
    let bookingStatus: BookingStatus | undefined = undefined;
    //console.log(status);

    console.log("bookingStatus "+status)
    return this.getCourtReservationsByDateRangeAndStatus.execute(
      courtId,
      status,
      from,
      to,
    );
  }
}
