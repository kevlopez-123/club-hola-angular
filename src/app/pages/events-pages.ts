import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ApiService } from "../core/api.service";
import { CatalogService } from "../core/catalog.service";
import { leer } from "../core/leer";
import { StoreService } from "../core/store.service";
import { SesionService } from "../core/sesion.service";
import {
  ETIQUETA_ESTADO, TIPOS_EVENTO, esPasado, etiquetaTipo, fechaLabel, fotosEvento, type EstadoPreinscripcion, type Evento, type Preinscripcion,
} from "../core/eventos";
import { tieneAcceso } from "../core/mock-api/seed/niveles";
import { IconComponent } from "../shared/icon.component";
import { ModalComponent, SectionTitleComponent } from "../shared/ui";
import { CategoryStripComponent } from "../shared/widgets";

const ESTILO_ESTADO: Record<EstadoPreinscripcion, string> = {
  confirmado: "bg-lima text-ink",
  "en-lista": "bg-secondary text-primary",
  asistido: "bg-muted text-ink",
  cancelado: "bg-destructive/10 text-destructive",
};

/* ------------------------------------------------------------------ */
/* Tarjeta de evento                                                   */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-evento-card",
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "block h-full" },
  template: `
    <article [class]="'card-elevate group flex h-full flex-col overflow-hidden rounded-2xl bg-card ' + (inscrito() && !pasado() ? 'ring-2 ring-primary' : '')">
      <a [routerLink]="['/eventos', evento().id]" class="relative block overflow-hidden bg-muted">
        <img [src]="evento().imagen" [alt]="evento().nombre" width="1024" height="683" loading="lazy"
          [class]="'h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105 ' + (pasado() ? 'grayscale-[35%]' : '')" />
        <span class="badge-pill absolute left-3 top-3 bg-lima px-4 py-1 text-xs font-bold text-ink">{{ tipo() }}</span>
        @if (estado(); as e) { <span [class]="'absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs font-bold ' + e.cls">{{ e.txt }}</span> }
      </a>
      <div class="flex flex-1 flex-col p-4">
        <p class="text-sm uppercase tracking-wide text-muted-foreground">{{ evento().marca }}</p>
        <a [routerLink]="['/eventos', evento().id]"><h3 class="mt-1 line-clamp-2 text-base font-semibold text-ink hover:text-primary">{{ evento().nombre }}</h3></a>
        <ul class="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <li class="flex items-center gap-2"><app-icon name="CalendarDays" class="h-4 w-4 text-primary" /> {{ fecha() }}</li>
          <li class="flex items-center gap-2"><app-icon name="Clock" class="h-4 w-4 text-primary" /> {{ evento().hora }}</li>
          <li class="flex items-center gap-2"><app-icon name="MapPin" class="h-4 w-4 text-primary" /> {{ evento().lugar }} · {{ evento().distrito }}</li>
          @if (pasado()) {
            <li class="flex items-center gap-2"><app-icon name="Images" class="h-4 w-4 text-primary" /> {{ fotos() }} fotos · {{ evento().asistentes ?? evento().cupos }} asistentes</li>
          } @else {
            <li class="flex items-center gap-2"><app-icon name="Users" class="h-4 w-4 text-primary" /> {{ evento().cuposRestantes }} cupos disponibles</li>
          }
        </ul>
        <p class="mt-3 text-base font-extrabold text-ink">{{ evento().costo }}</p>
        <p class="text-sm text-muted-foreground">Nivel mínimo: {{ evento().nivelMinimo }}</p>
        <a [routerLink]="['/eventos', evento().id]"
          [class]="'mt-4 flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold uppercase tracking-wide transition-transform hover:scale-[1.03] lg:min-h-12 ' + (pasado() ? 'border border-primary text-primary' : inscrito() ? 'bg-lima text-ink' : 'bg-primary text-primary-foreground')">
          @if (pasado()) { <app-icon name="Images" class="h-4 w-4" /> Ver galería }
          @else if (inscrito()) { <app-icon name="CheckCircle2" class="h-4 w-4" /> Ver mi pre-inscripción }
          @else if (agotado()) { Unirme a lista de espera }
          @else { Ver evento }
        </a>
      </div>
    </article>
  `,
})
export class EventoCardComponent {
  readonly evento = input.required<Evento>();
  /** Códigos de eventos en los que el participante ya está pre-inscrito (no cancelados). */
  readonly inscritos = input<readonly string[]>([]);
  protected readonly pasado = computed(() => esPasado(this.evento()));
  protected readonly inscrito = computed(() => this.inscritos().includes(this.evento().id));
  protected readonly agotado = computed(() => !this.pasado() && this.evento().cuposRestantes === 0);
  protected readonly tipo = computed(() => etiquetaTipo(this.evento().tipo));
  protected readonly fecha = computed(() => fechaLabel(this.evento().fechaISO));
  protected readonly fotos = computed(() => fotosEvento(this.evento()).length);
  protected readonly estado = computed(() => {
    const e = this.evento();
    if (this.pasado()) return { txt: "Evento realizado", cls: "bg-muted text-ink" };
    if (this.inscrito()) return { txt: "Ya estás pre-inscrito", cls: "bg-primary text-primary-foreground" };
    if (this.agotado()) return { txt: "Sin cupos · lista de espera", cls: "bg-destructive/10 text-destructive" };
    if (e.cuposRestantes <= 6) return { txt: `¡Últimos ${e.cuposRestantes} cupos!`, cls: "bg-secondary text-primary" };
    return null;
  });
}

