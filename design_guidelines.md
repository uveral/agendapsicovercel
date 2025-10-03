# Guía de Diseño - Sistema de Gestión de Horarios para Centro de Psicología

## Enfoque de Diseño

**Aproximación:** Design System (Material Design + Linear)
**Justificación:** Aplicación de productividad orientada a datos que requiere eficiencia, claridad y jerarquía visual clara para gestionar información compleja de horarios, disponibilidades y múltiples terapeutas.

**Principios Clave:**
- Claridad sobre decoración: La información debe ser fácil de escanear
- Jerarquía visual fuerte: Diferenciar entre acciones primarias y secundarias
- Feedback inmediato: Estados claros para todas las interacciones
- Espaciado consistente: Crear ritmo visual predecible

## Elementos de Diseño Core

### A. Paleta de Colores

**Color Corporativo:** Verde #B7CD95 (HSL: 95 35% 70%) del logo de Centro Orienta

**Modo Oscuro (Primario):**
- Background principal: 220 18% 12%
- Background secundario: 220 16% 16%
- Background terciario: 220 15% 20%
- Bordes: 220 12% 28%
- Primary brand: 95 45% 35% (verde Centro Orienta, calma y bienestar)
- Success (cita confirmada): 95 35% 70% (verde logo)
- Warning (pendiente): 38 92% 50%
- Error (conflicto): 0 84% 60%
- Text primario: 210 20% 98%
- Text secundario: 215 15% 70%

**Modo Claro:**
- Background principal: 0 0% 100%
- Background secundario: 220 14% 96%
- Background terciario: 220 13% 91%
- Bordes: 220 13% 85%
- Primary: 95 45% 35% (verde Centro Orienta)
- Text primario: 220 18% 12%
- Text secundario: 220 10% 40%

### B. Tipografía

**Familia:** Inter (Google Fonts) para toda la aplicación
**Jerarquía:**
- Headings principales (H1): 2.5rem / font-semibold
- Headings sección (H2): 1.875rem / font-semibold  
- Subtítulos (H3): 1.5rem / font-medium
- Body primario: 1rem / font-normal
- Body secundario: 0.875rem / font-normal
- Captions/labels: 0.75rem / font-medium uppercase tracking-wide

### C. Sistema de Layout

**Spacing Primitives:** Unidades Tailwind de 2, 4, 6, 8, 12, 16
- Padding interno componentes: p-4, p-6
- Gaps en grids: gap-4, gap-6
- Margins entre secciones: mb-8, mb-12
- Padding contenedores: p-8, p-12

**Grid Sistema:**
- Dashboard principal: 12-column grid (lg:grid-cols-12)
- Sidebar navegación: col-span-2 (fixed width)
- Área contenido: col-span-10
- Calendario semanal: 7-column grid
- Lista terapeutas: 2-3 columns en desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)

### D. Biblioteca de Componentes

**Navegación:**
- Sidebar vertical persistente (izquierda): Logo arriba, navegación principal, perfil usuario abajo
- Links con iconos (Heroicons): Dashboard, Terapeutas, Clientes, Calendario, Configuración
- Estado activo: background sutil + borde izquierdo accent

**Calendario/Horarios:**
- Vista semanal: Grid de 7 días × franjas horarias (8:00-20:00)
- Bloques de citas: Cards con borde coloreado según estado, sombra sutil, padding p-3
- Info en bloque: Nombre cliente, hora inicio-fin, terapeuta (si vista general)
- Drag & drop visual feedback: Opacidad reducida durante arrastre, indicador de drop zone

**Cards de Terapeuta:**
- Header: Foto perfil (circular), nombre, especialidad
- Body: Stats de ocupación (% disponibilidad), próximas citas (3-4)
- Footer: Botón "Ver calendario completo"
- Hover: Elevación shadow-md a shadow-lg

**Formularios:**
- Inputs: Background contrast, border sutil, focus ring azul
- Selects personalizados: Dropdown con search para terapeutas/clientes
- Date/Time pickers: Modal calendar overlay con navegación mes
- Toggle switches: Para disponibilidad on/off
- Validation: Mensajes inline, iconos de error/success

**Tablas de Datos:**
- Headers: Background secundario, texto uppercase pequeño, sticky en scroll
- Rows: Hover background change, striped opcional para listas largas
- Acciones: Iconos al final de fila (editar, eliminar, más opciones)
- Paginación: Inferior derecha, muestra "X-Y de Z resultados"

**Modales/Overlays:**
- Asignación de cita: Modal centrado, backdrop blur
- Sugerencias automáticas: Panel lateral derecho deslizable
- Confirmaciones: Dialog compacto con acciones primaria/secundaria claras

**Badges/Status:**
- Estados de cita: Pills pequeños, colores semánticos, esquinas redondeadas
- Disponibilidad: Dots de color (verde=disponible, rojo=ocupado, gris=no disponible)

**Botones:**
- Primary: Background brand color, texto blanco, shadow-sm
- Secondary: Border, background transparent/sutil
- Danger: Background rojo para eliminar/cancelar
- Icon buttons: Cuadrados p-2, hover background sutil

### E. Animaciones

**Principio:** Minimalistas y funcionales únicamente

- Transiciones: 150-200ms para hovers, 300ms para modales
- Calendario drag: Scale 0.95 del item durante drag
- Loading states: Skeleton screens con shimmer sutil
- Success feedback: Checkmark animado en confirmaciones
- NO usar: Parallax, animaciones decorativas, efectos scroll complejos

## Especificaciones Adicionales

**Dashboard Home:**
- Header: Título "Dashboard" + fecha actual + acciones rápidas
- Grid 3 columnas: 
  - Col 1: Resumen día (citas hoy, terapeutas activos)
  - Col 2: Próximas citas (lista cronológica)
  - Col 3: Alertas/notificaciones (conflictos, pendientes)
- Calendario semanal compacto abajo

**Pantalla Terapeutas:**
- Grid cards con filtros arriba (especialidad, disponibilidad)
- Búsqueda en tiempo real
- Vista detalle: Calendario individual + estadísticas + historial

**Gestión de Disponibilidad (Clientes):**
- Formulario multi-step: 
  1. Selección días preferidos
  2. Franjas horarias por día
  3. Confirmación visual
- Calendario interactivo: Click para marcar disponible/no disponible

**Sugerencias Automáticas:**
- Panel: "Opciones de reasignación" con hasta 5 sugerencias rankeadas
- Cada sugerencia: Tarjeta con terapeuta, horario propuesto, nivel de match (%)
- Botón "Aplicar" por sugerencia

**Iconografía:**
Heroicons (outline para navegación, solid para acciones)
- Calendar, Users, Clock, CheckCircle, ExclamationCircle, Cog