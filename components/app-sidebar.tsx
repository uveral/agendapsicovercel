
'use client';

import React, { memo, useMemo, useCallback } from 'react';
import { Calendar, Users, UserCircle, LayoutDashboard, Clock, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext'; // Use centralized context
import type { User } from '@/lib/types';

const menuItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Terapeutas',
    url: '/therapists',
    icon: Users,
  },
  {
    title: 'Clientes',
    url: '/clients',
    icon: UserCircle,
  },
  {
    title: 'Calendario',
    url: '/calendar',
    icon: Calendar,
  },
  {
    title: 'Calendario 2',
    url: '/calendar2',
    icon: Calendar,
  },
  {
    title: 'Calendario 3',
    url: '/calendar3',
    icon: Calendar,
  },
  {
    title: 'Citas',
    url: '/appointments',
    icon: Clock,
  },
] as const;

// Separate MenuItem component to prevent re-renders
const MenuItem = memo(({
  item,
  isActive
}: {
  item: { title: string; url: string; icon: React.ComponentType<{ className?: string }> };
  isActive: boolean;
}) => {
  console.log('[MenuItem] Rendering:', item.title, 'active:', isActive);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
      >
        <Link href={item.url}>
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
});

MenuItem.displayName = 'MenuItem';

// Memoize the entire sidebar to prevent unnecessary re-renders
export const AppSidebar = memo(function AppSidebar() {
  const pathname = usePathname();
  const { user, loading } = useAuth(); // Use centralized context

  // DEBUG: Log sidebar renders
  console.log('[AppSidebar] Rendering. pathname:', pathname, 'user:', user?.email, 'loading:', loading);

  // Memoize active states calculation
  const activeStates = useMemo(() => {
    console.log('[AppSidebar] Recalculating activeStates for pathname:', pathname);
    return menuItems.reduce((acc, item) => {
      acc[item.url] = pathname === item.url;
      return acc;
    }, {} as Record<string, boolean>);
  }, [pathname]);

  // Memoize visible menu items (filter settings for non-admins)
  const visibleMenuItems = useMemo(() => {
    return menuItems;
  }, []);

  // Show loading state to prevent flashing
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
        <div className="flex items-center gap-3">
          <img
            src="/logo-centro-orienta.svg"
            alt="Centro Orienta Logo"
            className="h-10 w-auto"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <MenuItem
                  key={item.url}
                  item={item}
                  isActive={activeStates[item.url] || false}
                />
              ))}
              {user?.role === 'admin' && (
                <MenuItem
                  item={{ title: 'Configuración', url: '/settings', icon: Settings }}
                  isActive={activeStates['/settings'] || false}
                />
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooterContent user={user} />
    </Sidebar>
  );
});

// Separate footer component to minimize re-renders
const SidebarFooterContent = memo(({ user }: { user: User | null }) => {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast({
      title: 'Sesión cerrada',
      description: 'Has cerrado sesión exitosamente',
    });
    router.push('/login');
    router.refresh();
  }, [router, toast]);

  console.log('[SidebarFooterContent] Rendering');

  return (
    <SidebarFooter className="p-4">
      <div className="flex flex-col gap-2">
        {user && (
          <div className="flex items-center gap-2 text-sm">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {user.firstName?.[0]}{user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-xs text-muted-foreground capitalize">
                {user.role}
              </span>
            </div>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="w-full"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar Sesión
        </Button>
      </div>
    </SidebarFooter>
  );
});

SidebarFooterContent.displayName = 'SidebarFooterContent';