/* ------------------------------------------------------------------ */
/* Listado (/eventos)                                                  */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-eventos-page",
  imports: [RouterLink, CategoryStripComponent, EventoCardComponent, SectionTitleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="overflow-hidden">
      <img src="img/e-hero.jpg" alt="Eventos exclusivos para tarjetahabientes" width="1600" height="700" class="aspect-[16/9] w-full object-cover sm:aspect-[21/8] lg:aspect-[3/1]" />
    </section>

    <h1 class="sr-only">Eventos exclusivos</h1>
    <section class="bg-background py-6">
      <div class="page-container">
        <div class="mx-auto flex w-fit rounded-full bg-secondary p-1" role="tablist" aria-label="Próximos o pasados">
          @for (t of vistas; track t.k) {
            <button type="button" role="tab" [attr.aria-selected]="vista() === t.k" (click)="vista.set(t.k)"
              [class]="'min-h-11 rounded-full px-6 text-sm font-bold transition-colors ' + (vista() === t.k ? 'bg-primary text-primary-foreground' : 'text-primary hover:bg-secondary')">{{ t.label }}</button>
          }
        </div>
        <div class="mt-4"><app-category-strip [categorias]="categorias" [(value)]="tipo" /></div>
      </div>
    </section>

    <section class="bg-surface py-10">
      <div class="page-container">
        <app-section-title [text]="vista() === 'pasados' ? 'Revive los eventos' : 'Descubre los eventos'" [highlight]="vista() === 'pasados' ? 'pasados' : 'próximos'" />

        <div class="mx-auto mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row">
          <input type="search" [value]="query()" (input)="query.set($any($event.target).value)" placeholder="Buscar evento, marca o distrito" aria-label="Buscar eventos"
            class="h-12 w-full rounded-full bg-card px-5 text-base text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/60" />
          <a routerLink="/eventos/mis-inscripciones" class="flex min-h-12 shrink-0 items-center justify-center rounded-full border border-primary px-6 text-base font-semibold text-primary transition-colors hover:bg-secondary">Mis pre-inscripciones</a>
        </div>

        <div class="mx-auto mt-3 grid max-w-2xl gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label for="ev-desde" class="mb-1 block text-sm font-semibold text-ink">Desde</label>
            <input id="ev-desde" type="date" [value]="desde()" (input)="desde.set($any($event.target).value)" class="h-12 w-full rounded-full bg-card px-5 text-base text-foreground outline-none focus:ring-2 focus:ring-primary/60" />
          </div>
          <div>
            <label for="ev-hasta" class="mb-1 block text-sm font-semibold text-ink">Hasta</label>
            <input id="ev-hasta" type="date" [value]="hasta()" (input)="hasta.set($any($event.target).value)" class="h-12 w-full rounded-full bg-card px-5 text-base text-foreground outline-none focus:ring-2 focus:ring-primary/60" />
          </div>
          <button type="button" (click)="limpiar()" class="flex min-h-12 items-center justify-center self-end rounded-full border border-border px-5 text-base font-semibold text-ink transition-colors hover:bg-card">Limpiar filtros</button>
        </div>

        <p class="mt-6 text-sm text-muted-foreground">{{ lista().length }} {{ vista() === 'pasados' ? 'eventos realizados' : 'eventos disponibles' }}</p>
        <div class="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          @for (e of lista(); track e.id) { <app-evento-card [evento]="e" [inscritos]="inscritos()" /> }
        </div>
        @if (cargado() && lista().length === 0) {
          <p class="py-16 text-center text-sm text-muted-foreground">No encontramos eventos con esos filtros. Prueba con otra búsqueda o rango de fechas.</p>
        }
      </div>
    </section>
  `,
})
export class EventosPage {
  private readonly api = inject(ApiService);
  private readonly sesion = inject(SesionService);
  protected readonly vistas = [{ k: "proximos", label: "Próximos eventos" }, { k: "pasados", label: "Eventos pasados" }] as const;
  protected readonly categorias = TIPOS_EVENTO;
  protected readonly vista = signal<"proximos" | "pasados">("proximos");
  protected readonly tipo = signal<string | null>(null);
  protected readonly query = signal("");
  protected readonly desde = signal("");
  protected readonly hasta = signal("");

  private readonly eventos = leer(this.api.get<Evento[]>("eventos"), undefined as Evento[] | undefined);
  private readonly mias = leer(this.api.get<Preinscripcion[]>("me/preinscripciones"), [] as Preinscripcion[]);
  protected readonly cargado = computed(() => this.eventos() !== undefined);
  protected readonly inscritos = computed(() => (this.sesion.logged() ? this.mias().filter((p) => p.estado !== "cancelado").map((p) => p.eventoId) : []));

  protected readonly lista = computed(() => {
    const q = this.query().trim().toLowerCase();
    const pasados = this.vista() === "pasados";
    return (this.eventos() ?? [])
      .filter((e) => (pasados ? esPasado(e) : !esPasado(e)))
      .filter((e) => !this.tipo() || e.tipo === this.tipo())
      .filter((e) => !q || `${e.nombre} ${e.marca} ${etiquetaTipo(e.tipo)} ${e.distrito}`.toLowerCase().includes(q))
      .filter((e) => (!this.desde() || e.fechaISO >= this.desde()) && (!this.hasta() || e.fechaISO <= this.hasta()))
      .sort((a, b) => (pasados ? b.fechaISO.localeCompare(a.fechaISO) : a.fechaISO.localeCompare(b.fechaISO)));
  });

  protected limpiar() {
    this.tipo.set(null);
    this.query.set("");
    this.desde.set("");
    this.hasta.set("");
  }
}

/* ------------------------------------------------------------------ */
/* Detalle y pre-inscripción (/eventos/:id)                            */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-evento-detalle-page",
  imports: [RouterLink, IconComponent, ModalComponent, EventoCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (evento(); as ev) {
      <section class="bg-surface py-8">
        <div class="page-container">
          <nav class="mb-5 text-sm text-muted-foreground"><a routerLink="/eventos" class="hover:text-primary">Eventos</a> · <span>{{ tipo() }}</span></nav>

          <div class="grid gap-8 lg:grid-cols-2">
            <div>
              <img [src]="galeria()[foto()] ?? ev.imagen" [alt]="ev.nombre" width="1024" height="683" class="h-[300px] w-full rounded-2xl object-cover sm:h-[420px]" />
              @if (galeria().length > 1) {
                <div class="mt-3 flex gap-3">
                  @for (g of galeria(); track g + $index; let i = $index) {
                    <button type="button" [attr.aria-label]="'Ver foto ' + (i + 1)" (click)="foto.set(i)"
                      [class]="'h-20 w-24 overflow-hidden rounded-xl border-2 transition-colors ' + (i === foto() ? 'border-primary' : 'border-transparent')">
                      <img [src]="g" alt="" loading="lazy" class="h-full w-full object-cover" />
                    </button>
                  }
                </div>
              }
            </div>

            <div>
              <span class="badge-pill bg-lima px-5 py-1 text-sm font-bold text-ink">{{ tipo() }}</span>
              <p class="mt-4 text-sm uppercase tracking-wide text-muted-foreground">{{ ev.marca }}</p>
              <h1 class="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">{{ ev.nombre }}</h1>
              <p class="mt-3 text-base text-muted-foreground">{{ ev.descripcion }}</p>

              <ul class="mt-6 grid gap-3 sm:grid-cols-2">
                @for (d of datos(); track d.txt) {
                  <li class="flex items-center gap-2 rounded-xl bg-card px-4 py-3 text-base text-ink"><app-icon [name]="d.icono" class="h-5 w-5 shrink-0 text-primary" /> {{ d.txt }}</li>
                }
              </ul>

              @if (pasado()) {
                <div class="mt-6 rounded-2xl bg-card p-5">
                  <p class="flex items-center gap-2 text-base font-bold text-ink"><app-icon name="Images" class="h-5 w-5 text-primary" /> Evento realizado</p>
                  <p class="mt-1 text-base text-muted-foreground">Participaron {{ ev.asistentes ?? ev.cupos }} tarjetahabientes. Revisa las fotos más abajo.</p>
                </div>
              } @else if (inscrito(); as p) {
                <div class="mt-6 rounded-2xl bg-secondary p-5">
                  <p class="flex items-center gap-2 text-base font-bold text-primary"><app-icon name="CheckCircle2" class="h-5 w-5" /> Ya estás pre-inscrito</p>
                  <p class="mt-1 text-base text-muted-foreground">Código {{ p.codigo }} · {{ estados[p.estado] }}</p>
                  <a routerLink="/eventos/mis-inscripciones" class="mt-4 flex min-h-12 items-center justify-center rounded-full bg-primary px-6 text-base font-bold text-primary-foreground lg:min-h-14">Ver mi pre-inscripción</a>
                </div>
              } @else if (faltaNivel()) {
                <div role="status" class="mt-6 rounded-2xl border border-aviso-borde bg-aviso-fondo p-5">
                  <p class="flex items-start gap-2 text-sm font-semibold text-aviso"><app-icon name="Lock" class="mt-0.5 h-5 w-5 shrink-0" /> <span>Este evento está disponible desde el nivel {{ ev.nivelMinimo }}. Tu nivel actual es {{ store.usuario().nivel }}.</span></p>
                </div>
              } @else {
                <button type="button" (click)="abrir()" class="mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.02] lg:min-h-14">
                  {{ agotado() ? "Unirme a la lista de espera" : "Pre-inscribirme" }}
                </button>
                <p class="mt-2 text-center text-sm text-muted-foreground">
                  {{ agotado() ? "El evento no tiene cupos disponibles. Te avisaremos si se libera uno." : "La pre-inscripción no garantiza el cupo hasta la confirmación por correo." }}
                </p>
              }
            </div>
          </div>

          @if (pasado() && fotos().length) {
            <div id="galeria" class="mt-10 scroll-mt-24 rounded-2xl bg-card p-6">
              <h2 class="text-lg font-extrabold text-ink">Galería del evento</h2>
              <p class="mt-1 text-base text-muted-foreground">{{ fotos().length }} fotos de {{ fecha() }}</p>
              <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                @for (f of fotos(); track f + $index; let i = $index) {
                  <img [src]="f" [alt]="ev.nombre + ' — foto ' + (i + 1)" width="1024" height="683" loading="lazy" class="h-44 w-full rounded-xl object-cover transition-transform duration-500 hover:scale-[1.03]" />
                }
              </div>
            </div>
          }

          <div class="mt-10 space-y-6">
            <div class="rounded-2xl bg-card p-6">
              <h2 class="text-lg font-extrabold text-ink">¿Qué incluye?</h2>
              <ul class="mt-4 space-y-2">
                @for (i of ev.incluye; track i) { <li class="flex items-start gap-2 text-base text-muted-foreground"><app-icon name="Check" class="mt-0.5 h-5 w-5 shrink-0 text-primary" /> {{ i }}</li> }
              </ul>
            </div>
            <div class="rounded-2xl bg-card p-6">
              <h2 class="text-lg font-extrabold text-ink">Términos y condiciones</h2>
              <ul class="mt-4 list-disc space-y-2 pl-5 text-base text-muted-foreground">
                @for (c of ev.condiciones; track c) { <li>{{ c }}</li> }
              </ul>
            </div>
          </div>

          @if (relacionados().length) {
            <div class="mt-12">
              <h2 class="text-xl font-extrabold text-ink">Otros eventos similares</h2>
              <div class="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                @for (r of relacionados(); track r.id) { <app-evento-card [evento]="r" /> }
              </div>
            </div>
          }
        </div>
      </section>

      <app-modal [open]="abierto()" [title]="codigo() ? '¡Pre-inscripción registrada!' : 'Formulario de pre-inscripción'" (closed)="cerrar()">
        @if (codigo(); as cod) {
          <div class="text-center">
            <div class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-lima"><app-icon name="Check" class="h-8 w-8 text-ink" /></div>
            <p class="mt-4 text-base text-muted-foreground">Registramos tu pre-inscripción a <strong class="text-ink">{{ ev.nombre }}</strong>. Te confirmaremos el cupo por correo a {{ form().correo }}.</p>
            <p class="mt-4 rounded-xl bg-muted px-4 py-3 text-base font-extrabold text-ink">Código: {{ cod }}</p>
            <a routerLink="/eventos/mis-inscripciones" (click)="cerrar()" class="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-base font-bold text-primary-foreground">Ver mis pre-inscripciones</a>
          </div>
        } @else {
          <form class="space-y-4" (submit)="$event.preventDefault(); enviar()">
            <p class="text-base text-muted-foreground">{{ ev.nombre }} · {{ fecha() }} · {{ ev.hora }}</p>
            <div>
              <label for="f-nombre" class="mb-1 block text-sm font-semibold text-ink">Nombre completo</label>
              <input id="f-nombre" maxlength="100" [value]="form().nombre" (input)="set('nombre', $any($event.target).value)" [class]="campo" />
              @if (errores().nombre) { <p class="mt-1 text-sm text-destructive">{{ errores().nombre }}</p> }
            </div>
            <div>
              <label for="f-documento" class="mb-1 block text-sm font-semibold text-ink">Documento de identidad</label>
              <input id="f-documento" maxlength="20" [value]="form().documento" (input)="set('documento', $any($event.target).value)" [class]="campo" />
              @if (errores().documento) { <p class="mt-1 text-sm text-destructive">{{ errores().documento }}</p> }
            </div>
            <div>
              <label for="f-correo" class="mb-1 block text-sm font-semibold text-ink">Correo electrónico</label>
              <input id="f-correo" type="email" maxlength="255" [value]="form().correo" (input)="set('correo', $any($event.target).value)" [class]="campo" />
              @if (errores().correo) { <p class="mt-1 text-sm text-destructive">{{ errores().correo }}</p> }
            </div>
            <div>
              <label for="f-telefono" class="mb-1 block text-sm font-semibold text-ink">Teléfono de contacto</label>
              <input id="f-telefono" type="tel" maxlength="15" [value]="form().telefono" (input)="set('telefono', $any($event.target).value)" [class]="campo" />
              @if (errores().telefono) { <p class="mt-1 text-sm text-destructive">{{ errores().telefono }}</p> }
            </div>
            <div>
              <label for="f-acomp" class="mb-1 block text-sm font-semibold text-ink">Acompañantes</label>
              <select id="f-acomp" [class]="campo" (change)="set('acompanantes', $any($event.target).value)">
                <option value="0" [selected]="form().acompanantes === '0'">Sin acompañantes</option>
                <option value="1" [selected]="form().acompanantes === '1'">1 acompañante</option>
                <option value="2" [selected]="form().acompanantes === '2'">2 acompañantes</option>
              </select>
            </div>
            <div>
              <label for="f-restr" class="mb-1 block text-sm font-semibold text-ink">Restricciones alimenticias o de accesibilidad (opcional)</label>
              <input id="f-restr" maxlength="200" [value]="form().restricciones" (input)="set('restricciones', $any($event.target).value)" [class]="campo" />
            </div>
            <div>
              <label for="f-coment" class="mb-1 block text-sm font-semibold text-ink">Comentario para el organizador (opcional)</label>
              <textarea id="f-coment" rows="3" maxlength="500" [value]="form().comentario" (input)="set('comentario', $any($event.target).value)" class="w-full rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground outline-none focus:ring-2 focus:ring-primary/60"></textarea>
            </div>
            <label class="flex items-start gap-3 text-base text-muted-foreground">
              <input type="checkbox" [checked]="form().acepta" (change)="set('acepta', $any($event.target).checked)" class="mt-1 h-5 w-5 shrink-0 rounded border-border accent-[var(--primary)]" />
              Acepto los términos y condiciones del evento y el tratamiento de mis datos personales.
            </label>
            @if (errores().acepta) { <p class="text-sm text-destructive">{{ errores().acepta }}</p> }
            @if (errorServidor()) { <p role="alert" class="rounded-xl bg-aviso-fondo p-3 text-sm font-semibold text-aviso">{{ errorServidor() }}</p> }
            <button type="submit" [disabled]="enviando()" class="flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-base font-bold uppercase tracking-wide text-primary-foreground disabled:opacity-60">
              {{ enviando() ? "Enviando…" : "Enviar pre-inscripción" }}
            </button>
          </form>
        }
      </app-modal>
    } @else if (cargado()) {
      <div class="bg-surface py-24 text-center">
        <h1 class="text-2xl font-extrabold text-ink">Evento no disponible</h1>
        <a routerLink="/eventos" class="mt-6 inline-flex min-h-12 items-center rounded-full bg-primary px-6 text-base font-bold text-primary-foreground">Ver todos los eventos</a>
      </div>
    }
  `,
})
export class EventoDetallePage {
  private readonly api = inject(ApiService);
  private readonly sesion = inject(SesionService);
  protected readonly store = inject(StoreService);
  private readonly catalog = inject(CatalogService);
  readonly id = input.required<string>();
  protected readonly estados = ETIQUETA_ESTADO;
  protected readonly campo = "h-12 w-full rounded-xl border border-border bg-card px-4 text-base text-foreground outline-none focus:ring-2 focus:ring-primary/60";

