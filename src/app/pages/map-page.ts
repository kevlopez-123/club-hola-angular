import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender, computed, effect, inject, signal, viewChild } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import type * as Leaflet from "leaflet";
import { cargarLeaflet } from "../shared/leaflet";
import { BrandService } from "../core/brand.service";
import { CatalogService } from "../core/catalog.service";
import { distanciaKm, textoDistancia } from "../core/geo";
import { aplicaEnLocal } from "../core/locales-beneficio";
import type { Local } from "../core/mock-api/seed/locales";
import { IconComponent } from "../shared/icon.component";
import { ComboboxComponent } from "../shared/combobox";
import { SesionService } from "../core/sesion.service";
import { StoreService } from "../core/store.service";
import { regionInicial } from "../core/region";

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
  imports: [IconComponent, ComboboxComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-surface py-10">
      <div class="page-container">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 class="text-xl font-extrabold text-ink sm:text-2xl">Mapa de establecimientos</h1>
            <p class="mt-1 text-sm text-muted-foreground">Encuentra dónde canjear tus beneficios, cerca de ti.</p>
          </div>
        </div>
        @if (avisoPos()) { <p role="status" class="mt-2 text-sm text-muted-foreground">{{ avisoPos() }}</p> }

        <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input type="search" aria-label="Buscar establecimiento" placeholder="Busca por marca, local o distrito" [value]="q()" (input)="q.set($any($event.target).value)"
            class="h-11 rounded-full border border-border bg-card px-4 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/50" />
          <app-combobox etiqueta="Departamento" todas="Todos los departamentos" [opciones]="departamentos()" [value]="departamento()" (valueChange)="cambiarDepartamento($event)" />
          <app-combobox etiqueta="Marca" todas="Todas las marcas" [opciones]="marcas()" [(value)]="marca" />
          <select aria-label="Categoría" (change)="categoria.set($any($event.target).value)"
            class="select-field h-11 rounded-full border border-border bg-card px-4 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-primary/50">
            <option value="" [selected]="!categoria()">Todas las categorías</option>
            @for (c of categorias(); track c) { <option [value]="c" [selected]="c === categoria()">{{ c }}</option> }
          </select>
        </div>

        @if (regionAuto()) {
          <p role="status" class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink">
            <span>Te mostramos los establecimientos de <b>{{ regionAuto() }}</b>, según tu perfil.</span>
            <button type="button" (click)="cambiarDepartamento('')" class="font-semibold text-primary underline underline-offset-2">Ver todo el país</button>
          </p>
        }
        <p class="mt-4 text-sm text-muted-foreground" aria-live="polite">{{ lista().length }} {{ lista().length === 1 ? 'establecimiento' : 'establecimientos' }}</p>

        <div class="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div class="relative h-[26rem] lg:h-[34rem]">
            <div #mapa role="application" aria-label="Mapa de establecimientos aliados" class="relative z-0 h-full w-full overflow-hidden rounded-2xl border border-border bg-muted"></div>
            <button type="button" (click)="cerca()" [disabled]="buscandoPos()"
              class="absolute right-3 top-3 z-[1000] inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-60">
              <app-icon name="MapPin" class="h-4 w-4" /> {{ buscandoPos() ? 'Ubicándote…' : miPos() ? 'Actualizar mi ubicación' : 'Cerca de mí' }}
            </button>
          </div>
          <ul class="max-h-[34rem] space-y-3 overflow-y-auto pr-1" aria-label="Lista de establecimientos">
            @for (l of lista(); track l.id) {
              <li [class]="'rounded-2xl border bg-card transition-colors hover:border-primary ' + (seleccionado() === l.id ? 'border-primary ring-2 ring-primary/30' : 'border-border')">
                <button type="button" (click)="ver(l)" [attr.aria-expanded]="seleccionado() === l.id" class="w-full rounded-2xl p-4 text-left">
                  <span class="flex items-start justify-between gap-2">
                    <span class="font-bold text-ink">{{ l.nombre }}</span>
                    @if (l.distancia !== null) { <span class="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-primary">{{ texto(l.distancia) }}</span> }
                  </span>
                  <span class="mt-2 flex items-start gap-2 text-sm text-ink"><app-icon name="MapPin" class="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{{ l.direccion }}, {{ l.distrito }}</span></span>
                  @if (l.horario) { <span class="mt-1 flex items-start gap-2 text-xs text-muted-foreground"><app-icon name="Clock" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><span>{{ l.horario }}</span></span> }
                  @if (l.telefono) { <span class="mt-1 flex items-start gap-2 text-xs text-muted-foreground"><app-icon name="Phone" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><span>{{ l.telefono }}</span></span> }
                  <span class="mt-2 flex items-center gap-2 text-xs font-bold text-primary"><app-icon name="Gift" class="h-3.5 w-3.5 shrink-0" />{{ cuantos(l) }} {{ cuantos(l) === 1 ? 'beneficio disponible' : 'beneficios disponibles' }}<app-icon name="ChevronDown" [class]="'ml-auto h-4 w-4 transition-transform ' + (seleccionado() === l.id ? 'rotate-180' : '')" /></span>
                </button>
                @if (seleccionado() === l.id) {
                  <ul class="space-y-2 border-t border-border px-4 pb-4 pt-3" [attr.aria-label]="'Beneficios disponibles en ' + l.nombre">
                    @for (b of beneficiosDe(l); track b.id) {
                      <li>
                        <a [href]="'beneficios/' + b.id" [routerLink]="['/beneficios', b.id]" class="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2 text-sm hover:bg-secondary">
                          <span class="min-w-0 font-semibold text-ink">{{ b.nombre }}</span>
                          @if (b.descuento) { <span class="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">{{ b.descuento }}</span> }
                        </a>
                      </li>
                    } @empty {
                      <li class="text-sm text-muted-foreground">Por ahora no hay beneficios disponibles en este local.</li>
                    }
                  </ul>
                }
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
  protected readonly departamento = signal("");
  /** Departamento que se aplicó solo desde el perfil (vacío si la persona lo cambió o no había uno). */
  protected readonly regionAuto = signal("");
  private regionTocada = false;
  private regionResuelta = false;
  private readonly store = inject(StoreService);
  private readonly sesion = inject(SesionService);
  protected readonly seleccionado = signal("");
  protected readonly miPos = signal<{ lat: number; lng: number } | null>(null);
  protected readonly buscandoPos = signal(false);
  protected readonly avisoPos = signal("");
  protected readonly texto = textoDistancia;

  /** Beneficios vigentes que se canjean en ese local (los elegidos en cada beneficio o, si no eligió, todos los de la marca). */
  protected beneficiosDe(l: Local) {
    return this.catalog.beneficios().filter((b) => aplicaEnLocal(b, l, this.catalog.locales()));
  }
  protected cuantos(l: Local) {
    return this.beneficiosDe(l).length;
  }

  /** Categorías de los beneficios de cada marca (para filtrar el mapa por rubro). */
  private readonly categoriasPorMarca = computed(() => {
    const m = new Map<string, Set<string>>();
    for (const b of this.catalog.beneficios()) (m.get(b.marca) ?? m.set(b.marca, new Set()).get(b.marca)!).add(b.categoria);
    return m;
  });
  protected readonly marcas = computed(() => [...new Set(this.catalog.locales().map((l) => l.marca))].sort((a, b) => a.localeCompare(b, "es")));
  /** Departamentos que tienen establecimientos. */
  protected readonly departamentos = computed(() => [...new Set(this.catalog.locales().map((l) => l.provincia))].sort((a, b) => a.localeCompare(b, "es")));
  protected cambiarDepartamento(v: string) {
    this.regionTocada = true;
    this.regionAuto.set("");
    this.departamento.set(v);
  }
  protected readonly categorias = computed(() => [...new Set([...this.categoriasPorMarca().values()].flatMap((s) => [...s]))].sort((a, b) => a.localeCompare(b, "es")));

  protected readonly lista = computed(() => {
    const q = this.q().trim().toLowerCase();
    const pos = this.miPos();
    const cat = this.categoria();
    const filas = this.catalog.locales()
      .filter((l) => (!this.marca() || l.marca === this.marca()) && (!this.departamento() || l.provincia === this.departamento()) && (!cat || this.categoriasPorMarca().get(l.marca)?.has(cat)))
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
    // Con sesión, el mapa abre en el departamento de su perfil si ahí hay establecimientos.
    effect(() => {
      const locales = this.catalog.locales();
      const perfil = this.store.perfil();
      const campos = this.catalog.config()?.formulario ?? [];
      if (this.regionResuelta || this.regionTocada || !this.sesion.logged() || !locales.length || !perfil) return;
      this.regionResuelta = true;
      const campoDepartamento = campos.find((c) => c.mapeo === "provincia");
      const delPerfil = campoDepartamento ? String(perfil.extra?.[campoDepartamento.id] ?? "") : "";
      // Si llegaron desde un enlace con una marca, solo cuenta el departamento donde esa marca tiene locales.
      const marca = this.marca();
      const disponibles = [...new Set(locales.filter((l) => !marca || l.marca === marca).map((l) => l.provincia))];
      const region = regionInicial(delPerfil, disponibles);
      if (region) {
        this.departamento.set(region);
        this.regionAuto.set(region);
      }
    });
    // Los pines siguen a los filtros.
    effect(() => {
      const filas = this.lista();
      if (this.listo()) this.dibujar(filas);
    });
  }

  private async iniciar() {
    cargarCssDeLeaflet();
    this.L = await cargarLeaflet();
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
    const beneficios = this.catalog.beneficios().filter((b) => aplicaEnLocal(b, l, this.catalog.locales())).slice(0, 5);
    const lista = beneficios.map((b) => `<li><a href="beneficios/${encodeURIComponent(b.id)}" style="color:var(--primary);font-weight:700">${esc(b.nombre)}</a></li>`).join("");
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
    const foco = this.enfocarEn;
    this.enfocarEn = null;
    if (foco) this.encuadrarAlrededor(foco);
    else if (filas.length) this.mapa.fitBounds(L.latLngBounds(filas.map((l) => [l.lat, l.lng] as [number, number])), { padding: [40, 40], maxZoom: 15 });
  }

  /** Posición a la que hay que acercar el mapa en cuanto se vuelvan a dibujar los pines (los pines se redibujan al cambiar la lista). */
  private enfocarEn: { lat: number; lng: number } | null = null;

  /** Acerca el mapa a la persona y a los locales que tiene alrededor (hasta 8 a menos de 5 km; si no hay, al más cercano). */
  private encuadrarAlrededor(pos: { lat: number; lng: number }) {
    const L = this.L;
    if (!L || !this.mapa) return;
    const ordenados = this.lista();
    const cerca = ordenados.filter((l) => (l.distancia ?? Infinity) <= 5).slice(0, 8);
    const puntos = (cerca.length ? cerca : ordenados.slice(0, 1)).map((l) => [l.lat, l.lng] as [number, number]);
    const limites = L.latLngBounds([[pos.lat, pos.lng], ...puntos]);
    this.mapa.fitBounds(limites, { padding: [60, 60], maxZoom: cerca.length ? 16 : 14 });
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
        // Si la región se había aplicado sola, se amplía para que lo más cercano a la persona aparezca primero.
        if (this.regionAuto()) this.cambiarDepartamento("");
        this.buscandoPos.set(false);
        this.avisoPos.set("Ordenados del más cercano al más lejano.");
        const L = this.L;
        if (L && this.mapa) {
          this.miMarcador?.remove();
          this.miMarcador = L.circleMarker([pos.lat, pos.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).bindTooltip("Estás aquí").addTo(this.mapa);
          // Los pines se redibujan al ordenarse por cercanía: el zoom se aplica ahí para que no lo pise el encuadre general.
          this.enfocarEn = pos;
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
