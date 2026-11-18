/** Format tanggal Hijriyah (Umm al-Qura) untuk wilayah Indonesia. */
export function formatHijriDate(ms: number): string {
  try {
    return new Intl.DateTimeFormat("id-ID-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    })
      .format(new Date(ms))
      .replace(/\s+H$/i, "");
  } catch {
    return "";
  }
}
