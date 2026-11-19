import { isAppWebView } from "@/lib/app-mode";
import { AdzanIqamahAppPage } from "./adzan-iqamah-app";
import { AdzanIqamahWebPage } from "./adzan-iqamah-web";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdzanIqamahPage() {
  const appMode = await isAppWebView();
  return appMode ? <AdzanIqamahAppPage /> : <AdzanIqamahWebPage />;
}
