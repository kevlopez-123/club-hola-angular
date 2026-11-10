/**
 * Calendario propio para todos los `<input type="date">` (sitio y panel).
 *
 * El input sigue siendo el control real (valor yyyy-mm-dd, min/max, eventos `input`/`change`, formularios y
 * pruebas), pero el clic abre un calendario con el estilo de la marca en lugar del selector del navegador.
 * Si junto al input hay otro de fecha (Desde/Hasta, ida/regreso) se resalta el rango entre ambos.
 * Teclado: ← → ↑ ↓ mueven el día, RePág/AvPág el mes, Enter elige, Esc cierra. También se puede escribir la fecha.
 */
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

let popup: HTMLDivElement | null = null;
let origen: HTMLInputElement | null = null;
let mes = new Date(); // primer día del mes mostrado
let activo = ""; // día con el foco del teclado (yyyy-mm-dd)

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const deIso = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00`) : null);
const esFecha = (el: EventTarget | null): el is HTMLInputElement => el instanceof HTMLInputElement && el.type === "date" && !el.disabled && !el.readOnly;

/** El otro input de fecha del mismo bloque (para resaltar el rango). */
function par(el: HTMLInputElement) {
  // Sube por los contenedores hasta encontrar uno que tenga exactamente dos fechas (la nuestra y su pareja).
  let nodo: HTMLElement | null = el.parentElement;
  for (let i = 0; i < 5 && nodo; i++, nodo = nodo.parentElement) {
    const fechas = nodo.querySelectorAll<HTMLInputElement>('input[type="date"]');
    if (fechas.length === 2) return [...fechas].find((x) => x !== el) ?? null;
    if (fechas.length > 2) return null;
  }
  return null;
}
function dibujar() {
  if (!popup || !origen) return;
  const hoy = iso(new Date());
  const sel = origen.value;
  const min = origen.min;
  const max = origen.max;
  const otro = par(origen)?.value ?? "";
  const [desde, hasta] = otro && sel ? [otro < sel ? otro : sel, otro < sel ? sel : otro] : ["", ""];
  const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const offset = (primero.getDay() + 6) % 7; // lunes = 0
  const celdas: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(primero.getFullYear(), primero.getMonth(), 1 - offset + i);
    const s = iso(d);
    const fuera = d.getMonth() !== primero.getMonth();
    const bloqueado = (min && s < min) || (max && s > max);
    const enRango = desde && hasta && s > desde && s < hasta;
    const cls = ["cd-dia", fuera ? "cd-fuera" : "", s === sel ? "cd-sel" : "", s === hoy ? "cd-hoy" : "", enRango ? "cd-rango" : "", s === activo ? "cd-activo" : ""].filter(Boolean).join(" ");
    celdas.push(`<button type="button" data-dia="${s}" class="${cls}" tabindex="-1" ${bloqueado ? "disabled" : ""} aria-label="${d.getDate()} de ${MESES[d.getMonth()]!.toLowerCase()} de ${d.getFullYear()}" ${s === sel ? 'aria-pressed="true"' : ""}>${d.getDate()}</button>`);
  }
  popup.innerHTML = `
    <div class="cd-cab">
      <span class="cd-navs"><button type="button" data-nav="-12" class="cd-nav" aria-label="Año anterior" tabindex="-1">«</button><button type="button" data-nav="-1" class="cd-nav" aria-label="Mes anterior" tabindex="-1">‹</button></span>
      <b aria-live="polite">${MESES[primero.getMonth()]} ${primero.getFullYear()}</b>
      <span class="cd-navs"><button type="button" data-nav="1" class="cd-nav" aria-label="Mes siguiente" tabindex="-1">›</button><button type="button" data-nav="12" class="cd-nav" aria-label="Año siguiente" tabindex="-1">»</button></span>
    </div>
    <div class="cd-sem">${DIAS.map((d) => `<span>${d}</span>`).join("")}</div>
    <div class="cd-grid" role="grid">${celdas.join("")}</div>
    <div class="cd-pie"><button type="button" data-hoy tabindex="-1" ${(min && hoy < min) || (max && hoy > max) ? "disabled" : ""}>Hoy</button>${origen.required ? "" : '<button type="button" data-borrar tabindex="-1">Borrar</button>'}</div>`;
}

function posicionar() {
  if (!popup || !origen) return;
  const r = origen.getBoundingClientRect();
  const sube = window.innerHeight - r.bottom < popup.offsetHeight + 12 && r.top > window.innerHeight - r.bottom;
  popup.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - popup.offsetWidth - 8))}px`;
  popup.style.top = sube ? `${Math.max(8, r.top - popup.offsetHeight - 4)}px` : `${r.bottom + 4}px`;
}

