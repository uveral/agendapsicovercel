'use client';

import { useCallback, useMemo, useState, type ComponentType } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserRound,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  CalendarClock,
  CalendarCheck,
  Settings,
  LogOut,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface LinkDescriptor {
  id: string;
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  roles?: Array<'admin' | 'therapist' | 'assistant'>;
}

const CORE_LINKS: LinkDescriptor[] = [
  { id: 'dashboard', title: 'Panel Principal', href: '/dashboard', icon: LayoutDashboard },
  { id: 'therapists', title: 'Terapeutas', href: '/therapists', icon: Users },
  { id: 'clients', title: 'Clientes', href: '/clients', icon: UserRound },
];

const CALENDAR_LINKS: LinkDescriptor[] = [
  { id: 'calendar-1', title: 'Calendario 1', href: '/calendar', icon: CalendarDays },
  { id: 'calendar-2', title: 'Calendario 2', href: '/calendar2', icon: CalendarPlus },
  { id: 'calendar-3', title: 'Calendario 3', href: '/calendar3', icon: CalendarRange },
  { id: 'calendar-4', title: 'Calendario 4', href: '/calendar4', icon: CalendarClock },
  { id: 'appointments', title: 'Citas', href: '/appointments', icon: CalendarCheck },
];

const ADMIN_LINKS: LinkDescriptor[] = [
  { id: 'settings', title: 'Configuración', href: '/settings', icon: Settings, roles: ['admin'] },
];

function buildNavigation(userRole: string | undefined): LinkDescriptor[] {
  const allowed = new Set([userRole ?? '']);

  return [...CORE_LINKS, ...CALENDAR_LINKS, ...ADMIN_LINKS].filter((item) => {
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    return item.roles.some((role) => allowed.has(role));
  });
}

function NavigationList({
  items,
  currentPath,
}: {
  items: LinkDescriptor[];
  currentPath: string;
}) {
  return (
    <SidebarMenu>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentPath === item.href;

        return (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton asChild isActive={isActive}>
              <Link href={item.href} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="truncate">{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const menuItems = useMemo(() => buildNavigation(user?.role), [user?.role]);

  const initials = useMemo(() => {
    if (!user) return '';
    const first = user.firstName?.charAt(0) ?? '';
    const last = user.lastName?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || 'US';
  }, [user]);

  const fullName = useMemo(() => {
    if (!user) return 'Usuario';
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Usuario';
  }, [user]);

  const handleLogout = useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast({
        title: 'Sesión cerrada',
        description: 'Vuelve pronto',
      });
      router.push('/login');
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, router, toast]);

  if (loading) {
    return (
      <Sidebar>
        <SidebarContent>
          <div className="p-4 text-sm text-muted-foreground">Preparando menú...</div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/logo-centro-orienta.svg"
            alt="Centro Orienta"
            width={40}
            height={40}
            className="h-10 w-auto"
            priority
          />
          <span className="text-sm font-semibold leading-tight">Agenda Centro Orienta</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavigationList items={menuItems} currentPath={pathname} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 text-sm">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium leading-none">{fullName}</span>
              <span className="text-xs text-muted-foreground capitalize">{user?.role ?? 'invitado'}</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLogout}
            disabled={isSigningOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isSigningOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
