const DEG = Math.PI / 180;

function normalize(value: number, max: number) {
  return ((value % max) + max) % max;
}

function dayOfYear(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((current - start) / 86_400_000);
}

/**
 * NOAA-style sunrise/sunset approximation. Returned Date is UTC-backed but
 * displays correctly in the browser's local timezone.
 */
export function solarEvent(date: Date, latitude: number, longitude: number, event: "sunrise" | "sunset") {
  const n = dayOfYear(date);
  const lngHour = longitude / 15;
  const t = n + ((event === "sunrise" ? 6 : 18) - lngHour) / 24;
  const m = 0.9856 * t - 3.289;
  let l = m + 1.916 * Math.sin(m * DEG) + 0.02 * Math.sin(2 * m * DEG) + 282.634;
  l = normalize(l, 360);

  let ra = Math.atan(0.91764 * Math.tan(l * DEG)) / DEG;
  ra = normalize(ra, 360);
  const lQuadrant = Math.floor(l / 90) * 90;
  const raQuadrant = Math.floor(ra / 90) * 90;
  ra = (ra + lQuadrant - raQuadrant) / 15;

  const sinDec = 0.39782 * Math.sin(l * DEG);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(90.833 * DEG) - sinDec * Math.sin(latitude * DEG)) /
    (cosDec * Math.cos(latitude * DEG));
  if (cosH > 1 || cosH < -1) return null;

  let h = Math.acos(cosH) / DEG;
  if (event === "sunrise") h = 360 - h;
  h /= 15;

  const localMean = h + ra - 0.06571 * t - 6.622;
  const utcHour = normalize(localMean - lngHour, 24);
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return new Date(midnight + utcHour * 3_600_000);
}

export type AdhkarWindow = {
  next: Date;
  kind: "morning" | "evening";
  precise: boolean;
};

export function nextAdhkarWindow(now: Date, coords?: { latitude: number; longitude: number }): AdhkarWindow {
  if (coords) {
    const sunrise = solarEvent(now, coords.latitude, coords.longitude, "sunrise");
    const sunset = solarEvent(now, coords.latitude, coords.longitude, "sunset");
    if (sunrise && now < sunrise) return { next: sunrise, kind: "morning", precise: true };
    if (sunset && now < sunset) return { next: sunset, kind: "evening", precise: true };

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowSunrise = solarEvent(tomorrow, coords.latitude, coords.longitude, "sunrise");
    if (tomorrowSunrise) return { next: tomorrowSunrise, kind: "morning", precise: true };
  }

  // Privacy-safe fallback until the browser grants location.
  const fallback = new Date(now);
  if (now.getHours() < 18) {
    fallback.setHours(18, 0, 0, 0);
    return { next: fallback, kind: "evening", precise: false };
  }
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(6, 0, 0, 0);
  return { next: fallback, kind: "morning", precise: false };
}

export function formatCountdown(now: Date, target: Date) {
  const totalMinutes = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}
