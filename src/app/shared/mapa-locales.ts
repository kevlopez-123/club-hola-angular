import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender, effect, inject, input, model, signal, viewChild } from "@angular/core";
import type * as Leaflet from "leaflet";
import { cargarLeaflet } from "./leaflet";
import { BrandService } from "../core/brand.service";
import { distanciaKm } from "../core/geo";
import type { Local } from "../core/mock-api/seed/locales";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function cargarCssDeLeaflet() {
  if (document.getElementById("leaflet-css")) return;
  const l = document.createElement("link");
  l.id = "leaflet-css";
  l.rel = "stylesheet";
  l.href = "leaflet.css";
  document.head.appendChild(l);
}

/**
 * Mapa pequeño con los locales que se le pasan (por ejemplo, donde se canjea un beneficio). Un pin se elige tocándolo o desde afuera
 * con `seleccionado`; el mapa se ajusta para que se vean todos.
 */
@Component({
  selector: "app-mapa-locales",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "block" },
  template: `
    <div class="relative h-full min-h-64 w-full">
      <div #mapa role="application" [attr.aria-label]="'Mapa de ' + locales().length + (locales().length === 1 ? ' establecimiento' : ' establecimientos')" class="relative z-0 h-full min-h-64 w-full overflow-hidden rounded-2xl border border-border bg-muted"></div>
      @if (avisoMapa()) {
        <div role="status" class="pointer-events-none absolute inset-0 z-[500] grid place-items-center rounded-2xl bg-ink/45 p-4 text-center text-sm font-semibold text-white">
          {{ avisoMapa() }}
        </div>
      }
    </div>
  `,
})
export class MapaLocalesComponent implements OnDestroy {
  readonly locales = input.required<readonly Local[]>();
  readonly seleccionado = model<string | null>(null);
  /** Posición de la persona (si la compartió): se marca en el mapa y se encuadra junto con el local más cercano. */
  readonly miPos = input<{ lat: number; lng: number } | null>(null);

  private readonly brand = inject(BrandService);
  private readonly contenedor = viewChild.required<ElementRef<HTMLElement>>("mapa");
  private readonly listo = signal(false);
  private L?: typeof Leaflet;
  private mapa?: Leaflet.Map;
  private capa?: Leaflet.LayerGroup;
  private readonly marcadores = new Map<string, Leaflet.Marker>();
  private observador?: ResizeObserver;
  private miMarcador?: Leaflet.CircleMarker;
  /** En pantallas táctiles un dedo mueve la página y dos dedos mueven el mapa; con mouse, la rueda sola mueve la página y Ctrl (⌘ en Mac) + rueda hace zoom. */
  private readonly tactil = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
  protected readonly teclaZoom = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl";
  /** Aviso breve sobre el mapa cuando se intenta moverlo o hacerle zoom de la forma que no corresponde. */
  protected readonly avisoMapa = signal("");
  private temporizadorAviso: ReturnType<typeof setTimeout> | undefined;
  private quitarRueda?: () => void;

  constructor() {
    afterNextRender(() => void this.iniciar());
    effect(() => {
      const filas = this.locales();
      if (this.listo()) this.dibujar(filas);
    });
    effect(() => {
      const id = this.seleccionado();
      if (this.listo()) this.enfocar(id);
    });
    // Va después de enfocar el local elegido: al compartir la ubicación el encuadre final incluye a la persona.
    effect(() => {
      const pos = this.miPos();
      if (this.listo()) this.mostrarMiPos(pos);
    });
  }

  private async iniciar() {
    cargarCssDeLeaflet();
    this.L = await cargarLeaflet();
    const c = this.brand.pais().centro;
    // En táctil se desactiva el arrastre de un dedo (así la página puede seguir su scroll); dos dedos mueven el mapa con el gesto de pellizco.
    this.mapa = this.L.map(this.contenedor().nativeElement, { dragging: !this.tactil }).setView([c.lat, c.lng], c.zoom);
    this.controlarRueda();
    this.controlarToque();
    this.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(this.mapa);
    this.capa = this.L.layerGroup().addTo(this.mapa);
    setTimeout(() => this.mapa?.invalidateSize(), 150);
    this.observador = new ResizeObserver(() => this.mapa?.invalidateSize());
    this.observador.observe(this.contenedor().nativeElement);
    this.listo.set(true);
  }

