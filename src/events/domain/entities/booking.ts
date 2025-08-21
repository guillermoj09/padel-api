export class Booking {
  constructor(
    public id: string,
    public userId: string | null,
    public courtId: number,
    public paymentId: string | null,
    public startTime: Date,
    public endTime: Date,
    public status: string,
    public date: string,
    public contactId?: string,
  ) {}
}
