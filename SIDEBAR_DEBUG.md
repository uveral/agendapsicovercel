# Debug del problema del Sidebar

## Para diagnosticar:

1. **Abre el navegador en el calendario**
2. **Abre DevTools (F12)**
3. **Ve a la pestaña Console**
4. **Pega y ejecuta este código:**

```javascript
// Test 1: Verificar elementos del sidebar
console.log("=== SIDEBAR DEBUG ===");
const sidebarElements = document.querySelectorAll('[data-sidebar="sidebar"], [data-slot="sidebar-container"]');
console.log("Elementos del sidebar encontrados:", sidebarElements.length);
sidebarElements.forEach((el, i) => {
  const styles = window.getComputedStyle(el);
  console.log(`Sidebar ${i}:`, {
    zIndex: styles.zIndex,
    pointerEvents: styles.pointerEvents,
    position: styles.position,
    display: styles.display
  });
});

// Test 2: Verificar overlays de Radix
const radixOverlays = document.querySelectorAll('[data-radix-focus-guard], [data-radix-portal]');
console.log("\nOverlays de Radix encontrados:", radixOverlays.length);
radixOverlays.forEach((el, i) => {
  const styles = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  console.log(`Overlay ${i}:`, {
    zIndex: styles.zIndex,
    pointerEvents: styles.pointerEvents,
    position: styles.position,
    width: rect.width,
    height: rect.height,
    visible: rect.width > 0 && rect.height > 0
  });
});

// Test 3: Buscar elementos con z-index alto
const allElements = document.querySelectorAll('*');
const highZIndex = Array.from(allElements)
  .map(el => ({
    el,
    zIndex: parseInt(window.getComputedStyle(el).zIndex) || 0
  }))
  .filter(item => item.zIndex > 40)
  .sort((a, b) => b.zIndex - a.zIndex)
  .slice(0, 10);

console.log("\nElementos con z-index > 40:");
highZIndex.forEach(item => {
  const rect = item.el.getBoundingClientRect();
  console.log({
    tag: item.el.tagName,
    zIndex: item.zIndex,
    dataAttrs: Array.from(item.el.attributes)
      .filter(attr => attr.name.startsWith('data-'))
      .map(attr => `${attr.name}="${attr.value}"`),
    pointerEvents: window.getComputedStyle(item.el).pointerEvents,
    covering: rect.width > 0 && rect.height > 0 ? `${Math.round(rect.width)}x${Math.round(rect.height)}` : 'invisible'
  });
});

// Test 4: Click test
console.log("\n=== CLICK TEST ===");
console.log("Intenta hacer click en el sidebar ahora...");
document.addEventListener('click', function testClick(e) {
  console.log("Click detectado en:", {
    target: e.target.tagName,
    classes: e.target.className,
    dataAttrs: Array.from(e.target.attributes || [])
      .filter(attr => attr.name.startsWith('data-'))
      .map(attr => `${attr.name}="${attr.value}"`)
  });
}, { once: true, capture: true });
```

## Reporta los resultados aquí:

```
[Pega el output de la consola aquí]
```
