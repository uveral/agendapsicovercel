'use client';

import { useMemo, useState, useCallback, type ComponentType } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserRound,
  Calendar,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  CalendarClock,
  CalendarCheck,
  LayoutGrid,
  Image as ImageIcon,
  SlidersHorizontal,
  CalendarSearch,
  ListChecks,
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
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Role = 'admin' | 'therapist' | 'client' | 'guest';

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  roles?: Role[];
};

type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

const NAV_BLUEPRINT: NavSection[] = [
  {
    id: 'core',
    label: 'General',
    items: [
      { id: 'dashboard', label: 'Panel Principal', href: '/dashboard', icon: LayoutDashboard },
      { id: 'therapists', label: 'Terapeutas', href: '/therapists', icon: Users },
      { id: 'clients', label: 'Clientes', href: '/clients', icon: UserRound },
    ],
  },
  {
    id: 'calendars',
    label: 'Calendarios',
    items: [
      { id: 'calendar-1', label: 'Calendario 1', href: '/calendar', icon: CalendarDays },
      { id: 'calendar-2', label: 'Calendario 2', href: '/calendar2', icon: CalendarPlus },
      { id: 'calendar-3', label: 'Calendario 3', href: '/calendar3', icon: CalendarRange },
      { id: 'calendar-4', label: 'Calendario 4', href: '/calendar4', icon: CalendarClock },
      { id: 'calendar-5', label: 'Calendario 5', href: '/calendar5', icon: Calendar },
      { id: 'calendar-6', label: 'Calendario 6', href: '/calendar6', icon: LayoutGrid },
      { id: 'calendar-7', label: 'Calendario 7', href: '/calendar7', icon: ImageIcon },
      { id: 'calendar-8', label: 'Calendario 8', href: '/calendar8', icon: SlidersHorizontal },
      { id: 'calendar-9', label: 'Calendario 9', href: '/calendar9', icon: CalendarSearch },
      { id: 'calendar-10', label: 'Calendario 10', href: '/calendar10', icon: ListChecks },
      { id: 'calendar-11', label: 'Calendario 11', href: '/calendar11', icon: Calendar },
      { id: 'appointments', label: 'Citas', href: '/appointments', icon: CalendarCheck },
    ],
  },
  {
    id: 'admin',
    label: 'Administración',
    items: [
      { id: 'settings', label: 'Configuración', href: '/settings', icon: Settings, roles: ['admin'] },
    ],
  },
];

function getSectionsForRole(role: Role): NavSection[] {
  return NAV_BLUEPRINT.map((section) => {
    const items = section.items.filter((item) => {
      if (!item.roles || item.roles.length === 0) {
        return true;
      }
      return item.roles.includes(role);
    });

    return { ...section, items };
  }).filter((section) => section.items.length > 0);
}

type NavigationProps = {
  sections: NavSection[];
  currentPath: string;
};

function Navigation({ sections, currentPath }: NavigationProps) {
  return (
    <>
      {sections.map((section) => (
        <SidebarGroup key={section.id} className="mt-1">
          <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  currentPath === item.href || currentPath.startsWith(`${item.href}/`);

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href} aria-current={isActive ? 'page' : undefined}>
                        <Icon className="h-4 w-4" />
                        <span className="truncate text-sm font-medium">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

function LoadingSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="flex-1">
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="space-y-4 p-4 text-sm text-muted-foreground">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-9 w-full animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export function AppSidebar() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const role: Role = (user?.role as Role | undefined) ?? 'guest';

  const sections = useMemo(() => getSectionsForRole(role), [role]);

  const initials = useMemo(() => {
    if (!user) return 'US';
    const first = user.firstName?.trim().charAt(0) ?? '';
    const last = user.lastName?.trim().charAt(0) ?? '';
    const value = `${first}${last}`.toUpperCase();
    return value || 'US';
  }, [user]);

  const fullName = useMemo(() => {
    if (!user) return 'Usuario';
    const parts = [user.firstName, user.lastName].filter(Boolean);
    return parts.join(' ') || 'Usuario';
  }, [user]);

  const handleLogout = useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    const supabase = createClient();

    try {
      await supabase.auth.signOut();
      toast({ title: 'Sesión cerrada', description: 'Vuelve pronto.' });
      router.replace('/login');
    } catch (error) {
      console.error('[AppSidebar] Error signing out', error);
      toast({
        title: 'Error al cerrar sesión',
        description: 'Inténtalo de nuevo en unos instantes.',
        variant: 'destructive',
      });
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, router, toast]);

  if (loading) {
    return <LoadingSidebar />;
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
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">Agenda Centro Orienta</span>
            <span className="text-xs text-muted-foreground">Organiza tu día</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <Navigation sections={sections} currentPath={pathname} />
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none">{fullName}</span>
              <span className="text-xs text-muted-foreground capitalize">{role}</span>
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
            {isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
