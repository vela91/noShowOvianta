// Componente base del sidebar — sin hooks dinámicos (usePathname, etc.)
//
// DECISIÓN: separar la base del sidebar de su variante con usePathname
//
// Problema Next.js 16: usePathname() llama useDynamicRouteParams() en el servidor.
// Cuando un componente con usePathname() se usa como <Suspense fallback=...>, ese
// fallback se renderiza FUERA de la frontera de Suspense → Next.js no encuentra
// Suspense en el component stack → lanza el error blocking-route.
//
// Solución: AppSidebarBase no llama usePathname(). Es seguro como fallback estático.
// AppSidebar (en app-sidebar.tsx) llama usePathname() y se usa solo DENTRO de Suspense.

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BarChart3, Calendar, Shield, Users } from "lucide-react";
import Link from "next/link";

export const navItems = [
  { title: "Agenda", url: "/dashboard/agenda", icon: Calendar },
  { title: "Pacientes", url: "/dashboard/pacientes", icon: Users },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
];

interface AppSidebarBaseProps {
  pathname?: string | null;
}

export function AppSidebarBase({ pathname = null }: AppSidebarBaseProps) {
  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground">
              Ovianta
            </p>
            <p className="text-xs text-sidebar-foreground/60">NoShow Shield</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname
                  ? pathname === item.url || pathname.startsWith(item.url + "/")
                  : false;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      isActive={isActive}
                      className="h-10"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
