import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender, effect, inject, input, output, signal, untracked, viewChild } from "@angular/core";
import type * as Leaflet from "leaflet";
import { BrandService } from "../core/brand.service";

export type Ubicacion = { lat: number; lng: number };
export type SugerenciaDireccion = { direccion: string; distrito: string };
/** Zona (ciudad o provincia) en la que el mapa se centra al elegirla en el formulario. */
export type ZonaMapa = { texto: string; zoom: number };

const NOMINATIM = "https://nominatim.openstreetmap.org";

/** La hoja de estilos de Leaflet se descarga solo cuando se usa un mapa (no pesa en la carga inicial). */
function cargarCssDeLeaflet() {
  if (document.getElementById("leaflet-css")) return;
  const l = document.createElement("link");
  l.id = "leaflet-css";
  l.rel = "stylesheet";
  l.href = "leaflet.css";
  document.head.appendChild(l);
}

/**
 * Selector de ubicación con mapa de OpenStreetMap (Leaflet).
 * Se marca con un clic, arrastrando el pin, buscando una dirección o usando la ubicación del dispositivo.
 * Emite las coordenadas y, si el servicio de OpenStreetMap responde, una sugerencia de dirección y ciudad.
 * Es opcional: el formulario sigue funcionando escribiendo la dirección a mano.
 */
@Component({
  selector: "app-map-picker",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "block" },
  template: `
    <div class="grid gap-2">
      <div class="flex flex-wrap gap-2">
        <input type="search" aria-label="Buscar dirección en el mapa" placeholder="Buscar dirección o lugar"
          class="h-11 min-w-0 flex-1 rounded-full border border-border bg-card px-4 text-base text-ink outline-none focus:ring-2 focus:ring-primary/50"
          [value]="consulta()" (input)="consulta.set($any($event.target).value)" (keydown.enter)="$event.preventDefault(); buscar()" />
        <button type="button" (click)="buscar()" class="min-h-11 rounded-full border border-border px-4 text-base font-semibold text-ink hover:border-primary hover:text-primary">Buscar</button>
        <button type="button" (click)="miUbicacion()" class="min-h-11 rounded-full border border-border px-4 text-base font-semibold text-ink hover:border-primary hover:text-primary">Mi ubicación</button>
      </div>
      <div #mapa role="application" aria-label="Mapa para ubicar tu dirección: haz clic o arrastra el pin" class="relative z-0 h-60 w-full overflow-hidden rounded-2xl border border-border bg-muted"></div>
      <p class="text-sm text-muted-foreground" aria-live="polite">{{ estado() }}</p>
    </div>
  `,
})
export class MapPickerComponent implements OnDestroy {
  /** Ubicación ya elegida (para editar una dirección guardada). */
  readonly lat = input<number | null | undefined>(null);
  readonly lng = input<number | null | undefined>(null);
  /** Ciudad o provincia elegida: el mapa se centra ahí (sin marcar un punto) y la búsqueda se limita a esa zona. */
  readonly zona = input<ZonaMapa | null>(null);
  readonly ubicacionCambia = output<Ubicacion>();
  readonly sugerencia = output<SugerenciaDireccion>();

  private readonly brand = inject(BrandService);
  private readonly contenedor = viewChild.required<ElementRef<HTMLElement>>("mapa");
  protected readonly consulta = signal("");
  protected readonly estado = signal("Toca el mapa para marcar dónde entregamos.");

  private L?: typeof Leaflet;
  private mapa?: Leaflet.Map;
  private marcador?: Leaflet.Marker;
  private observador?: ResizeObserver;

  constructor() {
    afterNextRender(() => void this.iniciar());
    // Si la ubicación cambia desde afuera (editar otra dirección), el pin la sigue.
    effect(() => {
      const lat = this.lat();
      const lng = this.lng();
      if (this.mapa && lat != null && lng != null) this.colocar(lat, lng, false);
    });
    effect(() => {
      const z = this.zona();
      untracked(() => {
        this.zonaPendiente = z;
        if (z && this.mapa) void this.irAZona(z);
      });
    });
  }

  private zonaPendiente: ZonaMapa | null = null;
  private secuenciaZona = 0;
  private readonly cacheZona = new Map<string, { lat: number; lng: number; caja?: [number, number, number, number] } | null>();
  /** Centra el mapa en la zona elegida. Si ya hay un punto marcado dentro de ella, no lo mueve. */
  private async irAZona(z: ZonaMapa) {
    const seq = ++this.secuenciaZona;
    let r = this.cacheZona.get(z.texto);
    if (r === undefined) {
      try {
        const pais = this.brand.pais().codigo.toLowerCase();
        const resp = await fetch(`${NOMINATIM}/search?format=jsonv2&limit=1&accept-language=es&countrycodes=${pais}&q=${encodeURIComponent(z.texto)}`);
        const j = (await resp.json()) as { lat: string; lon: string; boundingbox?: string[] }[];
        const b = j[0]?.boundingbox?.map(Number);
        r = j[0] ? { lat: +j[0].lat, lng: +j[0].lon, ...(b && b.length === 4 && b.every(Number.isFinite) ? { caja: b as [number, number, number, number] } : {}) } : null;
      } catch {
        r = null; // sin conexión: el mapa queda donde estaba
      }
      this.cacheZona.set(z.texto, r);
    }
    if (!r || seq !== this.secuenciaZona || !this.mapa) return;
    const m = this.marcador?.getLatLng();
    if (m && (!r.caja || (m.lat >= r.caja[0] && m.lat <= r.caja[1] && m.lng >= r.caja[2] && m.lng <= r.caja[3]))) return;
    this.mapa.setView([r.lat, r.lng], z.zoom);
    if (!m) this.estado.set(`Mapa centrado en ${z.texto.split(",")[0]}. Toca el mapa para marcar dónde entregamos.`);
  }

