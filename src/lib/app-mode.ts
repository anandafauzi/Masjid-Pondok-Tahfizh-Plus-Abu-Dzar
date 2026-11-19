import { headers } from "next/headers";

/** Penanda yang disisipkan WebView Android pada User-Agent. */
export const APP_USER_AGENT_MARKER = "MasjidAppAndroid";

/**
 * Deteksi WebView Android di sisi server. Web biasa tetap memakai tampilan
 * sebelum rombak, sedangkan WebView dengan User-Agent khusus memakai
 * tampilan aplikasi yang baru.
 */
export async function isAppWebView(): Promise<boolean> {
  const headerList = await headers();
  return (headerList.get("user-agent") ?? "").includes(APP_USER_AGENT_MARKER);
}
