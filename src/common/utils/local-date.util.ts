const DEFAULT_TIME_ZONE = 'America/Santiago';

export type LocalDateTimeParts = {
  ymd: string;
  hhmm: string;
  minutes: number;
};

export function getLocalDateTimeParts(
  value: Date | string,
  timeZone = DEFAULT_TIME_ZONE,
): LocalDateTimeParts {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Fecha inválida.');
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const map = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  const year = map.year ?? '0000';
  const month = map.month ?? '01';
  const day = map.day ?? '01';
  const hour = Number(map.hour ?? '00');
  const minute = Number(map.minute ?? '00');

  return {
    ymd: `${year}-${month}-${day}`,
    hhmm: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    minutes: hour * 60 + minute,
  };
}
