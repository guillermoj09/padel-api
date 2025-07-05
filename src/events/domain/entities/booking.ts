export class Booking {
  constructor(
    public id: string,
    public userId: string,
    public courtId: number,
    public paymentId: string | null,
    public startTime: Date,
    public endTime: Date,
    public status: string,
    public date: Date,
  ) {}
}
