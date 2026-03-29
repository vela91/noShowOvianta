import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppSidebarBase } from "@/components/layout/app-sidebar-base";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { connection } from "next/server";
import { Suspense } from "react";

// connection() dentro de Suspense — marca /dashboard como dinámico
// sin bloquear el render inicial del layout.
async function DynamicSidebar() {
  await connection();
  return <AppSidebar />;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      {/* AppSidebarBase como fallback estático (sin usePathname) */}
      <Suspense fallback={<AppSidebarBase />}>
        <DynamicSidebar />
      </Suspense>
      <SidebarInset>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
