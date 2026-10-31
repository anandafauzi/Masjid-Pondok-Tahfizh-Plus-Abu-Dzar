import { NextResponse } from "next/server";
import { getMosqueSettings, getDisplaySettings } from "@/lib/settings";
import { TIMEZONE } from "@/lib/datetime";
import { getWeatherDescription, type WeatherInfo } from "@/lib/weather";

export const revalidate = 900; // Cache 15 menit

const FALLBACK_LAT = -6.442126;
const FALLBACK_LON = 106.640654;

function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export async function GET() {
  const [mosque, display] = await Promise.all([
    getMosqueSettings(),
    getDisplaySettings(),
  ]);

  const theme = display.themeSettings;
  const locationName = theme?.weatherCity?.trim() || "Rumpin, Bogor";

  // Jangan pakai `||` di sini: latitude/longitude 0 adalah koordinat valid.
  const lat = isValidLatitude(mosque.latitude) ? mosque.latitude : FALLBACK_LAT;
  const lon = isValidLongitude(mosque.longitude)
    ? mosque.longitude
    : FALLBACK_LON;
  const timezone = mosque.timezone || TIMEZONE;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,is_day,weather_code&timezone=${encodeURIComponent(timezone)}`;

    const res = await fetch(url, {
      next: { revalidate: 900 },
      headers: { "User-Agent": "MasjidAbuDzar-TV/1.0" },
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo returned status ${res.status}`);
    }

    const data = await res.json();
    const current = data?.current ?? {};

    const { condition, icon } = getWeatherDescription(
      current.weather_code ?? 1,
      current.is_day ?? 1
    );

    const payload: WeatherInfo = {
      temperature: Math.round(current.temperature_2m ?? 28),
      humidity: Math.round(current.relative_humidity_2m ?? 75),
      condition,
      icon,
      locationName,
    };

    return NextResponse.json(payload);
  } catch {
    // Graceful fallback if offline or API unavailable
    const fallback: WeatherInfo = {
      temperature: 28,
      humidity: 75,
      condition: "Cerah Berawan",
      icon: "🌤️",
      locationName,
    };
    return NextResponse.json(fallback);
  }
}
