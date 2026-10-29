"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { TvData } from "@/lib/public-data";
import {
  MUADZIN_OPTIONS,
  AdzanSettings,
  DEFAULT_ADZAN_SETTINGS,
} from "@/types/adzan";
import {
  getStoredAdzanSettings,
  saveStoredAdzanSettings,
  playAdzanSound,
  stopAdzanSound,
  requestAdzanNotificationPermission,
  showAdzanNotification,
  unlockAudioContext,
} from "@/lib/adzan-audio";
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Bell,
  BellRing,
  ChevronUp,
  ChevronDown,
  Clock,
  User,
  Mic,
  Sparkles,
  CheckCircle2,
  X,
  Sliders,
  Download,
  Smartphone,
  Share2,
} from "lucide-react";

function formatCountdown(targetMs: number, nowMs: number) {
  const total = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function MobilePrayerTaskbar() {
  const [data, setData] = useState<TvData | null>(null);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Settings
  const [settings, setSettings] = useState<AdzanSettings>(DEFAULT_ADZAN_SETTINGS);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [notifGranted, setNotifGranted] = useState(false);

  // Track last played prayer to prevent repeat triggers
  const lastTriggeredKey = useRef<string | null>(null);

  // PWA Install Prompt State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  // 1. Fetch live TV / Prayer data
  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/public/tv-data", { cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as TvData;
      setData(d);
      setOffset(new Date(d.serverTime).getTime() - Date.now());
    } catch {
      // keep last state
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    setSettings(getStoredAdzanSettings());
    loadData();

    const dataPoll = setInterval(loadData, 30000);
    const clock = setInterval(() => setNow(Date.now()), 1000);

    // Global tap unlock for audio
    const handleFirstTouch = () => {
      unlockAudioContext();
      window.removeEventListener("touchstart", handleFirstTouch);
      window.removeEventListener("click", handleFirstTouch);
    };
    window.addEventListener("touchstart", handleFirstTouch, { once: true, passive: true });
    window.addEventListener("click", handleFirstTouch, { once: true });

    // PWA Install Prompt & Notification Check
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handleBeforeInstall: ((e: any) => void) | null = null;
    if (typeof window !== "undefined") {
      setNotifGranted("Notification" in window && Notification.permission === "granted");
      if (window.matchMedia("(display-mode: standalone)").matches) {
        setIsStandalone(true);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handleBeforeInstall = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    }

    return () => {
      clearInterval(dataPoll);
      clearInterval(clock);
      window.removeEventListener("touchstart", handleFirstTouch);
      window.removeEventListener("click", handleFirstTouch);
      if (handleBeforeInstall) {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      }
    };
  }, [loadData]);

  const serverNow = now + offset;

  // 2. Compute dynamic countdown state (Adzan vs Iqamah)
  const prayerState = useMemo(() => {
    if (!data || !data.iqamahEvents || data.iqamahEvents.length === 0) {
      return null;
    }

    const events = data.iqamahEvents;

    // Check if we are currently between adzan & iqamah for any prayer
    const activeIqamahEvent = events.find((e) => {
      const adhanMs = new Date(e.adhanTarget).getTime();
      const iqamahMs = new Date(e.iqamahTarget).getTime();
      return serverNow >= adhanMs && serverNow < iqamahMs;
    });

    if (activeIqamahEvent) {
      const iqamahMs = new Date(activeIqamahEvent.iqamahTarget).getTime();
      return {
        phase: "IQAMAH" as const,
        prayerKey: activeIqamahEvent.key,
        prayerLabel: activeIqamahEvent.label,
        adhanTime: activeIqamahEvent.adhanTime,
        iqamahTime: activeIqamahEvent.iqamahTime,
        targetMs: iqamahMs,
        countdownStr: formatCountdown(iqamahMs, serverNow),
        badgeText: "Waktu Masuk • Menuju Iqamah",
        isFajr: activeIqamahEvent.key === "fajr",
      };
    }

    // Otherwise, find the next upcoming prayer today
    const upcomingEvent = events.find((e) => {
      const adhanMs = new Date(e.adhanTarget).getTime();
      return adhanMs > serverNow;
    });

    if (upcomingEvent) {
      const adhanMs = new Date(upcomingEvent.adhanTarget).getTime();
      return {
        phase: "ADZAN" as const,
        prayerKey: upcomingEvent.key,
        prayerLabel: upcomingEvent.label,
        adhanTime: upcomingEvent.adhanTime,
        iqamahTime: upcomingEvent.iqamahTime,
        targetMs: adhanMs,
        countdownStr: formatCountdown(adhanMs, serverNow),
        badgeText: "Menuju Waktu Shalat",
        isFajr: upcomingEvent.key === "fajr",
      };
    }

    // If all prayers today have finished, target tomorrow's Subuh
    const tomorrowMs = data.nextPrayer?.target
      ? new Date(data.nextPrayer.target).getTime()
      : serverNow + 3600000 * 8;

    return {
      phase: "TOMORROW" as const,
      prayerKey: "fajr",
      prayerLabel: data.nextPrayer?.label || "Subuh Esok",
      adhanTime: data.nextPrayer?.time || data.prayerTimes.fajr,
      iqamahTime: "--:--",
      targetMs: tomorrowMs,
      countdownStr: formatCountdown(tomorrowMs, serverNow),
      badgeText: "Shalat Esok Hari",
      isFajr: true,
    };
  }, [data, serverNow]);

  // 3. Find Imam and Muadzin for the active/next prayer
  const nextImamSchedule = useMemo(() => {
    if (!data || !prayerState) return null;
    const targetLabel = prayerState.prayerLabel.toLowerCase();

    // Map possible labels to standard names
    const match = data.imamToday.find((s) => {
      const p = s.prayerName.toLowerCase();
      if (targetLabel.includes("subuh") && p.includes("subuh")) return true;
      if (targetLabel.includes("zuhur") && p.includes("zuhur")) return true;
      if (targetLabel.includes("asar") && p.includes("asar")) return true;
      if (targetLabel.includes("magrib") && p.includes("magrib")) return true;
      if (targetLabel.includes("isya") && p.includes("isya")) return true;
      return false;
    });

    if (match) {
      return {
        imamName: match.imamName,
        muadzinName: match.muadzinName,
      };
    }

    return {
      imamName: "Asatidz Pondok Tahfizh",
      muadzinName: "Santri Abu Dzar",
    };
  }, [data, prayerState]);

  // 4. Auto-trigger Adzan Audio & Notification when adzan target is reached
  useEffect(() => {
    if (!data || !prayerState || !mounted) return;

    // Check each prayer event to see if current time just crossed adhanTarget (within a 60-second window)
    for (const e of data.iqamahEvents) {
      const adhanMs = new Date(e.adhanTarget).getTime();
      const diff = serverNow - adhanMs;
      // Window: between 0 and 59 seconds after adzan time
      if (diff >= 0 && diff < 60000) {
        const triggerKey = `${data.today}_${e.key}`;
        if (lastTriggeredKey.current !== triggerKey) {
          lastTriggeredKey.current = triggerKey;

          // Find active muadzin
          const targetMuadzin = MUADZIN_OPTIONS.find(
            (m) => m.id === settings.selectedMuadzinId
          );

          // Play Sound if enabled
          if (settings.soundEnabled) {
            playAdzanSound(
              settings.selectedMuadzinId,
              e.key === "fajr",
              settings.volume
            );
            setIsPlayingAudio(true);
          }

          // Show Push / Screen Notification if enabled
          if (settings.notificationsEnabled) {
            showAdzanNotification(e.label, targetMuadzin?.name);
          }
        }
      }
    }
  }, [data, prayerState, serverNow, mounted, settings]);

  // Audio Play / Preview Handlers
  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      stopAdzanSound();
      setIsPlayingAudio(false);
      setPreviewingId(null);
    } else {
      unlockAudioContext();
      playAdzanSound(settings.selectedMuadzinId, false, settings.volume);
      setIsPlayingAudio(true);
      setPreviewingId(settings.selectedMuadzinId);
    }
  };

  const handlePreviewMuadzin = (id: string, isFajr = false) => {
    unlockAudioContext();
    if (previewingId === id && isPlayingAudio) {
      stopAdzanSound();
      setIsPlayingAudio(false);
      setPreviewingId(null);
    } else {
      playAdzanSound(id, isFajr, settings.volume);
      setIsPlayingAudio(true);
      setPreviewingId(id);
    }
  };

  const updateSetting = <K extends keyof AdzanSettings>(
    key: K,
    val: AdzanSettings[K]
  ) => {
    const next = saveStoredAdzanSettings({ [key]: val });
    setSettings(next);
  };

  const handleRequestNotif = async () => {
    const granted = await requestAdzanNotificationPermission();
    setNotifGranted(granted);
    updateSetting("notificationsEnabled", granted);
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
      setIsStandalone(true);
    }
  };

  if (!mounted) return null;

  if (!data || !prayerState) {
    return (
      <aside
        aria-label="Panel Pintasan Waktu Sholat dan Jadwal Imam"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#2d946e]/40 bg-[#0c1f16]/95 text-white backdrop-blur-md shadow-2xl transition-all"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)" }}
      >
        <div className="mx-auto max-w-7xl px-3 pt-2 pb-1 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2d946e]/20 text-white animate-pulse">
                🕌
              </div>
              <div>
                <p className="text-xs font-bold text-white">Memuat Waktu Sholat &amp; Jadwal Imam...</p>
                <p className="text-[10px] text-[#9db3a6]">Pondok Tahfizh Plus Abu Dzar</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const activeMuadzin =
    MUADZIN_OPTIONS.find((m) => m.id === settings.selectedMuadzinId) ??
    MUADZIN_OPTIONS[0];

  return (
    <>
      {/* 1. STICKY MOBILE TASKBAR BAR (FIXED AT BOTTOM) */}
      <aside
        aria-label="Panel Pintasan Waktu Sholat dan Jadwal Imam"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#2d946e]/40 bg-[#0c1f16]/95 text-white backdrop-blur-md shadow-2xl transition-all"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)" }}
      >
        <div className="mx-auto max-w-7xl px-3 pt-2 sm:px-6">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            
            {/* Left: Next Prayer Badge & Dynamic Countdown */}
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus:outline-none group"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold shadow-md transition-transform group-hover:scale-105 ${
                  prayerState.phase === "IQAMAH"
                    ? "bg-amber-500 text-slate-950 animate-pulse ring-2 ring-amber-400/80"
                    : "bg-gradient-to-br from-[#2d946e] to-[#1e6149] text-white ring-1 ring-[#3eb489]/40"
                }`}
              >
                {prayerState.phase === "IQAMAH" ? "⏳" : "🕌"}
              </div>

              <div className="min-w-0 flex-1">
                {/* Line 1: Prayer Name & Countdown */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-sm text-white tracking-tight sm:text-base">
                    {prayerState.prayerLabel}
                  </span>
                  <span className="font-mono text-xs text-[#9db3a6] font-semibold">
                    {prayerState.adhanTime}
                  </span>

                  {/* Dynamic Hitung Mundur Pill */}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold font-mono tracking-wider shadow-sm transition-colors ${
                      prayerState.phase === "IQAMAH"
                        ? "bg-amber-400 text-slate-950 animate-pulse"
                        : "bg-[#2d946e]/30 text-[#6ee7b7] border border-[#2d946e]/50"
                    }`}
                  >
                    <span>
                      {prayerState.phase === "IQAMAH" ? "Iqamah" : "Adzan"}:
                    </span>
                    <span className="font-black text-[11px]">
                      {prayerState.countdownStr}
                    </span>
                  </span>
                </div>

                {/* Line 2: Jadwal Imam untuk Sholat Berikutnya */}
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#c1d1c7] truncate">
                  <User className="h-3 w-3 shrink-0 text-[#eddcb2]" />
                  <span className="text-[#a4b8ad] shrink-0 font-medium">Imam:</span>
                  <span className="truncate font-bold text-white">
                    {nextImamSchedule?.imamName ?? "Asatidz Pondok"}
                  </span>
                  {nextImamSchedule?.muadzinName && (
                    <>
                      <span className="text-[#526358]">•</span>
                      <Mic className="h-2.5 w-2.5 shrink-0 text-[#3eb489]" />
                      <span className="hidden xs:inline text-[#a4b8ad] shrink-0">Muadzin:</span>
                      <span className="hidden xs:inline truncate text-[#c1d1c7]">
                        {nextImamSchedule.muadzinName}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </button>

            {/* Right: Sound Control & Expand Panel Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Quick Sound/Muadzin Toggle */}
              <button
                type="button"
                onClick={handleToggleAudio}
                title={
                  isPlayingAudio
                    ? "Hentikan Suara Adzan"
                    : `Putar Adzan (${activeMuadzin.name})`
                }
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
                  isPlayingAudio
                    ? "border-amber-400 bg-amber-500 text-slate-950 animate-bounce"
                    : settings.soundEnabled
                    ? "border-[#2d946e]/40 bg-[#142e22] text-[#6ee7b7] hover:bg-[#1a3a2b]"
                    : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                {isPlayingAudio ? (
                  <Square className="h-4 w-4 fill-current" />
                ) : settings.soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
                {isPlayingAudio && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                  </span>
                )}
              </button>

              {/* Expand Drawer Button */}
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 rounded-xl border border-[#2d946e]/40 bg-gradient-to-r from-[#206f52] to-[#1e6149] px-2.5 py-2 text-xs font-bold text-white shadow-sm hover:from-[#2d946e] hover:to-[#247a5b] active:scale-95 transition-all"
                title="Buka Panel 5 Waktu Sholat & Pilihan Muadzin"
              >
                <span>5 Waktu</span>
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-[#eddcb2]" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5 text-[#eddcb2]" />
                )}
              </button>
            </div>

          </div>
        </div>
      </aside>

      {/* 2. EXPANDED BOTTOM DRAWER (FULL 5 WAKTU SHOLAT & AUDIO SETTINGS) */}
      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setExpanded(false)}
        >
          <div
            className="w-full max-w-2xl rounded-t-3xl border-t border-[#3eb489]/30 bg-[#0d1e16] text-white shadow-2xl max-h-[88vh] overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }}
          >
            {/* Drawer Drag Bar & Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#0d1e16]/95 px-5 py-3.5 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="text-xl">🕌</span>
                <div>
                  <h3 className="font-extrabold text-sm text-white sm:text-base">
                    Jadwal 5 Waktu &amp; Notifikasi Adzan
                  </h3>
                  <p className="text-[11px] text-[#9db3a6]">
                    Masjid Pondok Tahfizh Plus Abu Dzar • Rumpin, Bogor
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                title="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              
              {/* CURRENT ACTIVE SPOTLIGHT CARD */}
              <div className="relative overflow-hidden rounded-2xl border border-[#ecd8a6]/40 bg-gradient-to-br from-[#1b382b] to-[#12261d] p-4 text-white shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/40">
                      <Sparkles className="h-3 w-3" />
                      <span>{prayerState.badgeText}</span>
                    </span>
                    <h4 className="mt-2 text-2xl font-black text-white">
                      {prayerState.prayerLabel}
                    </h4>
                    <p className="text-xs text-[#c1d1c7] mt-0.5">
                      Waktu Adzan: <span className="font-bold font-mono text-white">{prayerState.adhanTime}</span>
                      {prayerState.iqamahTime !== "--:--" && (
                        <>
                          <span className="mx-2 text-white/40">•</span>
                          Iqamah: <span className="font-bold font-mono text-[#eddcb2]">{prayerState.iqamahTime}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#9db3a6] block">
                      {prayerState.phase === "IQAMAH" ? "Menuju Iqamah" : "Hitung Mundur"}
                    </span>
                    <span
                      suppressHydrationWarning
                      className="font-mono text-3xl font-black text-[#eddcb2]"
                    >
                      {prayerState.countdownStr}
                    </span>
                  </div>
                </div>

                {/* Imam & Muadzin next prayer banner */}
                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/25 px-3 py-2 border border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-[#eddcb2]" />
                    <span className="text-[#a4b8ad]">Imam:</span>
                    <span className="font-bold text-white">
                      {nextImamSchedule?.imamName ?? "Asatidz Pondok"}
                    </span>
                  </div>
                  {nextImamSchedule?.muadzinName && (
                    <div className="flex items-center gap-2">
                      <Mic className="h-3.5 w-3.5 text-[#3eb489]" />
                      <span className="text-[#a4b8ad]">Muadzin:</span>
                      <span className="font-semibold text-[#c1d1c7]">
                        {nextImamSchedule.muadzinName}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* TIMELINE 5 WAKTU SHOLAT */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#9db3a6] mb-2.5 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#3eb489]" />
                  <span>Jadwal 5 Waktu Sholat Hari Ini</span>
                </h4>

                <div className="space-y-2">
                  {data.iqamahEvents.map((item) => {
                    const adhanMs = new Date(item.adhanTarget).getTime();
                    const iqamahMs = new Date(item.iqamahTarget).getTime();
                    const isPassed = serverNow >= iqamahMs;
                    const isBetween = serverNow >= adhanMs && serverNow < iqamahMs;
                    const isCurrent = prayerState.prayerKey === item.key;

                    // Match Imam for this prayer
                    const imamInfo = data.imamToday.find((s) =>
                      s.prayerName.toLowerCase().includes(item.label.toLowerCase())
                    );

                    return (
                      <div
                        key={item.key}
                        className={`rounded-xl border p-3 transition-all ${
                          isBetween
                            ? "border-amber-400 bg-amber-500/15 ring-1 ring-amber-400"
                            : isCurrent
                            ? "border-[#3eb489] bg-[#163628]"
                            : isPassed
                            ? "border-white/5 bg-white/5 opacity-70"
                            : "border-white/10 bg-[#12261d]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">
                              {item.key === "fajr"
                                ? "🌅"
                                : item.key === "dhuhr"
                                ? "☀️"
                                : item.key === "asr"
                                ? "🌤️"
                                : item.key === "maghrib"
                                ? "🌇"
                                : "🌙"}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white">
                                  {item.label}
                                </span>
                                <span className="font-mono text-xs font-bold text-[#eddcb2]">
                                  {item.adhanTime}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#9db3a6]">
                                Estimasi Iqamah: <span className="font-mono text-white">{item.iqamahTime}</span>
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            {isPassed ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-slate-400">
                                <CheckCircle2 className="h-3 w-3 text-slate-400" />
                                <span>Selesai</span>
                              </span>
                            ) : isBetween ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-950 animate-pulse">
                                <span>Iqamah: {formatCountdown(iqamahMs, serverNow)}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#2d946e]/20 px-2 py-0.5 text-[10px] font-mono text-[#6ee7b7] border border-[#2d946e]/40">
                                <span>Adzan: {formatCountdown(adhanMs, serverNow)}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Petugas Imam & Muadzin per prayer */}
                        {imamInfo && (
                          <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#c1d1c7]">
                            <span className="truncate">
                              <span className="text-[#a4b8ad]">Imam:</span>{" "}
                              <strong className="text-white font-semibold">{imamInfo.imamName}</strong>
                            </span>
                            {imamInfo.muadzinName && (
                              <span className="truncate text-right ml-2">
                                <span className="text-[#a4b8ad]">Muadzin:</span>{" "}
                                <span className="text-[#c1d1c7]">{imamInfo.muadzinName}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: PENGATURAN NOTIFIKASI & PILIHAN MUADZIN */}
              <div className="rounded-2xl border border-white/10 bg-[#12261d] p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#9db3a6] mb-3 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-[#3eb489]" />
                  <span>Pengaturan Notifikasi &amp; Suara Adzan</span>
                </h4>

                {/* Toggles */}
                <div className="space-y-3 border-b border-white/10 pb-4">
                  {/* Toggle Suara Adzan */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Bunyikan Suara Adzan</p>
                      <p className="text-[10px] text-[#9db3a6]">
                        Memutar lantunan suara adzan saat waktu sholat tiba
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateSetting("soundEnabled", !settings.soundEnabled)
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.soundEnabled ? "bg-[#2d946e]" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings.soundEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Toggle Notifikasi Layar HP */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Notifikasi Layar HP</p>
                      <p className="text-[10px] text-[#9db3a6]">
                        {notifGranted
                          ? "Izin notifikasi telah aktif"
                          : "Munculkan notifikasi pop-up saat adzan berkumandang"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRequestNotif}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                        notifGranted
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-[#2d946e] text-white hover:bg-[#35a87e]"
                      }`}
                    >
                      {notifGranted ? (
                        <>
                          <BellRing className="h-3 w-3" />
                          <span>Aktif</span>
                        </>
                      ) : (
                        <>
                          <Bell className="h-3 w-3" />
                          <span>Izinkan</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Volume Slider */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white text-[11px] font-medium">Volume Suara</span>
                      <span className="font-mono text-[11px] text-[#eddcb2]">
                        {Math.round(settings.volume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={settings.volume}
                      onChange={(e) =>
                        updateSetting("volume", parseFloat(e.target.value))
                      }
                      className="w-full accent-[#2d946e] h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Pilihan Muadzin dari Berbagai Negara */}
                <div className="mt-4">
                  <p className="text-xs font-bold text-white mb-2">
                    Pilihan Muadzin Dunia
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {MUADZIN_OPTIONS.map((item) => {
                      const isSelected = settings.selectedMuadzinId === item.id;
                      const isPlayingThis = previewingId === item.id && isPlayingAudio;

                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border p-2.5 transition-all text-left flex flex-col justify-between ${
                            isSelected
                              ? "border-[#3eb489] bg-[#1a3c2d] ring-1 ring-[#3eb489]"
                              : "border-white/10 bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-base">{item.flag}</span>
                                <span className="text-xs font-bold text-white truncate">
                                  {item.country}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => updateSetting("selectedMuadzinId", item.id)}
                                className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                                  isSelected
                                    ? "bg-[#2d946e] text-white"
                                    : "bg-white/10 text-[#c1d1c7] hover:bg-white/20"
                                }`}
                              >
                                {isSelected ? "Dipilih" : "Pilih"}
                              </button>
                            </div>
                            <p className="text-[11px] font-semibold text-[#eddcb2] mt-1 truncate">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-[#9db3a6] line-clamp-1">
                              {item.location}
                            </p>
                          </div>

                          {/* Preview button */}
                          <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[9px] text-[#9db3a6]">Contoh Audio</span>
                            <button
                              type="button"
                              onClick={() =>
                                handlePreviewMuadzin(item.id, item.isFajrSpecial)
                              }
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold transition-colors ${
                                isPlayingThis
                                  ? "bg-amber-400 text-slate-950 animate-pulse"
                                  : "bg-white/10 text-white hover:bg-[#2d946e] hover:text-white"
                              }`}
                            >
                              {isPlayingThis ? (
                                <>
                                  <Square className="h-2.5 w-2.5 fill-current" />
                                  <span>Berhenti</span>
                                </>
                              ) : (
                                <>
                                  <Play className="h-2.5 w-2.5 fill-current" />
                                  <span>Dengarkan</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* SECTION: PETUNJUK & TOMBOL PASANG KE TASKBAR HP (PWA) */}
              <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-[#1a382b] to-[#12261d] p-4 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-xl border border-amber-400/30">
                      <Smartphone className="h-5 w-5 text-amber-300" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white">
                        Pasang ke Layar Utama &amp; Taskbar HP
                      </h4>
                      <p className="text-[11px] text-[#c1d1c7]">
                        Akses cepat satu ketukan seperti aplikasi bawaan HP
                      </p>
                    </div>
                  </div>

                  {deferredPrompt && (
                    <button
                      type="button"
                      onClick={handleInstallApp}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950 shadow-md hover:bg-amber-300 active:scale-95 transition-all shrink-0 animate-pulse"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Instal Sekarang</span>
                    </button>
                  )}
                </div>

                <div className="mt-3.5 pt-3 border-t border-white/10 space-y-2 text-xs text-[#c1d1c7]">
                  {isStandalone ? (
                    <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs bg-emerald-500/20 rounded-xl p-2.5 border border-emerald-500/30">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>Aplikasi telah terpasang di HP Anda. Ikon dapat disematkan ke bar bawah / taskbar HP!</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-white shrink-0">🤖 Android:</span>
                        <span>Ketuk menu titik tiga <strong>⋮</strong> di pojok kanan atas browser Chrome → Pilih <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Instal Aplikasi"</strong>.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-white shrink-0">🍏 iPhone:</span>
                        <span>Ketuk tombol <strong>Bagikan (Share)</strong> <Share2 className="inline h-3 w-3 text-white" /> di bar bawah Safari → Pilih <strong>"Tambah ke Layar Utama"</strong> (Add to Home Screen).</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