  /**
   * En una página larga la rueda no debe quedar atrapada por el mapa: sin Ctrl (⌘) el evento no llega a Leaflet, así la página sigue su
   * scroll y se avisa cómo hacer zoom; con Ctrl (⌘) o con el gesto de pellizco de un trackpad, el mapa hace zoom.
   */
  private controlarRueda() {
    const envoltorio = this.contenedor().nativeElement.parentElement;
    if (!envoltorio) return;
    const alRodar = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        this.avisoMapa.set("");
        return;
      }
      e.stopPropagation();
      this.mostrarAviso(`Usa ${this.teclaZoom} + rueda del mouse para hacer zoom en el mapa`);
    };
    envoltorio.addEventListener("wheel", alRodar, { capture: true, passive: true });
    this.quitarRueda = () => envoltorio.removeEventListener("wheel", alRodar, true);
  }

  private mostrarMiPos(pos: { lat: number; lng: number } | null) {
    const L = this.L;
    if (!L || !this.mapa) return;
    this.miMarcador?.remove();
    this.miMarcador = undefined;
    if (!pos) return;
    this.miMarcador = L.circleMarker([pos.lat, pos.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).bindTooltip("Estás aquí").addTo(this.mapa);
    const cercano = [...this.locales()].sort((a, b) => distanciaKm(pos, a) - distanciaKm(pos, b))[0];
    if (!cercano) return;
    this.mapa.fitBounds(L.latLngBounds([[pos.lat, pos.lng], [cercano.lat, cercano.lng]]), { padding: [50, 50], maxZoom: 15 });
    // El encuadre mueve el mapa después de abrir el globo del local elegido: se reabre al terminar para que quede a la vista.
    this.mapa.once("moveend", () => {
      const id = this.seleccionado();
      if (id) this.marcadores.get(id)?.openPopup();
    });
  }

  private mostrarAviso(texto: string) {
    this.avisoMapa.set(texto);
    clearTimeout(this.temporizadorAviso);
    this.temporizadorAviso = setTimeout(() => this.avisoMapa.set(""), 1500);
  }

  /** Táctil: si alguien intenta mover el mapa con un solo dedo, se le dice que use dos (con un dedo la página sigue su scroll). */
  private controlarToque() {
    const envoltorio = this.contenedor().nativeElement.parentElement;
    if (!envoltorio || !this.tactil) return;
    const alMover = (e: TouchEvent) => {
      if (e.touches.length === 1) this.mostrarAviso("Usa dos dedos para mover el mapa");
      else this.avisoMapa.set("");
    };
    envoltorio.addEventListener("touchmove", alMover, { passive: true });
    const quitarRueda = this.quitarRueda;
    this.quitarRueda = () => {
      quitarRueda?.();
      envoltorio.removeEventListener("touchmove", alMover);
    };
  }

  private dibujar(filas: readonly Local[]) {
    const L = this.L;
    if (!L || !this.mapa || !this.capa) return;
    this.capa.clearLayers();
    this.marcadores.clear();
    const pin = L.divIcon({
      className: "",
      iconSize: [28, 36],
      iconAnchor: [14, 34],
      popupAnchor: [0, -30],
      html: `<svg width="28" height="36" viewBox="0 0 32 40" aria-hidden="true"><path d="M16 1C8 1 2 7 2 15c0 10 14 24 14 24s14-14 14-24C30 7 24 1 16 1z" fill="var(--primary)" stroke="#fff" stroke-width="2"/><circle cx="16" cy="15" r="5.5" fill="#fff"/></svg>`,
    });
    for (const l of filas) {
      const m = L.marker([l.lat, l.lng], { icon: pin, title: l.nombre, alt: l.nombre })
        .bindPopup(`<strong>${esc(l.nombre)}</strong><br>${esc(l.direccion)}, ${esc(l.distrito)}${l.horario ? `<br><small>${esc(l.horario)}</small>` : ""}`)
        .addTo(this.capa);
      m.on("click", () => this.seleccionado.set(l.id));
      this.marcadores.set(l.id, m);
    }
    if (filas.length === 1) this.mapa.setView([filas[0]!.lat, filas[0]!.lng], 15);
    else if (filas.length) this.mapa.fitBounds(L.latLngBounds(filas.map((l) => [l.lat, l.lng] as [number, number])), { padding: [36, 36], maxZoom: 15 });
  }

  private enfocar(id: string | null) {
    if (!id || !this.mapa) return;
    const m = this.marcadores.get(id);
    if (!m) return;
    this.mapa.setView(m.getLatLng(), Math.max(this.mapa.getZoom(), 15));
    m.openPopup();
  }

  ngOnDestroy() {
    this.quitarRueda?.();
    clearTimeout(this.temporizadorAviso);
    this.observador?.disconnect();
    this.mapa?.remove();
  }
}
