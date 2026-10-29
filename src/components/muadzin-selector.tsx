"use client";

import { useEffect, useState } from "react";
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
  unlockAudioContext,
} from "@/lib/adzan-audio";
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Bell,
  BellRing,
  Globe,
  Check,
} from "lucide-react";

export function MuadzinSelectorCard() {
  const [settings, setSettings] = useState<AdzanSettings>(DEFAULT_ADZAN_SETTINGS);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [notifGranted, setNotifGranted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSettings(getStoredAdzanSettings());
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifGranted(Notification.permission === "granted");
    }
  }, []);

  const updateSetting = <K extends keyof AdzanSettings>(
    key: K,
    val: AdzanSettings[K]
  ) => {
    const next = saveStoredAdzanSettings({ [key]: val });
    setSettings(next);
  };

  const handlePreview = (id: string, isFajr = false) => {
    unlockAudioContext();
    if (previewingId === id) {
      stopAdzanSound();
      setPreviewingId(null);
    } else {
      playAdzanSound(id, isFajr, settings.volume);
      setPreviewingId(id);
    }
  };

  const handleRequestNotif = async () => {
    const granted = await requestAdzanNotificationPermission();
    setNotifGranted(granted);
    updateSetting("notificationsEnabled", granted);
  };

  if (!mounted) return null;

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-[#ded5c4] bg-white shadow-sm">
      <div className="border-b border-[#ded5c4] bg-gradient-to-r from-[#fdfbf7] via-[#f7f3ea] to-[#f4eee2] px-6 py-5 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2d946e]/10 text-xl text-[#2d946e] border border-[#2d946e]/20">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#19261f] tracking-tight">
                Pilihan Suara Adzan &amp; Muadzin Dunia
              </h3>
              <p className="text-xs text-[#5c6e63]">
                Dengarkan lantunan adzan autentik dari berbagai belahan dunia untuk notifikasi masuk waktu sholat.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRequestNotif}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-sm ${
                notifGranted
                  ? "bg-[#eaf6f0] text-[#1e6149] border border-[#bde5d2]"
                  : "bg-[#2d946e] text-white hover:bg-[#35a87e]"
              }`}
            >
              {notifGranted ? (
                <>
                  <BellRing className="h-3.5 w-3.5 text-[#2d946e]" />
                  <span>Notifikasi Aktif</span>
                </>
              ) : (
                <>
                  <Bell className="h-3.5 w-3.5" />
                  <span>Aktifkan Notifikasi HP</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Settings Bar */}
        <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-[#ded5c4] bg-[#faf7f2] p-4 sm:p-5">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#19261f]">Kumandangkan Adzan Otomatis</p>
              <p className="text-[11px] text-[#607066]">
                Memutar suara adzan saat waktu shalat tiba
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateSetting("soundEnabled", !settings.soundEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.soundEnabled ? "bg-[#2d946e]" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.soundEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3">
            {settings.volume === 0 ? (
              <VolumeX className="h-4 w-4 text-slate-400 shrink-0" />
            ) : (
              <Volume2 className="h-4 w-4 text-[#2d946e] shrink-0" />
            )}
            <div className="flex-1">
              <div className="flex justify-between text-[11px] font-semibold text-[#19261f] mb-1">
                <span>Volume Audio</span>
                <span className="font-mono text-[#2d946e]">
                  {Math.round(settings.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.volume}
                onChange={(e) => updateSetting("volume", parseFloat(e.target.value))}
                className="w-full accent-[#2d946e] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Muadzin Cards Grid */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {MUADZIN_OPTIONS.map((item) => {
            const isSelected = settings.selectedMuadzinId === item.id;
            const isPlayingThis = previewingId === item.id;

            return (
              <div
                key={item.id}
                className={`group relative flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                  isSelected
                    ? "border-[#2d946e] bg-[#f0f9f4] shadow-sm ring-2 ring-[#2d946e]/20"
                    : "border-[#ded5c4] bg-white hover:border-[#bde5d2] hover:bg-[#fbf9f4]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.flag}</span>
                      <span className="text-xs font-bold text-[#19261f]">
                        {item.country}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateSetting("selectedMuadzinId", item.id)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-[#2d946e] text-white shadow-sm"
                          : "bg-slate-100 text-[#5c6e63] hover:bg-[#eaf6f0] hover:text-[#1e6149]"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>Terpilih</span>
                        </>
                      ) : (
                        <span>Pilih</span>
                      )}
                    </button>
                  </div>

                  <h4 className="mt-2 text-sm font-black text-[#19261f]">
                    {item.name}
                  </h4>
                  <p className="text-xs font-semibold text-[#8a6820]">
                    {item.location}
                  </p>
                  <p className="mt-1 text-xs text-[#5c6e63] leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#ded5c4]/60 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#8a6820]">
                    Pratinjau Suara
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePreview(item.id, item.isFajrSpecial)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-sm ${
                      isPlayingThis
                        ? "bg-amber-500 text-slate-950 animate-pulse ring-2 ring-amber-300"
                        : "bg-[#19261f] text-white hover:bg-[#2d946e]"
                    }`}
                  >
                    {isPlayingThis ? (
                      <>
                        <Square className="h-3 w-3 fill-current" />
                        <span>Hentikan</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 fill-current" />
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
    </section>
  );
}