  private readonly todos = signal<Evento[] | undefined>(undefined);
  protected readonly cargado = computed(() => this.todos() !== undefined);
  protected readonly evento = computed(() => this.todos()?.find((e) => e.id === this.id()));
  protected readonly mias = signal<Preinscripcion[]>([]);
  protected readonly relacionados = computed(() => (this.todos() ?? []).filter((e) => e.tipo === this.evento()?.tipo && e.id !== this.id()).slice(0, 4));

  protected readonly pasado = computed(() => { const e = this.evento(); return !!e && esPasado(e); });
  protected readonly tipo = computed(() => etiquetaTipo(this.evento()?.tipo ?? ""));
  protected readonly fecha = computed(() => fechaLabel(this.evento()?.fechaISO ?? ""));
  protected readonly fotos = computed(() => { const e = this.evento(); return e ? fotosEvento(e) : []; });
  protected readonly galeria = computed(() => { const e = this.evento(); return !e ? [] : this.pasado() ? this.fotos() : e.galeria; });
  protected readonly foto = signal(0);
  protected readonly agotado = computed(() => !this.pasado() && (this.evento()?.cuposRestantes ?? 1) === 0);
  protected readonly inscrito = computed(() => this.mias().find((p) => p.eventoId === this.id() && p.estado !== "cancelado") ?? null);
  protected readonly faltaNivel = computed(() => {
    const e = this.evento();
    return !!e && this.sesion.logged() && !tieneAcceso(this.catalog.niveles(), this.store.usuario().nivel, e.nivelMinimo);
  });
  protected readonly datos = computed(() => {
    const e = this.evento();
    if (!e) return [];
    return [
      { icono: "CalendarDays", txt: this.fecha() },
      { icono: "Clock", txt: e.hora },
      { icono: "MapPin", txt: `${e.lugar} · ${e.distrito}` },
      { icono: "Users", txt: this.pasado() ? `${e.asistentes ?? e.cupos} asistentes` : `${e.cuposRestantes} de ${e.cupos} cupos disponibles` },
      { icono: "ShieldCheck", txt: `Nivel mínimo: ${e.nivelMinimo}` },
      { icono: "Ticket", txt: e.costo },
    ];
  });

