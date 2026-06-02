export class AvailabilityHoursQuery {
  courtType?: string;
  date?: string;
}

export class AvailabilityCourtsQuery extends AvailabilityHoursQuery {
  time?: string;
}
