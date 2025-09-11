import { Body, Controller, Post, Query, Get, Param } from '@nestjs/common';
import { CreateBookingUseCase } from '../../application/use-cases/create-booking.use-case';
import { GetBookingsByCourtUseCase } from 'src/events/application/use-cases/get-bookings-by-court.use-case';

export class CreateBookingDto {
  userId: string;
  courtId: number;
  startTime: Date;
  endTime: Date;
}

@Controller('bookings')
export class BookingController {
  constructor(
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly getBookingsByCourtUseCase: GetBookingsByCourtUseCase,
  ) {}

  @Get('court/:courtId/events')
  async getBookingsByCourt(
    @Param('courtId') courtId: string,
    @Query('start') start: Date,
    @Query('end') end: Date,
  ) {
    //console.log(`${start} ${end}`);
    const data = this.getBookingsByCourtUseCase.execute(courtId, start, end);
    //console.log(data);
    return data;
  }
  /*
  @Post()
  async createBooking(@Body() dto: CreateBookingDto) {
    console.log(
      `cuerpo ${dto.courtId} ${dto.endTime} ${dto.userId} ${dto.startTime}`,
    );
    const bookingInput = {
      userId: dto.userId,
      courtId: dto.courtId,
      paymentId: null,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      status: 'pendiente',
      date: new Date(), // ahora
    };

    return this.createBookingUseCase.execute(bookingInput);
  }*/
}
