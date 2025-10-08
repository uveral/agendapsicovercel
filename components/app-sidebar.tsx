'use client';

import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  CalendarClock,
  Clock,
  Settings,
  LogOut,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { LucideIcon } from 'lucide-react';

interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const NAVIGATION: NavigationItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Terapeutas', href: '/therapists', icon: Users },
  { label: 'Clientes', href: '/clients', icon: UserCircle },
  { label: 'Calendario', href: '/calendar', icon: CalendarDays },
  { label: 'Calendario 2', href: '/calendar2', icon: CalendarPlus },
  { label: 'Calendario 3', href: '/calendar3', icon: CalendarRange },
  { label: 'Calendario 4', href: '/calendar4', icon: CalendarClock },
  { label: 'Citas', href: '/appointments', icon: Clock },
  { label: 'Configuración', href: '/settings', icon: Settings, adminOnly: true },
];

function buildMenuItems(items: NavigationItem[], currentPath: string) {
  return items.map((item) => {
    const isActive = currentPath === item.href;

    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton asChild isActive={isActive}>
          <Link href={item.href}>
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  });
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();

  const visibleNavigation = useMemo(() => {
    if (!user || user.role !== 'admin') {
      return NAVIGATION.filter((item) => !item.adminOnly);
    }
    return NAVIGATION;
  }, [user]);

  const menuContent = useMemo(() => buildMenuItems(visibleNavigation, pathname), [visibleNavigation, pathname]);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast({
      title: 'Sesión cerrada',
      description: 'Has cerrado sesión exitosamente',
    });
    router.push('/login');
    router.refresh();
  }, [router, toast]);

  if (loading) {
    return (
      <Sidebar>
        <SidebarContent>
          <div className="p-4 text-sm text-muted-foreground">Cargando...</div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image src="/logo-centro-orienta.svg" alt="Centro Orienta" width={40} height={40} className="h-10 w-auto" />
          <div className="font-semibold">Agenda Centro Orienta</div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{menuContent}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-3">
          {user && (
            <div className="flex items-center gap-2 text-sm">
              <Avatar className="h-9 w-9">
                <AvatarFallback>
                  {user.firstName?.[0]}
                  {user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium">{`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()}</span>
                <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
              </div>
            </div>
          )}
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