  protected readonly abierto = signal(false);
  protected readonly codigo = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly errorServidor = signal("");
  protected readonly errores = signal<Partial<Record<"nombre" | "documento" | "correo" | "telefono" | "acepta", string>>>({});
  protected readonly form = signal({ nombre: "", documento: "", correo: "", telefono: "", acompanantes: "0", restricciones: "", comentario: "", acepta: false });

  constructor() {
    this.cargarEventos();
    if (this.sesion.logged()) this.cargarMias();
  }
  private cargarEventos() {
    this.api.get<Evento[]>("eventos").subscribe({ next: (x) => this.todos.set(x), error: () => this.todos.set([]) });
  }
  private cargarMias() {
    this.api.get<Preinscripcion[]>("me/preinscripciones").subscribe({ next: (m) => this.mias.set(m), error: () => undefined });
  }

  protected set(k: keyof ReturnType<typeof this.form>, v: string | boolean) {
    this.form.update((f) => ({ ...f, [k]: v }));
  }

  protected abrir() {
    if (!this.store.exigirSesion()) return;
    const p = this.store.perfil();
    this.form.update((f) => ({
      ...f,
      nombre: f.nombre || (p ? `${p.nombres} ${p.apellidos}`.trim() : ""),
      documento: f.documento || p?.codigoParticipante || "",
      correo: f.correo || p?.correo || "",
      telefono: f.telefono || p?.telefono || "",
    }));
    this.errores.set({});
    this.errorServidor.set("");
    this.codigo.set(null);
    this.abierto.set(true);
  }
  protected cerrar() {
    this.abierto.set(false);
    this.codigo.set(null);
  }

