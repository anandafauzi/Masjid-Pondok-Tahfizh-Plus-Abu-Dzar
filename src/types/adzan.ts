export interface MuadzinOption {
  id: string;
  name: string;
  country: string;
  flag: string;
  location: string;
  audioSrc: string;
  description: string;
  isFajrSpecial?: boolean;
}

export interface AdzanSettings {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  selectedMuadzinId: string;
  volume: number; // 0.0 to 1.0
}

export const MUADZIN_OPTIONS: MuadzinOption[] = [
  {
    id: "makkah",
    name: "Syekh Ali Ahmad Mulla",
    country: "Arab Saudi",
    flag: "🇸🇦",
    location: "Masjidil Haram, Makkah Al-Mukarramah",
    audioSrc: "/audio/adzan/makkah.mp3",
    description: "Lantunan legendaris Muadzin Resmi Masjidil Haram dengan nada khas Hijaz.",
  },
  {
    id: "madinah",
    name: "Syekh Abdul Majeed Surayhi",
    country: "Arab Saudi",
    flag: "🇸🇦",
    location: "Masjid Nabawi, Madinah Al-Munawwarah",
    audioSrc: "/audio/adzan/madinah.mp3",
    description: "Adzan merdu dan khusyuk khas Kota Nabi Al-Madinah Al-Munawwarah.",
  },
  {
    id: "alaqsa",
    name: "Syekh Naji Qazzaz",
    country: "Palestina",
    flag: "🇵🇸",
    location: "Masjid Al-Aqsha, Al-Quds",
    audioSrc: "/audio/adzan/alaqsa.mp3",
    description: "Gema adzan penuh haru dari kiblat pertama umat Islam di Al-Quds.",
  },
  {
    id: "turkey",
    name: "Makam Rast Istanbul",
    country: "Turki",
    flag: "🇹🇷",
    location: "Masjid Sultan Ahmed (Blue Mosque), Istanbul",
    audioSrc: "/audio/adzan/turkey.mp3",
    description: "Langgam khas Dinasti Utsmani dengan nada Rast yang anggun dan berwibawa.",
  },
  {
    id: "egypt",
    name: "Syekh Mustafa Ismail",
    country: "Mesir",
    flag: "🇪🇬",
    location: "Kairo, Mesir",
    audioSrc: "/audio/adzan/egypt.mp3",
    description: "Cengkok adzan klasik Mesir yang masyhur dengan nada Syikah dan Bayati.",
  },
  {
    id: "indonesia",
    name: "Langgam Nusantara Kemenag",
    country: "Indonesia",
    flag: "🇮🇩",
    location: "Masjid Istiqlal / Nasional Indonesia",
    audioSrc: "/audio/adzan/indonesia.mp3",
    description: "Adzan syahdu dan menyejukkan hati khas masjid-masjid di tanah air.",
  },
  {
    id: "fajr-makkah",
    name: "Khusus Subuh (Masjidil Haram)",
    country: "Arab Saudi",
    flag: "🌙",
    location: "Makkah Al-Mukarramah",
    audioSrc: "/audio/adzan/fajr-makkah.mp3",
    description: "Lengkap dengan seruan: 'Ash-shalatu khairum minan naum' (Shalat lebih baik dari tidur).",
    isFajrSpecial: true,
  },
];

export const DEFAULT_ADZAN_SETTINGS: AdzanSettings = {
  soundEnabled: true,
  notificationsEnabled: false,
  selectedMuadzinId: "makkah",
  volume: 0.8,
};
