import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender, computed, effect, inject, signal, viewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import type * as Leaflet from "leaflet";
import { BrandService } from "../core/brand.service";
import { CatalogService } from "../core/catalog.service";
import { distanciaKm, textoDistancia } from "../core/geo";
import type { Local } from "../core/mock-api/seed/locales";
import { IconComponent } from "../shared/icon.component";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function cargarCssDeLeaflet() {
  if (document.getElementById("leaflet-css")) return;
  const l = document.createElement("link");
  l.id = "leaflet-css";
  l.rel = "stylesheet";
  l.href = "leaflet.css";
  document.head.appendChild(l);
}

/* ------------------------------------------------------------------ */
/* Mapa de establecimientos (/mapa)                                    */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-mapa-page",
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-surface py-10">
      <div class="page-container">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 class="text-xl font-extrabold text-ink sm:text-2xl">Mapa de establecimientos</h1>
            <p class="mt-1 text-sm text-muted-foreground">Encuentra dónde canjear tus beneficios, cerca de ti.</p>
          </div>
          <button type="button" (click)="cerca()" [disabled]="buscandoPos()"
            class="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-60">
            <app-icon name="MapPin" class="h-4 w-4" /> {{ miPos() ? 'Actualizar mi ubicación' : 'Cerca de mí' }}
          </button>
        </div>
        @if (avisoPos()) { <p role="status" class="mt-2 text-sm text-muted-foreground">{{ avisoPos() }}</p> }

        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <input type="search" aria-label="Buscar establecimiento" placeholder="Busca por marca, local o distrito" [value]="q()" (input)="q.set($any($event.target).value)"
            class="h-11 rounded-full border border-border bg-card px-4 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/50" />
          <select aria-label="Marca" (change)="marca.set($any($event.target).value)"
            class="select-field h-11 rounded-full border border-border bg-card px-4 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-primary/50">
            <option value="" [selected]="!marca()">Todas las marcas</option>
            @for (m of marcas(); track m) { <option [value]="m" [selected]="m === marca()">{{ m }}</option> }
          </select>
          <select aria-label="Categoría" (change)="categoria.set($any($event.target).value)"
            class="select-field h-11 rounded-full border border-border bg-card px-4 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-primary/50">
            <option value="" [selected]="!categoria()">Todas las categorías</option>
            @for (c of categorias(); track c) { <option [value]="c" [selected]="c === categoria()">{{ c }}</option> }
          </select>
        </div>

        <p class="mt-4 text-sm text-muted-foreground" aria-live="polite">{{ lista().length }} {{ lista().length === 1 ? 'establecimiento' : 'establecimientos' }}</p>

        <div class="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div #mapa role="application" aria-label="Mapa de establecimientos aliados" class="relative z-0 h-[26rem] w-full overflow-hidden rounded-2xl border border-border bg-muted lg:h-[34rem]"></div>
          <ul class="max-h-[34rem] space-y-3 overflow-y-auto pr-1" aria-label="Lista de establecimientos">
            @for (l of lista(); track l.id) {
              <li>
                <button type="button" (click)="ver(l)" [class]="'w-full rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary ' + (seleccionado() === l.id ? 'border-primary ring-2 ring-primary/30' : 'border-border')">
                  <span class="flex items-start justify-between gap-2">
                    <span class="font-bold text-ink">{{ l.nombre }}</span>
                    @if (l.distancia !== null) { <span class="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-primary">{{ texto(l.distancia) }}</span> }
                  </span>
                  <span class="mt-1 block text-sm text-ink">{{ l.direccion }}, {{ l.distrito }}</span>
                  @if (l.horario) { <span class="mt-1 block text-xs text-muted-foreground">{{ l.horario }}</span> }
                </button>
              </li>
            } @empty {
              <li class="rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">No encontramos establecimientos con esos filtros.</li>
            }
          </ul>
        </div>
        <p class="mt-3 text-xs text-muted-foreground">Mapa © colaboradores de OpenStreetMap. Tu ubicación se usa solo en tu dispositivo para ordenar la lista.</p>
      </div>
    </section>
  `,
})
export class MapaPage implements OnDestroy {
  private readonly catalog = inject(CatalogService);
  private readonly brand = inject(BrandService);
  private readonly contenedor = viewChild.required<ElementRef<HTMLElement>>("mapa");

  protected readonly q = signal("");
  protected readonly marca = signal(inject(ActivatedRoute).snapshot.queryParamMap.get("marca") ?? "");
  protected readonly categoria = signal("");
  protected readonly seleccionado = signal("");
  protected readonly miPos = signal<{ lat: number; lng: number } | null>(null);
  protected readonly buscandoPos = signal(false);
  protected readonly avisoPos = signal("");
  protected readonly texto = textoDistancia;

  /** Categorías de los beneficios de cada marca (para filtrar el mapa por rubro). */
  private readonly categoriasPorMarca = computed(() => {
    const m = new Map<string, Set<string>>();
    for (const b of this.catalog.beneficios()) (m.get(b.marca) ?? m.set(b.marca, new Set()).get(b.marca)!).add(b.categoria);
    return m;
  });
  protected readonly marcas = computed(() => [...new Set(this.catalog.locales().map((l) => l.marca))].sort((a, b) => a.localeCompare(b, "es")));
  protected readonly categorias = computed(() => [...new Set([...this.categoriasPorMarca().values()].flatMap((s) => [...s]))].sort((a, b) => a.localeCompare(b, "es")));

  protected readonly lista = computed(() => {
    const q = this.q().trim().toLowerCase();
    const pos = this.miPos();
    const cat = this.categoria();
    const filas = this.catalog.locales()
      .filter((l) => (!this.marca() || l.marca === this.marca()) && (!cat || this.categoriasPorMarca().get(l.marca)?.has(cat)))
      .filter((l) => !q || `${l.nombre} ${l.marca} ${l.distrito} ${l.direccion}`.toLowerCase().includes(q))
      .map((l) => ({ ...l, distancia: pos ? distanciaKm(pos, l) : (null as number | null) }));
    return pos ? filas.sort((a, b) => a.distancia! - b.distancia!) : filas.sort((a, b) => a.marca.localeCompare(b.marca, "es") || a.nombre.localeCompare(b.nombre, "es"));
  });

  private L?: typeof Leaflet;
  private mapa?: Leaflet.Map;
  private capa?: Leaflet.LayerGroup;
  private marcadores = new Map<string, Leaflet.Marker>();
  private miMarcador?: Leaflet.CircleMarker;
  private readonly listo = signal(false);

  constructor() {
    afterNextRender(() => void this.iniciar());
    // Los pines siguen a los filtros.
    effect(() => {
      const filas = this.lista();
      if (this.listo()) this.dibujar(filas);
    });
  }

  private async iniciar() {
    cargarCssDeLeaflet();
    this.L = await import("leaflet");
    const c = this.brand.pais().centro;
    this.mapa = this.L.map(this.contenedor().nativeElement).setView([c.lat, c.lng], c.zoom);
    this.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(this.mapa);
    this.capa = this.L.layerGroup().addTo(this.mapa);
    setTimeout(() => this.mapa?.invalidateSize(), 150);
    this.listo.set(true);
  }

  private popup(l: Local): string {
    const beneficios = this.catalog.beneficios().filter((b) => b.marca === l.marca).slice(0, 3);
    const lista = beneficios.map((b) => `<li><a href="/beneficios/${encodeURIComponent(b.id)}" style="color:var(--primary);font-weight:700">${esc(b.nombre)}</a></li>`).join("");
    return `<div style="min-width:180px"><strong>${esc(l.nombre)}</strong><br>${esc(l.direccion)}, ${esc(l.distrito)}${l.horario ? `<br><small>${esc(l.horario)}</small>` : ""}${lista ? `<ul style="margin:.5rem 0 0;padding-left:1rem">${lista}</ul>` : ""}</div>`;
  }

  private dibujar(filas: Local[]) {
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
      const m = L.marker([l.lat, l.lng], { icon: pin, title: l.nombre, alt: l.nombre }).bindPopup(this.popup(l)).addTo(this.capa);
      m.on("click", () => this.seleccionado.set(l.id));
      this.marcadores.set(l.id, m);
    }
    if (filas.length) this.mapa.fitBounds(L.latLngBounds(filas.map((l) => [l.lat, l.lng] as [number, number])), { padding: [40, 40], maxZoom: 15 });
  }

  protected ver(l: Local) {
    this.seleccionado.set(l.id);
    const m = this.marcadores.get(l.id);
    if (!m || !this.mapa) return;
    this.mapa.setView([l.lat, l.lng], Math.max(this.mapa.getZoom(), 15));
    m.openPopup();
  }

  protected cerca() {
    if (!navigator.geolocation) { this.avisoPos.set("Tu navegador no permite obtener la ubicación."); return; }
    this.buscandoPos.set(true);
    this.avisoPos.set("Obteniendo tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        this.miPos.set(pos);
        this.buscandoPos.set(false);
        this.avisoPos.set("Ordenados del más cercano al más lejano.");
        const L = this.L;
        if (L && this.mapa) {
          this.miMarcador?.remove();
          this.miMarcador = L.circleMarker([pos.lat, pos.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).bindTooltip("Estás aquí").addTo(this.mapa);
          const primero = this.lista()[0];
          if (primero) this.mapa.fitBounds(L.latLngBounds([[pos.lat, pos.lng], [primero.lat, primero.lng]]), { padding: [50, 50], maxZoom: 15 });
        }
      },
      () => { this.buscandoPos.set(false); this.avisoPos.set("No pudimos acceder a tu ubicación. Puedes buscar por distrito o marca."); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  ngOnDestroy() {
    this.mapa?.remove();
  }
}
