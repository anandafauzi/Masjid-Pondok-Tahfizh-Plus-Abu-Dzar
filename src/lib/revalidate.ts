import { revalidatePath } from "next/cache";
import { invalidatePublicDataCache } from "@/lib/public-cache";

/**
 * Revalidates all public and display pages instantly
 * so any changes made via Admin panel sync with zero delay.
 */
export function revalidateAllAppPaths() {
  // Hapus cache in-memory data publik agar perubahan admin langsung terlihat.
  invalidatePublicDataCache();
  try {
    revalidatePath("/", "layout");
    revalidatePath("/", "page");
    revalidatePath("/jadwal-imam", "page");
    revalidatePath("/jadwal-jumat", "page");
    revalidatePath("/jadwal-shalat", "page");
    revalidatePath("/kajian", "page");
    revalidatePath("/donasi", "page");
    revalidatePath("/api/public/donation-info");
    revalidatePath("/tv", "page");
    revalidatePath("/admin", "layout");
  } catch (error) {
    console.warn("revalidateAllAppPaths error:", error);
  }
}

