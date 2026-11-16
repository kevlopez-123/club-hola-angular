import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender, effect, inject, input, model, signal, viewChild } from "@angular/core";
import type * as Leaflet from "leaflet";
import { BrandService } from "../core/brand.service";
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
  template: `<div #mapa role="application" [attr.aria-label]="'Mapa de ' + locales().length + (locales().length === 1 ? ' establecimiento' : ' establecimientos')" class="relative z-0 h-full min-h-64 w-full overflow-hidden rounded-2xl border border-border bg-muted"></div>`,
})
export class MapaLocalesComponent implements OnDestroy {
  readonly locales = input.required<readonly Local[]>();
  readonly seleccionado = model<string | null>(null);

  private readonly brand = inject(BrandService);
  private readonly contenedor = viewChild.required<ElementRef<HTMLElement>>("mapa");
  private readonly listo = signal(false);
  private L?: typeof Leaflet;
  private mapa?: Leaflet.Map;
  private capa?: Leaflet.LayerGroup;
  private readonly marcadores = new Map<string, Leaflet.Marker>();
  private observador?: ResizeObserver;

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
  }

  private async iniciar() {
    cargarCssDeLeaflet();
    this.L = await import("leaflet");
    const c = this.brand.pais().centro;
    this.mapa = this.L.map(this.contenedor().nativeElement, { scrollWheelZoom: false }).setView([c.lat, c.lng], c.zoom);
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
    this.observador?.disconnect();
    this.mapa?.remove();
  }
}