  private validar() {
    const f = this.form();
    const e: Record<string, string> = {};
    if (f.nombre.trim().length < 3) e["nombre"] = "Ingresa tu nombre completo.";
    if (!/^[0-9A-Za-z-]{6,20}$/.test(f.documento.trim())) e["documento"] = "Documento inválido.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.correo.trim())) e["correo"] = "Correo inválido.";
    if (!/^[0-9+\s]{9,15}$/.test(f.telefono.trim())) e["telefono"] = "Teléfono inválido.";
    if (!f.acepta) e["acepta"] = "Debes aceptar los términos del evento.";
    this.errores.set(e);
    return Object.keys(e).length === 0;
  }

  protected enviar() {
    if (this.enviando() || !this.validar()) return;
    const f = this.form();
    this.errorServidor.set("");
    this.enviando.set(true);
    this.api
      .post<Preinscripcion>(`eventos/${this.id()}/preinscribir`, { acompanantes: Number(f.acompanantes), telefono: f.telefono, restricciones: f.restricciones, comentario: f.comentario })
      .subscribe({
        next: (p) => {
          this.enviando.set(false);
          this.codigo.set(p.codigo);
          this.cargarMias();
          this.cargarEventos();
        },
        error: (e) => {
          this.enviando.set(false);
          this.errorServidor.set(this.store.mensajeError(e, "No pudimos registrar tu pre-inscripción. Inténtalo otra vez."));
        },
      });
  }
}