function elegir(valor: string) {
  const el = origen;
  if (!el) return;
  const cambio = el.value !== valor;
  el.value = valor;
  if (cambio) {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  cerrar();
  el.focus();
}

function abrir(el: HTMLInputElement) {
  cerrar();
  origen = el;
  // Sin valor, abre en el día de hoy; si hoy no se puede elegir (p. ej. mayor de 18 años), en el límite más cercano permitido.
  const hoy = iso(new Date());
  const inicio = el.max && hoy > el.max ? el.max : el.min && hoy < el.min ? el.min : "";
  const base = deIso(el.value) ?? deIso(inicio) ?? new Date();
  mes = new Date(base.getFullYear(), base.getMonth(), 1);
  activo = el.value || iso(base);
  popup = document.createElement("div");
  popup.className = "cd-popup";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-label", "Elegir fecha");
  popup.addEventListener("mousedown", (e) => e.preventDefault()); // el foco se queda en el input
  popup.addEventListener("click", (e) => {
    const t = (e.target as HTMLElement).closest("button");
    if (!t || t.disabled) return;
    if (t.dataset["dia"]) elegir(t.dataset["dia"]);
    else if (t.dataset["nav"]) {
      mes = new Date(mes.getFullYear(), mes.getMonth() + Number(t.dataset["nav"]), 1);
      dibujar();
    } else if ("hoy" in t.dataset) {
      const h = iso(new Date());
      if ((!el.min || h >= el.min) && (!el.max || h <= el.max)) elegir(h);
    } else if ("borrar" in t.dataset) elegir("");
  });
  document.body.appendChild(popup);
  dibujar();
  posicionar();
  el.setAttribute("aria-expanded", "true");
}

function cerrar() {
  popup?.remove();
  popup = null;
  origen?.setAttribute("aria-expanded", "false");
  origen = null;
}

function moverActivo(dias: number, meses = 0) {
  const d = deIso(activo) ?? new Date();
  d.setDate(d.getDate() + dias);
  if (meses) d.setMonth(d.getMonth() + meses);
  activo = iso(d);
  mes = new Date(d.getFullYear(), d.getMonth(), 1);
  dibujar();
}

export function iniciarCalendariosPropios() {
  if (typeof document === "undefined") return;

  document.addEventListener(
    "mousedown",
    (e) => {
      const t = e.target as Element | null;
      if (popup && t?.closest(".cd-popup")) return;
      if (esFecha(t)) {
        e.preventDefault(); // evita el selector nativo del navegador
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
        if (esFecha(t) && (e.key === "Enter" || e.key === "ArrowDown") && !e.altKey) {
          e.preventDefault();
          abrir(t);
        }
        return;
      }
      const paso: Record<string, () => void> = {
        ArrowLeft: () => moverActivo(-1),
        ArrowRight: () => moverActivo(1),
        ArrowUp: () => moverActivo(-7),
        ArrowDown: () => moverActivo(7),
        PageUp: () => moverActivo(0, -1),
        PageDown: () => moverActivo(0, 1),
      };
      if (paso[e.key]) {
        e.preventDefault();
        paso[e.key]!();
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        const b = popup.querySelector<HTMLButtonElement>(`[data-dia="${activo}"]`);
        if (b && !b.disabled) elegir(activo);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cerrar();
      } else if (e.key === "Tab") cerrar();
    },
    true,
  );

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
