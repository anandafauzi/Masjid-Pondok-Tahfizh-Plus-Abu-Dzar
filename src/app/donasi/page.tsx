import { PublicShell } from "@/components/public-shell";
import { isAppWebView } from "@/lib/app-mode";
import { getPublicDonationInfo } from "@/lib/donation";
import { getMosqueSettings } from "@/lib/settings";
import { HandCoins, Landmark, QrCode } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DonasiPage() {
  const [donation, mosque, appMode] = await Promise.all([
    getPublicDonationInfo(),
    getMosqueSettings(),
    isAppWebView(),
  ]);

  const hasContent =
    donation.isActive &&
    (donation.accounts.length > 0 || Boolean(donation.qrImageUrl));

  return (
    <PublicShell
      mosque={{
        name: mosque.mosqueName,
        logoUrl: mosque.logoUrl,
        address: mosque.address,
        mapUrl: mosque.mapUrl,
      }}
      appMode={appMode}
    >
      <section className="rounded-3xl border border-[#ded5c4] bg-gradient-to-br from-[#fdfbf7] via-white to-[#f4f7f5] p-6 shadow-sm sm:p-9">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#2d946e]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#1e6149] border border-[#2d946e]/20">
          <HandCoins className="h-3.5 w-3.5 text-[#2d946e]" />
          <span>Dukung Masjid</span>
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-[#19261f] sm:text-3xl">
          {donation.isActive ? donation.title : "Info Donasi"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#5c6e63]">
          Setiap donasi membantu perawatan masjid, kegiatan kajian, dan
          pembinaan tahfizh Al-Qur&apos;an. Jazakallah khair atas dukungan Anda.
        </p>

        {!hasContent ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[#ded5c4] bg-white/70 px-6 py-12 text-center">
            <HandCoins className="mx-auto h-10 w-10 text-[#8e9f94]" />
            <p className="mt-3 text-sm font-bold text-[#19261f]">
              Info donasi belum tersedia
            </p>
            <p className="mt-1 text-xs text-[#5c6e63]">
              Pengurus dapat mengaturnya melalui panel admin.
            </p>
          </div>
        ) : (
          <>
            {donation.notes && (
              <div className="mt-6 rounded-2xl border border-[#d2dfd6] bg-[#f4f7f5]/80 px-4 py-3 text-sm leading-relaxed text-[#395243]">
                {donation.notes}
              </div>
            )}

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {donation.qrImageUrl && (
                <div className="rounded-2xl border border-[#ded5c4] bg-white p-5 shadow-xs">
                  <div className="mb-4 flex items-center gap-2 border-b border-[#e8dfcf] pb-3">
                    <QrCode className="h-4 w-4 text-[#2d946e]" />
                    <h2 className="text-sm font-bold text-[#19261f]">
                      Scan QR Donasi
                    </h2>
                  </div>
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={donation.qrImageUrl}
                      alt="QR donasi masjid"
                      className="h-auto w-full max-w-[320px] rounded-xl bg-white object-contain p-2 ring-1 ring-[#ded5c4]"
                    />
                  </div>
                  <p className="mt-4 text-center text-xs text-[#5c6e63]">
                    Arahkan kamera ponsel ke QR untuk melakukan donasi.
                  </p>
                </div>
              )}

              {donation.accounts.length > 0 && (
                <div className="rounded-2xl border border-[#ded5c4] bg-white p-5 shadow-xs">
                  <div className="mb-4 flex items-center gap-2 border-b border-[#e8dfcf] pb-3">
                    <Landmark className="h-4 w-4 text-[#2d946e]" />
                    <h2 className="text-sm font-bold text-[#19261f]">
                      Transfer Bank
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {donation.accounts.map((account) => (
                      <div
                        key={account.id}
                        className="rounded-xl border border-[#ded5c4]/70 bg-[#fcfaf6] px-4 py-3"
                      >
                        <p className="text-xs font-bold uppercase tracking-wide text-[#557a64]">
                          {account.bankName}
                        </p>
                        <p className="mt-1 select-all font-mono text-lg font-black tracking-wide text-[#19261f]">
                          {account.accountNumber}
                        </p>
                        <p className="mt-0.5 text-xs text-[#5c6e63]">
                          a.n. {account.accountName}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </PublicShell>
  );
}
