/**
 * Menús desplegables propios para todos los `<select>` (sitio y panel).
 *
 * El `<select>` sigue siendo el control real (valor, formularios, accesibilidad, eventos `input`/`change`),
 * pero en lugar del menú nativo del navegador se abre una lista con el estilo de la marca, también en escritorio.
 * No hay que cambiar ninguna pantalla: se engancha al documento y funciona con los `<select>` actuales y futuros.
 * Teclado: ↑ ↓ Inicio Fin, Enter/Espacio para elegir, Esc para cerrar, letras para saltar a una opción.
 */
let popup: HTMLDivElement | null = null;
let origen: HTMLSelectElement | null = null;
let activo = -1;
let busqueda = "";
let temporizadorBusqueda: ReturnType<typeof setTimeout> | undefined;

const esSelect = (el: EventTarget | null): el is HTMLSelectElement =>
  el instanceof HTMLSelectElement && !el.multiple && !el.disabled && el.size <= 1;

const opciones = () => (origen ? Array.from(origen.options) : []);

function marcarActivo(i: number, desplazar = true) {
  if (!popup) return;
  const items = popup.querySelectorAll<HTMLElement>('[role="option"]');
  activo = Math.max(0, Math.min(i, items.length - 1));
  items.forEach((el, k) => {
    const on = k === activo;
    el.dataset["activo"] = on ? "1" : "0";
    if (on) {
      popup!.setAttribute("aria-activedescendant", el.id);
      if (desplazar) el.scrollIntoView({ block: "nearest" });
    }
  });
}

function elegir(i: number) {
  const s = origen;
  const op = opciones()[i];
  if (!s || !op || op.disabled) return;
  const cambio = s.selectedIndex !== i;
  s.selectedIndex = i;
  if (cambio) {
    s.dispatchEvent(new Event("input", { bubbles: true }));
    s.dispatchEvent(new Event("change", { bubbles: true }));
  }
  cerrar();
  s.focus();
}

function posicionar() {
  if (!popup || !origen) return;
  const r = origen.getBoundingClientRect();
  const alto = Math.min(popup.scrollHeight, 288);
  const abajo = window.innerHeight - r.bottom;
  const arriba = r.top;
  const sube = abajo < alto + 12 && arriba > abajo;
  popup.style.minWidth = `${Math.max(r.width, 160)}px`;
  popup.style.maxHeight = `${Math.max(120, Math.min(288, (sube ? arriba : abajo) - 12))}px`;
  popup.style.left = `${Math.min(r.left, window.innerWidth - popup.offsetWidth - 8)}px`;
  popup.style.top = sube ? `${Math.max(8, r.top - popup.offsetHeight - 4)}px` : `${r.bottom + 4}px`;
}

function abrir(s: HTMLSelectElement) {
  cerrar();
  origen = s;
  const el = document.createElement("div");
  el.className = "cs-popup";
  el.setAttribute("role", "listbox");
  el.setAttribute("tabindex", "-1");
  if (s.getAttribute("aria-label")) el.setAttribute("aria-label", s.getAttribute("aria-label")!);
  const base = `cs-${Math.random().toString(36).slice(2, 7)}`;
  opciones().forEach((o, i) => {
    const li = document.createElement("div");
    li.id = `${base}-${i}`;
    li.className = "cs-opcion";
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", String(o.selected));
    if (o.disabled) li.setAttribute("aria-disabled", "true");
    li.textContent = o.text || " ";
    li.addEventListener("mousemove", () => marcarActivo(i, false));
    li.addEventListener("mousedown", (e) => e.preventDefault()); // conserva el foco en el select
    li.addEventListener("click", () => elegir(i));
    el.appendChild(li);
  });
  document.body.appendChild(el);
  popup = el;
  s.setAttribute("aria-expanded", "true");
  posicionar();
  marcarActivo(Math.max(0, s.selectedIndex));
}

function cerrar() {
  popup?.remove();
  popup = null;
  origen?.setAttribute("aria-expanded", "false");
  origen = null;
  activo = -1;
}

function saltarPorTexto(tecla: string) {
  clearTimeout(temporizadorBusqueda);
  busqueda += tecla.toLowerCase();
  temporizadorBusqueda = setTimeout(() => (busqueda = ""), 600);
  const lista = opciones();
  const desde = busqueda.length === 1 ? activo + 1 : activo;
  const orden = [...lista.keys()].map((_, k) => (desde + k) % lista.length);
  const i = orden.find((k) => !lista[k]!.disabled && lista[k]!.text.toLowerCase().startsWith(busqueda));
  if (i !== undefined) marcarActivo(i);
}

export function iniciarSelectoresPropios() {
  if (typeof document === "undefined") return;

  document.addEventListener(
    "mousedown",
    (e) => {
      const t = e.target as Element | null;
      if (popup && t?.closest(".cs-popup")) return;
      if (esSelect(t)) {
        e.preventDefault(); // evita el menú nativo
        const mismo = origen === t;
        t.focus();
        mismo ? cerrar() : abrir(t);
      } else if (popup) cerrar();
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (e) => {
      const t = e.target;
      if (!popup) {
        if (esSelect(t) && [" ", "Enter", "ArrowDown", "ArrowUp"].includes(e.key) && !e.altKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          abrir(t);
        }
        return;
      }
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          marcarActivo(activo + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          marcarActivo(activo - 1);
          break;
        case "Home":
          e.preventDefault();
          marcarActivo(0);
          break;
        case "End":
          e.preventDefault();
          marcarActivo(opciones().length - 1);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          e.stopPropagation();
          elegir(activo);
          break;
        case "Escape":
          e.preventDefault();
          e.stopPropagation(); // no cierra además el panel o el diálogo de abajo
          cerrar();
          break;
        case "Tab":
          cerrar();
          break;
        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) saltarPorTexto(e.key);
      }
    },
    true,
  );

  // Al desplazar la página la lista acompaña al select; solo se cierra si el select sale de la pantalla.
  const alReubicar = (e: Event) => {
    if (!popup || !origen || (e.target instanceof Node && popup.contains(e.target))) return;
    const r = origen.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) cerrar();
    else posicionar();
  };
  window.addEventListener("scroll", alReubicar, true);
  window.addEventListener("resize", cerrar);
  window.addEventListener("blur", cerrar);
}
