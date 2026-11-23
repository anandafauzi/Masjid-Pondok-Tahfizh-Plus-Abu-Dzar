/** Format tanggal Hijriyah (Umm al-Qura) untuk wilayah Indonesia. */
export function formatHijriDate(ms: number): string {
  try {
    const fmt = new Intl.DateTimeFormat("id-ID-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
    const cal = fmt.resolvedOptions().calendar ?? "";
    if (!cal.startsWith("islamic")) return "";

    const formatted = fmt.format(new Date(ms));
    // Hapus sufiks era (H/AH/SM/dll) yang mungkin ditambahkan browser, lalu normalisasi ke " H".
    const cleaned = formatted
      .replace(/\s+(H|AH|BH|SM|M)$/i, "")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned ? `${cleaned} H` : "";
  } catch {
    return "";
  }
}
