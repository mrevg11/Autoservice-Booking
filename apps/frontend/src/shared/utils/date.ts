const KYIV_TZ = 'Europe/Kyiv';

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

  // First guess: assume UTC+3 (Kyiv summer / EEST)
  const approx = new Date(Date.UTC(year, month - 1, day, hours - 3, minutes));

  // Verify: check what Kyiv actually shows at this UTC moment (handles DST: UTC+2 in winter)
  const kyivH = Number(
    new Intl.DateTimeFormat('en', {
      timeZone: KYIV_TZ,
      hour: '2-digit',
      hour12: false,
    }).format(approx),
  );

  if (kyivH !== hours) {
    // DST is off — Kyiv is UTC+2 (winter / EET)
    return new Date(Date.UTC(year, month - 1, day, hours - 2, minutes)).toISOString();
  }

  return approx.toISOString();
}

export function isoToKyivTime(iso: string): string {
  return new Date(iso).toLocaleString('uk-UA', {
    timeZone: KYIV_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function isoToKyivDate(iso: string): string {
  const parts = new Date(iso).toLocaleDateString('uk-UA', {
    timeZone: KYIV_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).split('.');
  // uk-UA returns DD.MM.YYYY → reverse to YYYY-MM-DD
  return parts.reverse().join('-');
}
