"use client";

// AppSidebar añade usePathname() sobre AppSidebarBase.
// Solo se usa DENTRO de un <Suspense> (como contenido resuelto),
// nunca como fallback — ver dashboard/layout.tsx y app-sidebar-base.tsx.

import { usePathname } from "next/navigation";
import { AppSidebarBase } from "./app-sidebar-base";

export function AppSidebar() {
  const pathname = usePathname();
  return <AppSidebarBase pathname={pathname} />;
}
