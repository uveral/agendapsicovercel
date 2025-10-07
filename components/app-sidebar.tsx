
'use client';

import React from 'react';
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
import { useAuth } from '@/hooks/useAuth';

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
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast({
      title: 'Sesión cerrada',
      description: 'Has cerrado sesión exitosamente',
    });
    router.push('/login');
    router.refresh();
  };

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
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/settings'}
                  >
                    <Link href="/settings">
                      <Settings className="h-4 w-4" />
                      <span>Configuración</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
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
    </Sidebar>
  );
}
