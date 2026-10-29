"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Coordinates, Qibla } from "adhan";
import {
  Navigation,
  MapPin,
  RotateCw,
  Sparkles,
  Smartphone,
  CheckCircle2,
  HelpCircle,
  Sliders,
  RefreshCw,
} from "lucide-react";

interface QiblaCompassProps {
  defaultLat?: number;
  defaultLng?: number;
  mosqueName?: string;
  mosqueAddress?: string | null;
}

const DEFAULT_LAT = -6.442126; // Rumpin, Bogor
const DEFAULT_LNG = 106.640654;

function calculateDistanceKm(lat: number, lng: number): number {
  const R = 6371; // Earth radius in km
  const kaabaLat = 21.422487;
  const kaabaLng = 39.826206;
  const dLat = ((kaabaLat - lat) * Math.PI) / 180;
  const dLng = ((kaabaLng - lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat * Math.PI) / 180) *
      Math.cos((kaabaLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function QiblaCompass({
  defaultLat = DEFAULT_LAT,
  defaultLng = DEFAULT_LNG,
  mosqueName = "Masjid Pondok Tahfizh Plus Abu Dzar",
  mosqueAddress = "Rumpin, Kabupaten Bogor, Jawa Barat",
}: QiblaCompassProps) {
  // Coordinates State
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: defaultLat,
    lng: defaultLng,
  });
  const [locationName, setLocationName] = useState<string>("Masjid Abu Dzar (Rumpin, Bogor)");
  const [isCustomGps, setIsCustomGps] = useState<boolean>(false);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);

  // Compass Heading & Sensor State
  const [heading, setHeading] = useState<number>(0);
  const [sensorActive, setSensorActive] = useState<boolean>(false);
  const [sensorSupported, setSensorSupported] = useState<boolean | null>(null);
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied">("prompt");
  const [isManualSim, setIsManualSim] = useState<boolean>(false);
  const [hasVibrated, setHasVibrated] = useState<boolean>(false);

  // Smooth angle interpolation ref
  const lastHeadingRef = useRef<number>(0);

  // Compute Qibla angle & distance
  const qiblaAngle = Number(Qibla(new Coordinates(coords.lat, coords.lng)).toFixed(1));
  const distanceKm = calculateDistanceKm(coords.lat, coords.lng);

  // Difference between current heading and Qibla angle (-180 to +180)
  let diff = (qiblaAngle - heading + 360) % 360;
  if (diff > 180) diff -= 360;
  const isAligned = Math.abs(diff) <= 3;

  // Handle device orientation events
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    let currentHeading: number | null = null;

    // iOS Safari
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyEvent = event as any;
    if (
      typeof anyEvent.webkitCompassHeading === "number" &&
      !isNaN(anyEvent.webkitCompassHeading)
    ) {
      currentHeading = anyEvent.webkitCompassHeading;
    } else if (event.alpha !== null && !isNaN(event.alpha)) {
      // Android / Standard Chrome with 3D tilt compensation
      const { alpha, beta, gamma } = event;
      if (
        beta !== null &&
        gamma !== null &&
        (Math.abs(beta) >= 8 || Math.abs(gamma) >= 8)
      ) {
        const degToRad = Math.PI / 180;
        const a = alpha * degToRad;
        const b = beta * degToRad;
        const g = gamma * degToRad;

        const cA = Math.cos(a),
          sA = Math.sin(a);
        const cG = Math.cos(g),
          sG = Math.sin(g);
        const sB = Math.sin(b);

        const yX = -cA * sG - sA * sB * cG;
        const yY = -sA * sG + cA * sB * cG;

        const h = Math.atan2(yX, yY) * (180 / Math.PI);
        currentHeading = (h + 360) % 360;
      } else {
        currentHeading = (360 - alpha) % 360;
      }

      // Screen rotation adjustment if any
      const screenAngle =
        window.screen?.orientation?.angle ??
        (window as unknown as { orientation?: number }).orientation ??
        0;
      if (screenAngle) {
        currentHeading = (currentHeading + screenAngle + 360) % 360;
      }
    }

    if (currentHeading !== null) {
      setSensorActive(true);
      setSensorSupported(true);

      // Smooth heading (prevent 359 -> 0 jumping)
      let smoothed = currentHeading;
      const prev = lastHeadingRef.current;
      const delta = ((smoothed - prev + 540) % 360) - 180;
      smoothed = (prev + delta * 0.4 + 360) % 360;
      lastHeadingRef.current = smoothed;

      setHeading(Math.round(smoothed));
    }
  }, []);

  // Request sensor permission (especially required on iOS 13+)
  async function requestSensorAccess() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any;
      if (typeof win.DeviceOrientationEvent?.requestPermission === "function") {
        const response = await win.DeviceOrientationEvent.requestPermission();
        if (response === "granted") {
          setPermissionState("granted");
          win.addEventListener("deviceorientation", handleOrientation, true);
          setSensorActive(true);
        } else {
          setPermissionState("denied");
          setIsManualSim(true);
        }
      } else if ("ondeviceorientationabsolute" in win) {
        win.addEventListener("deviceorientationabsolute", handleOrientation, true);
        setSensorActive(true);
        setPermissionState("granted");
      } else if ("DeviceOrientationEvent" in win) {
        win.addEventListener("deviceorientation", handleOrientation, true);
        setSensorActive(true);
        setPermissionState("granted");
      } else {
        setSensorSupported(false);
        setIsManualSim(true);
      }
    } catch (e) {
      console.warn("Sensor orientation error:", e);
      setSensorSupported(false);
      setIsManualSim(true);
    }
  }

  // Setup passive sensor listener on mount if permission already granted
  useEffect(() => {
    if (typeof window === "undefined") return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (typeof win.DeviceOrientationEvent?.requestPermission !== "function") {
      if ("ondeviceorientationabsolute" in win) {
        win.addEventListener("deviceorientationabsolute", handleOrientation, true);
      } else if ("DeviceOrientationEvent" in win) {
        win.addEventListener("deviceorientation", handleOrientation, true);
      }
    }

    return () => {
      win.removeEventListener("deviceorientation", handleOrientation);
      win.removeEventListener("deviceorientationabsolute", handleOrientation);
    };
  }, [handleOrientation]);

  // Haptic feedback when facing Qibla
  useEffect(() => {
    if (isAligned && !hasVibrated) {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([70, 40, 70]);
        } catch {
          // ignore
        }
      }
      setHasVibrated(true);
    } else if (!isAligned && hasVibrated) {
      setHasVibrated(false);
    }
  }, [isAligned, hasVibrated]);

  // Auto-request current GPS on mount seamlessly
  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setLocationName(
            `GPS Saya (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`
          );
          setIsCustomGps(true);
        },
        () => {
          // Keep default mosque coordinates
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // Request Geolocation GPS manually
  function requestCurrentGps() {
    if (!navigator.geolocation) {
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocationName(`GPS Akurat (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        setIsCustomGps(true);
        setGpsLoading(false);
      },
      () => {
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function resetToMosque() {
    setCoords({ lat: defaultLat, lng: defaultLng });
    setLocationName("Masjid Abu Dzar (Rumpin, Bogor)");
    setIsCustomGps(false);
  }

  return (
    <div className="space-y-8">
      {/* Target & Status Information Bar */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Qibla Direction Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Derajat Arah Kiblat
          </span>
          <p className="mt-1 font-mono text-3xl font-black text-slate-900">
            {qiblaAngle}° <span className="text-sm font-semibold text-[#557a64]">NW</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Barat Laut ({qiblaAngle}° dari Utara searah jarum jam)
          </p>
        </div>

        {/* Distance Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Jarak Garis Lurus ke Ka&apos;bah
          </span>
          <p className="mt-1 font-mono text-3xl font-black text-slate-900">
            ~{distanceKm.toLocaleString("id-ID")} <span className="text-sm font-semibold text-[#466553]">KM</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Makkah al-Mukarramah, Arab Saudi
          </p>
        </div>

        {/* Current Location Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm text-center flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Titik Acuan Perhitungan
            </span>
            <p className="mt-1 text-sm font-bold text-slate-900 truncate" title={isCustomGps ? locationName : mosqueName}>
              {isCustomGps ? locationName : mosqueName}
            </p>
            <p className="text-[11px] text-slate-500">
              {isCustomGps ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : (mosqueAddress ?? "Rumpin, Bogor")}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            {!isCustomGps ? (
              <button
                type="button"
                onClick={requestCurrentGps}
                disabled={gpsLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#d2dfd6] bg-[#f4f7f5] px-2.5 py-1 text-xs font-semibold text-[#395243] hover:bg-[#e7efe9] transition-colors"
              >
                {gpsLoading ? (
                  <RefreshCw className="h-3 w-3 animate-spin text-[#557a64]" />
                ) : (
                  <MapPin className="h-3 w-3 text-[#557a64]" />
                )}
                <span>Gunakan Lokasi GPS Saya</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={resetToMosque}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <RotateCw className="h-3 w-3" />
                <span>Reset ke Masjid</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Interactive Compass Showcase */}
      <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-12">
        {/* Dynamic Status Guidance Pill */}
        <div
          className={`mb-6 inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition-all duration-300 sm:text-sm ${
            isAligned
              ? "bg-[#466553] text-white shadow-md ring-4 ring-[#466553]/20 scale-105 animate-pulse"
              : "bg-[#f8faf9] text-slate-800 border border-slate-200 shadow-sm"
          }`}
        >
          {isAligned ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-white" />
              <span>✨ ALHAMDULILLAH, TEPAT MENGARAH KIBLAT ✨</span>
            </>
          ) : diff > 0 ? (
            <>
              <RotateCw className="h-4 w-4 text-[#557a64]" />
              <span>Putar perangkat ke <b>KANAN</b> sebesar <b>{Math.round(diff)}°</b></span>
            </>
          ) : (
            <>
              <RotateCw className="h-4 w-4 text-[#557a64] -scale-x-100" />
              <span>Putar perangkat ke <b>KIRI</b> sebesar <b>{Math.round(Math.abs(diff))}°</b></span>
            </>
          )}
        </div>

        {/* Phone Top Direction Indicator Arrow */}
        <div className="flex flex-col items-center mb-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            <Navigation className="h-3.5 w-3.5 text-[#557a64] fill-[#557a64]" />
            <span>Arah Depan Perangkat</span>
          </div>
          <div className="h-3 w-0.5 bg-[#557a64] mt-1" />
        </div>

        {/* Outer Circular Minimalist Compass Housing */}
        <div className="relative flex h-80 w-80 items-center justify-center rounded-full border-2 border-slate-200 bg-[#fbfdfc] p-3 shadow-md sm:h-96 sm:w-96">
          {/* Subtle Concentric Ring Accent */}
          <div className="absolute inset-2 rounded-full border border-dashed border-[#b0c7b7]/60 pointer-events-none" />

          {/* Rotating Compass Dial */}
          <div
            className="relative h-full w-full rounded-full transition-transform duration-200 ease-out flex items-center justify-center"
            style={{ transform: `rotate(${-heading}deg)` }}
          >
            {/* Cardinal Direction Points (U, T, S, B) */}
            <span className="absolute top-2 font-black text-sm text-[#466553] tracking-wider">
              U
            </span>
            <span className="absolute right-3 font-bold text-xs text-slate-400">
              T
            </span>
            <span className="absolute bottom-2 font-bold text-xs text-slate-400">
              S
            </span>
            <span className="absolute left-3 font-bold text-xs text-slate-400">
              B
            </span>

            {/* 360-Degree Degree Ticks */}
            <svg
              className="absolute inset-0 h-full w-full pointer-events-none"
              viewBox="0 0 360 360"
            >
              {Array.from({ length: 36 }).map((_, i) => {
                const deg = i * 10;
                const isMajor = deg % 30 === 0;
                const isCardinal = deg % 90 === 0;
                return (
                  <line
                    key={deg}
                    x1="180"
                    y1={isCardinal ? "14" : isMajor ? "18" : "22"}
                    x2="180"
                    y2="28"
                    stroke={isCardinal ? "#466553" : isMajor ? "#87aa93" : "#cbd5e1"}
                    strokeWidth={isCardinal ? "2.5" : isMajor ? "1.8" : "1"}
                    transform={`rotate(${deg} 180 180)`}
                  />
                );
              })}
            </svg>

            {/* Ka'bah Qibla Marker on Outer Dial */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-start pointer-events-none"
              style={{ transform: `rotate(${qiblaAngle}deg)` }}
            >
              <div className="relative -top-1 flex flex-col items-center animate-bounce">
                {/* Ka'bah Icon Marker */}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-md border-2 transition-all ${
                    isAligned
                      ? "border-[#466553] bg-[#466553] text-white scale-110 ring-4 ring-[#466553]/20"
                      : "border-slate-800 bg-[#0f172a] text-white"
                  }`}
                  title={`Ka'bah (${qiblaAngle}°)`}
                >
                  <span className="text-xl">🕋</span>
                </div>
                {/* Pointer Arrow down towards center */}
                <div
                  className={`h-0 w-0 border-x-4 border-x-transparent border-t-6 transition-colors ${
                    isAligned ? "border-t-[#466553]" : "border-t-[#0f172a]"
                  }`}
                />
              </div>

              {/* Laser Beam to Center when aligned */}
              {isAligned && (
                <div className="h-28 w-0.5 bg-gradient-to-b from-[#466553] to-transparent shadow-[0_0_8px_#557a64]" />
              )}
            </div>

            {/* Center Compass Rose Needle & Pivot */}
            <div
              className="relative flex items-center justify-center"
              style={{ transform: `rotate(${qiblaAngle}deg)` }}
            >
              {/* North / Qibla Pointing Needle */}
              <div
                className={`w-3 sm:w-3.5 h-32 sm:h-36 rounded-full transition-all duration-300 ${
                  isAligned
                    ? "bg-gradient-to-t from-[#2d4135] via-[#466553] to-[#87aa93] shadow-[0_0_12px_rgba(85,122,100,0.5)]"
                    : "bg-gradient-to-t from-[#334155] via-[#64748b] to-[#cbd5e1]"
                }`}
                style={{
                  clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                }}
              />

              {/* Center Pivot Pin */}
              <div className="absolute h-8 w-8 rounded-full border-2 border-white bg-slate-800 shadow-md flex items-center justify-center">
                <div className="h-2.5 w-2.5 rounded-full bg-white shadow-inner" />
              </div>
            </div>
          </div>
        </div>

        {/* Live Heading & Direction Degrees */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-center">
          <div className="rounded-xl border border-slate-200/80 bg-[#fbfdfc] px-4 py-2 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Arah Hadap Kompas</span>
            <span className="font-mono text-lg font-black text-slate-900">
              {heading}°
            </span>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-[#fbfdfc] px-4 py-2 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Target Kiblat</span>
            <span className="font-mono text-lg font-black text-[#466553]">
              {qiblaAngle}°
            </span>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-[#fbfdfc] px-4 py-2 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Selisih Sudut</span>
            <span className={`font-mono text-lg font-black ${isAligned ? "text-[#466553]" : "text-amber-700"}`}>
              {Math.abs(Math.round(diff))}°
            </span>
          </div>
        </div>

        {/* Sensor & Simulation Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {!sensorActive ? (
            <button
              type="button"
              onClick={requestSensorAccess}
              className="inline-flex items-center gap-2 rounded-xl bg-[#557a64] hover:bg-[#466553] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm active:scale-95 transition-all"
            >
              <Smartphone className="h-4 w-4" />
              <span>Aktifkan Sensor Kompas HP</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-xl bg-[#f4f7f5] border border-[#d2dfd6] px-4 py-2 text-xs font-bold text-[#395243]">
              <Sparkles className="h-4 w-4 text-[#557a64]" />
              <span>Sensor Kompas HP Aktif &amp; Berputar Live</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsManualSim(!isManualSim)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#ded5c4] bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-[#19261f] shadow-sm hover:bg-[#faf7f2] transition-colors"
          >
            <Sliders className="h-4 w-4 text-[#7c6630]" />
            <span>{isManualSim ? "Sembunyikan Simulasi" : "Simulasi Manual (Desktop)"}</span>
          </button>
        </div>

        {permissionState === "denied" && (
          <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-center">
            Izin sensor orientasi belum diaktifkan pada browser Anda. Silakan izinkan akses sensor gerak di pengaturan browser atau gunakan mode simulasi manual.
          </p>
        )}
        {sensorSupported === false && (
          <p className="mt-3 text-xs text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-center">
            Perangkat ini tidak memiliki sensor kompas / giroskop fisik (umum pada laptop &amp; komputer desktop). Anda dapat menggunakan kontrol simulasi manual di bawah.
          </p>
        )}

        {/* Manual Simulation Slider (Helpful for desktop/laptop without compass sensor) */}
        {isManualSim && (
          <div className="mt-6 w-full max-w-md rounded-2xl border border-[#ded5c4] bg-white p-4 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#19261f] flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-[#2d946e]" />
                <span>Simulasi Putar Perangkat Manual:</span>
              </span>
              <span className="font-mono text-xs font-bold text-[#2d946e]">{heading}°</span>
            </div>

            <input
              type="range"
              min="0"
              max="359"
              value={heading}
              onChange={(e) => setHeading(Number(e.target.value))}
              className="w-full accent-[#2d946e] cursor-pointer"
            />

            <div className="mt-3 flex items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => setHeading(0)}
                className="flex-1 rounded-lg border border-[#ded5c4] py-1 text-center font-semibold text-[#5a685e] hover:bg-[#faf7f2]"
              >
                Utara (0°)
              </button>
              <button
                type="button"
                onClick={() => setHeading(Math.round(qiblaAngle))}
                className="flex-1 rounded-lg bg-[#2d946e]/10 border border-[#2d946e]/30 py-1 text-center font-bold text-[#1e6149] hover:bg-[#2d946e]/20"
              >
                Kiblat ({Math.round(qiblaAngle)}°)
              </button>
              <button
                type="button"
                onClick={() => setHeading(270)}
                className="flex-1 rounded-lg border border-[#ded5c4] py-1 text-center font-semibold text-[#5a685e] hover:bg-[#faf7f2]"
              >
                Barat (270°)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Calibration & Usage Instructions Guide */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tips for Accuracy */}
        <div className="rounded-3xl border border-[#ded5c4] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="h-5 w-5 text-[#2d946e]" />
            <h3 className="text-base font-bold text-[#19261f]">
              Panduan Akurasi Kompas Digital
            </h3>
          </div>
          <ul className="space-y-2.5 text-xs text-[#5a685e] leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#2d946e] mt-0.5">•</span>
              <span>
                <b>Pegang HP dalam posisi datar (horizontal)</b> di telapak tangan setinggi dada agar giroskop bekerja optimal.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#2d946e] mt-0.5">•</span>
              <span>
                <b>Jauhkan dari interferensi magnetik</b> seperti casing magnetis, speaker audio, laptop, pilar baja, atau peralatan elektronik berdaya tinggi.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#2d946e] mt-0.5">•</span>
              <span>
                <b>Kalibrasi Angka 8 (∞)</b>: Gerakkan handphone membentuk angka 8 di udara selama 3–5 detik jika jarum terasa kaku atau kurang responsif.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#2d946e] mt-0.5">•</span>
              <span>
                <b>Getaran Haptik</b>: Handphone akan bergetar lembut saat posisi depan HP telah sejajar tepat mengarah ke Ka&apos;bah.
              </span>
            </li>
          </ul>
        </div>

        {/* Sharia Reference & Hadith */}
        <div className="rounded-3xl border border-[#eddcb2] bg-gradient-to-br from-[#fdfbf7] via-[#faf4e6] to-[#f4ebd2] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-[#8a6820]" />
            <h3 className="text-base font-bold text-[#19261f]">
              Dalil Menghadap Kiblat
            </h3>
          </div>
          <div className="mb-3 text-right">
            <p className="font-arabic text-base sm:text-lg leading-loose text-[#19261f] font-semibold">
              فَوَلِّ وَجْهَكَ شَطْرَ الْمَسْجِدِ الْحَرَامِ ۚ وَحَيْثُ مَا كُنتُمْ فَوَلُّوا وُجُوهَكُمْ شَطْرَهُ
            </p>
          </div>
          <p className="text-xs text-[#6a5b3a] leading-relaxed italic">
            &quot;Maka hadapkanlah wajahmu ke arah Masjidil Haram. Dan di mana saja kamu berada, hadapkanlah wajahmu ke arahnya.&quot;
          </p>
          <p className="mt-2 text-[11px] font-bold text-[#8a6820]">
            — QS. Al-Baqarah: 144
          </p>
        </div>
      </div>
    </div>
  );
}
