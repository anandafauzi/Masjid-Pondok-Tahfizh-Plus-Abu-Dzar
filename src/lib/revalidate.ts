import { revalidatePath } from "next/cache";

/**
 * Revalidates all public and display pages instantly
 * so any changes made via Admin panel sync with zero delay.
 */
export function revalidateAllAppPaths() {
  try {
    revalidatePath("/", "layout");
    revalidatePath("/", "page");
    revalidatePath("/jadwal-imam", "page");
    revalidatePath("/jadwal-jumat", "page");
    revalidatePath("/jadwal-shalat", "page");
    revalidatePath("/kajian", "page");
    revalidatePath("/tv", "page");
    revalidatePath("/admin", "layout");
  } catch (error) {
    console.warn("revalidateAllAppPaths error:", error);
  }
}