/* ------------------------------------------------------------------ */
/* Mis pre-inscripciones (/eventos/mis-inscripciones)                  */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-mis-inscripciones-page",
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-surface py-10">
      <div class="page-container">
        <h1 class="text-2xl font-extrabold text-ink sm:text-3xl">Mis pre-inscripciones</h1>
        <p class="mt-2 text-base text-muted-foreground">Historial de eventos a los que te has pre-registrado y el estado de cada solicitud.</p>

        <div class="mt-8 space-y-4">
          @for (p of lista(); track p.id) {
            @if (evento(p.eventoId); as ev) {
              <article class="card-elevate flex flex-col gap-4 rounded-2xl bg-card p-4 sm:flex-row sm:items-center">
                <img [src]="ev.imagen" [alt]="ev.nombre" width="1024" height="683" loading="lazy" class="h-32 w-full rounded-xl object-cover sm:h-24 sm:w-36" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm uppercase tracking-wide text-muted-foreground">{{ tipo(ev) }}</p>
                  <h2 class="text-base font-semibold text-ink">{{ ev.nombre }}</h2>
                  <p class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span class="flex items-center gap-1.5"><app-icon name="CalendarDays" class="h-4 w-4 text-primary" /> {{ fecha(ev) }}</span>
                    <span class="flex items-center gap-1.5"><app-icon name="MapPin" class="h-4 w-4 text-primary" /> {{ ev.distrito }}</span>
                    <span class="flex items-center gap-1.5"><app-icon name="Ticket" class="h-4 w-4 text-primary" /> {{ p.codigo }}</span>
                  </p>
                  <p class="mt-1 text-sm text-muted-foreground">Pre-inscrito el {{ p.fecha }} · {{ p.acompanantes > 0 ? p.acompanantes + " acompañante(s)" : "Sin acompañantes" }}</p>
                </div>
                <div class="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                  <span [class]="'badge-pill px-4 py-1 text-xs font-bold ' + estilos[p.estado]">{{ etiquetas[p.estado] }}</span>
                  <div class="flex flex-wrap gap-2">
                    @if (puedeCancelar(p)) {
                      <button type="button" (click)="cancelar(p)" class="flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-muted-foreground transition-colors hover:border-destructive hover:text-destructive">Cancelar</button>
                    }
                    <a [routerLink]="['/eventos', ev.id]" class="flex min-h-11 items-center justify-center rounded-full border border-primary px-5 text-sm font-semibold text-primary transition-colors hover:bg-secondary">Ver evento</a>
                  </div>
                </div>
              </article>
            }
          }
        </div>

        @if (cargado() && lista().length === 0) {
          <div class="mt-10 rounded-2xl bg-card p-10 text-center">
            <p class="text-base text-muted-foreground">Aún no te has pre-inscrito a ningún evento.</p>
            <a routerLink="/eventos" class="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 text-base font-bold text-primary-foreground">Ver eventos próximos</a>
          </div>
        }
      </div>
    </section>
  `,
})
export class MisInscripcionesPage {
  private readonly api = inject(ApiService);
  protected readonly estilos = ESTILO_ESTADO;
  protected readonly etiquetas = ETIQUETA_ESTADO;
  protected readonly lista = signal<Preinscripcion[]>([]);
  protected readonly cargado = signal(false);
  private readonly eventos = leer(this.api.get<Evento[]>("eventos"), [] as Evento[]);

  constructor() {
    this.api.get<Preinscripcion[]>("me/preinscripciones").subscribe({ next: (l) => { this.lista.set(l); this.cargado.set(true); }, error: () => this.cargado.set(true) });
  }

  protected evento(id: string) {
    return this.eventos().find((e) => e.id === id);
  }
  protected tipo(e: Evento) {
    return etiquetaTipo(e.tipo);
  }
  protected fecha(e: Evento) {
    return fechaLabel(e.fechaISO);
  }
  protected puedeCancelar(p: Preinscripcion) {
    const e = this.evento(p.eventoId);
    return (p.estado === "confirmado" || p.estado === "en-lista") && !!e && !esPasado(e);
  }
  protected cancelar(p: Preinscripcion) {
    this.api.post<Preinscripcion>(`me/preinscripciones/${p.codigo}/cancelar`, {}).subscribe((r) => this.lista.update((l) => l.map((x) => (x.id === r.id ? r : x))));
  }
}