  private async iniciar() {
    cargarCssDeLeaflet();
    const L = (this.L = await import("leaflet"));
    const c = this.brand.pais().centro;
    const lat = this.lat();
    const lng = this.lng();
    const hay = lat != null && lng != null;
    this.mapa = L.map(this.contenedor().nativeElement, { zoomControl: true, attributionControl: true }).setView(hay ? [lat!, lng!] : [c.lat, c.lng], hay ? 17 : c.zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(this.mapa);
    this.mapa.on("click", (e: Leaflet.LeafletMouseEvent) => this.colocar(e.latlng.lat, e.latlng.lng, true));
    if (hay) this.colocar(lat!, lng!, false);
    else if (this.zonaPendiente) void this.irAZona(this.zonaPendiente);
    // El mapa se crea dentro de un modal: se recalcula su tamaño cuando ya es visible.
    setTimeout(() => this.mapa?.invalidateSize(), 150);
    this.observador = new ResizeObserver(() => this.mapa?.invalidateSize());
    this.observador.observe(this.contenedor().nativeElement);
  }

  private colocar(lat: number, lng: number, emitir: boolean) {
    const L = this.L;
    if (!L || !this.mapa) return;
    if (!this.marcador) {
      const pin = L.divIcon({
        className: "",
        iconSize: [32, 40],
        iconAnchor: [16, 38],
        html: `<svg width="32" height="40" viewBox="0 0 32 40" aria-hidden="true"><path d="M16 1C8 1 2 7 2 15c0 10 14 24 14 24s14-14 14-24C30 7 24 1 16 1z" fill="var(--primary)" stroke="#fff" stroke-width="2"/><circle cx="16" cy="15" r="5.5" fill="#fff"/></svg>`,
      });
      this.marcador = L.marker([lat, lng], { draggable: true, icon: pin, alt: "Ubicación de entrega" }).addTo(this.mapa);
      this.marcador.on("dragend", () => {
        const p = this.marcador!.getLatLng();
        this.colocar(p.lat, p.lng, true);
      });
    } else this.marcador.setLatLng([lat, lng]);
    this.mapa.panTo([lat, lng]);
    this.estado.set(`Ubicación marcada: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    if (emitir) {
      this.ubicacionCambia.emit({ lat, lng });
      void this.direccionDe(lat, lng);
    }
  }

  /** Dirección aproximada del punto (OpenStreetMap / Nominatim). Si no responde, se escribe a mano. */
  private async direccionDe(lat: number, lng: number) {
    try {
      const r = await fetch(`${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=es&lat=${lat}&lon=${lng}`);
      if (!r.ok) return;
      const j = (await r.json()) as { address?: Record<string, string>; display_name?: string };
      const a = j.address ?? {};
      const calle = [a["road"], a["house_number"]].filter(Boolean).join(" ") || (j.display_name ?? "").split(",")[0]!.trim();
      const ciudad = a["city"] ?? a["town"] ?? a["village"] ?? a["suburb"] ?? a["county"] ?? "";
      const distrito = [ciudad, a["state"]].filter(Boolean).join(", ");
      if (calle || distrito) this.sugerencia.emit({ direccion: calle, distrito });
    } catch {
      /* sin conexión con OpenStreetMap: se continúa con la dirección escrita */
    }
  }

  protected async buscar() {
    let q = this.consulta().trim();
    if (!q) return;
    // La búsqueda se limita a la ciudad y provincia elegidas (si lo escrito no las nombra ya).
    const z = this.zona();
    if (z && !q.toLowerCase().includes(z.texto.split(",")[0]!.toLowerCase())) q = `${q}, ${z.texto}`;
    this.estado.set("Buscando…");
    try {
      const pais = this.brand.pais().codigo.toLowerCase();
      const r = await fetch(`${NOMINATIM}/search?format=jsonv2&limit=1&accept-language=es&countrycodes=${pais}&q=${encodeURIComponent(q)}`);
      const j = (await r.json()) as { lat: string; lon: string }[];
      if (!j.length) return this.estado.set("No encontramos ese lugar. Prueba con otra dirección o marca el punto en el mapa.");
      const lat = +j[0]!.lat;
      const lng = +j[0]!.lon;
      this.mapa?.setView([lat, lng], 17);
      this.colocar(lat, lng, true);
    } catch {
      this.estado.set("No pudimos buscar ahora. Marca el punto directamente en el mapa.");
    }
  }

  protected miUbicacion() {
    if (!navigator.geolocation) return this.estado.set("Tu navegador no permite obtener la ubicación.");
    this.estado.set("Obteniendo tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        this.mapa?.setView([p.coords.latitude, p.coords.longitude], 17);
        this.colocar(p.coords.latitude, p.coords.longitude, true);
      },
      () => this.estado.set("No pudimos acceder a tu ubicación. Márcala en el mapa."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  ngOnDestroy() {
    this.observador?.disconnect();
    this.mapa?.remove();
  }
}
