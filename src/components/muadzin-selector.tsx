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
    <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-5 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sage-50 text-xl text-sage-600 border border-sage-200/80">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Pilihan Suara Adzan &amp; Muadzin Dunia
              </h3>
              <p className="text-xs text-slate-600">
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
                  ? "bg-sage-50 text-sage-700 border border-sage-200"
                  : "bg-sage-600 text-white hover:bg-sage-700"
              }`}
            >
              {notifGranted ? (
                <>
                  <BellRing className="h-3.5 w-3.5 text-sage-600" />
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
        <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-900">Kumandangkan Adzan Otomatis</p>
              <p className="text-[11px] text-slate-500">
                Memutar suara adzan saat waktu shalat tiba
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateSetting("soundEnabled", !settings.soundEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.soundEnabled ? "bg-sage-600" : "bg-slate-300"
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
              <Volume2 className="h-4 w-4 text-sage-600 shrink-0" />
            )}
            <div className="flex-1">
              <div className="flex justify-between text-[11px] font-semibold text-slate-900 mb-1">
                <span>Volume Audio</span>
                <span className="font-mono text-sage-700 font-bold">
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
                className="w-full accent-sage-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
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
                    ? "border-sage-500 bg-sage-50/60 shadow-sm ring-1 ring-sage-400"
                    : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.flag}</span>
                      <span className="text-xs font-bold text-slate-900">
                        {item.country}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateSetting("selectedMuadzinId", item.id)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-sage-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-sage-50 hover:text-sage-700"
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

                  <h4 className="mt-2 text-sm font-black text-slate-900">
                    {item.name}
                  </h4>
                  <p className="text-xs font-semibold text-sage-700">
                    {item.location}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Pratinjau Suara
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePreview(item.id, item.isFajrSpecial)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-sm ${
                      isPlayingThis
                        ? "bg-amber-500 text-slate-950 animate-pulse ring-2 ring-amber-300"
                        : "bg-slate-900 text-white hover:bg-sage-600"
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
