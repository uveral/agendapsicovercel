import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings as SettingsIcon } from "lucide-react";
import type { Setting } from "@shared/schema";

const SETTINGS_KEY = "therapists_can_edit_others";

export default function Settings() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
  });

  const updateMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("PUT", `/api/settings/${SETTINGS_KEY}`, { value: enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Configuración actualizada",
        description: "Los cambios han sido guardados correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la configuración",
        variant: "destructive",
      });
    },
  });

  const currentSetting = settings?.find((s) => s.key === SETTINGS_KEY);
  const isEnabled = currentSetting?.value === true;

  const handleToggle = (checked: boolean) => {
    updateMutation.mutate(checked);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configuración</h1>
          <p className="text-muted-foreground">
            Gestiona las configuraciones del sistema
          </p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-6 w-12" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-settings">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Configuración
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestiona las configuraciones del sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permisos de Terapeutas</CardTitle>
          <CardDescription>
            Configura qué acciones pueden realizar los terapeutas en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label 
                htmlFor="therapists-can-edit-others" 
                className="text-base font-medium"
                data-testid="label-setting"
              >
                Permitir a terapeutas editar citas de otros terapeutas
              </Label>
              <p className="text-sm text-muted-foreground">
                Cuando está activado, los terapeutas pueden editar las citas de sus
                compañeros. Los terapeutas siempre pueden editar sus propias citas,
                y los administradores siempre pueden editar todas las citas.
              </p>
            </div>
            <Switch
              id="therapists-can-edit-others"
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={updateMutation.isPending}
              data-testid="switch-therapists-can-edit-others"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reglas de Permisos</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Los terapeutas <strong>siempre</strong> pueden editar sus propias citas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Los administradores <strong>siempre</strong> pueden editar todas las citas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">⚙</span>
              <span>
                <strong>Configurable:</strong> Si los terapeutas pueden editar citas de otros terapeutas
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
