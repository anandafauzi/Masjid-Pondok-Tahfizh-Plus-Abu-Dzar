import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/api";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/admin");
  }

  return (
    <AdminShell
      user={{
        name: user.name || "Admin",
        email: user.email,
        role: user.role,
      }}
    >
      {children}
    </AdminShell>
  );
}
