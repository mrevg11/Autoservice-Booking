const KYIV_TZ = 'Europe/Kiev';

export function toKyivDisplay(
  isoString: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Date(isoString).toLocaleString('uk-UA', {
    timeZone: KYIV_TZ,
    ...options,
  });
}

export function kyivToUTC(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  // Treat date+time as Kyiv local (UTC+3): subtract 3h to get UTC
  return new Date(Date.UTC(year, month - 1, day, hours - 3, minutes)).toISOString();
}
