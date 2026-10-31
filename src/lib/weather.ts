export interface WeatherInfo {
  temperature: number;
  humidity: number;
  condition: string;
  icon: string;
  locationName: string;
}

export function getWeatherDescription(code: number, isDay: number = 1): { condition: string; icon: string } {
  switch (code) {
    case 0:
      return isDay ? { condition: "Cerah", icon: "☀️" } : { condition: "Cerah Berbintang", icon: "🌙" };
    case 1:
      return isDay ? { condition: "Cerah Berawan", icon: "🌤️" } : { condition: "Berawan Malam", icon: "☁️" };
    case 2:
      return { condition: "Sebagian Berawan", icon: "⛅" };
    case 3:
      return { condition: "Berawan Tebal", icon: "☁️" };
    case 45:
    case 48:
      return { condition: "Berkabut", icon: "🌫️" };
    case 51:
    case 53:
    case 55:
      return { condition: "Gerimis Halus", icon: "🌦️" };
    case 61:
    case 63:
      return { condition: "Hujan Ringan", icon: "🌧️" };
    case 65:
      return { condition: "Hujan Lebat", icon: "🌧️" };
    case 80:
    case 81:
    case 82:
      return { condition: "Hujan Lokal", icon: "🌧️" };
    case 95:
    case 96:
    case 99:
      return { condition: "Hujan Petir", icon: "⛈️" };
    default:
      return { condition: "Cerah Sejuk", icon: "🌤️" };
  }
}

