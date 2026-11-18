import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChildren } from "@angular/core";
import { Router, RouterLink, ActivatedRoute } from "@angular/router";
import { ApiService } from "../core/api.service";
import { CatalogService, TEXTOS_INGRESO, type TextosIngreso } from "../core/catalog.service";
import { BrandService } from "../core/brand.service";
import { StoreService } from "../core/store.service";
import { SesionService } from "../core/sesion.service";
import { IconComponent } from "../shared/icon.component";
import { limpiarNumeroDocumento, validarNumeroDocumento } from "../core/documento";
import { nombreDispositivo } from "../core/dispositivo";
import { haceTiempo } from "../core/tiempo";
import { environment } from "../../environments/environment";
import { FlagComponent } from "../shared/flag.component";
import { LogoComponent, ModalComponent } from "../shared/ui";
import { MarkdownComponent } from "../shared/markdown.component";
import { legalAMarkdown } from "../core/markdown";
import { alternar, type Intereses } from "../core/intereses";


/* ------------------------------------------------------------------ */
/* Mi perfil                                                           */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-perfil-page",
  imports: [IconComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface py-10 lg:py-14">
      <div class="page-container">
        <h1 class="text-center text-2xl font-extrabold text-ink lg:text-3xl">Mi perfil</h1>

        <div class="mx-auto mt-6 flex w-fit max-w-full gap-1 rounded-full bg-card p-1 shadow-[var(--shadow-card)] sm:gap-2" role="tablist">
          @for (t of tabs; track t.value) {
            <button type="button" role="tab" [attr.aria-selected]="tab() === t.value" (click)="tab.set(t.value)"
              [class]="'min-h-12 rounded-full px-4 text-center text-base font-semibold leading-tight transition-colors sm:px-6 lg:min-h-14 ' + (tab() === t.value ? 'bg-secondary text-primary' : 'text-ink hover:text-primary')">
              {{ t.label }}
            </button>
          }
        </div>

        <div class="mx-auto mt-8 max-w-3xl">
          @if (tab() === "datos") {
            @if (perfil()) {
              <section class="rounded-3xl bg-card p-6 shadow-[var(--shadow-card)]" aria-labelledby="dat-titulo">
                <h2 id="dat-titulo" class="text-lg font-extrabold text-ink">Mis datos</h2>
                <p class="mt-2 text-base text-muted-foreground">Estos datos vienen del padrón de {{ brand.marca().nombre }} y no se pueden editar aquí. Si alguno no es correcto, comunícate con {{ brand.marca().nombre }}.</p>
                <dl class="mt-5 grid gap-x-6 gap-y-4 rounded-2xl bg-surface p-5 text-base sm:grid-cols-2">
                  @for (f of filasDatos(); track f.etiqueta) {
                    <div class="min-w-0">
                      <dt class="text-sm text-muted-foreground">{{ f.etiqueta }}</dt>
                      <dd class="break-words font-semibold text-ink">{{ f.valor }}</dd>
                    </div>
                  }
                </dl>
              </section>
            }
          } @else if (tab() === "intereses") {
            <section class="rounded-3xl bg-card p-6 shadow-[var(--shadow-card)]" aria-labelledby="int-titulo">
              <h2 id="int-titulo" class="text-lg font-extrabold text-ink">Mis intereses</h2>
              <p class="mt-2 text-base text-muted-foreground">Elige las categorías de las que quieres recibir promociones destacadas. Solo te avisaremos de las que marques.</p>

              @if (errorIntereses() && !interesesListos()) {
                <p role="alert" class="mt-5 rounded-2xl bg-aviso-fondo px-5 py-4 text-base font-semibold text-aviso">{{ errorIntereses() }}</p>
              } @else {
                <fieldset class="mt-6">
                  <legend class="flex items-center gap-2 text-base font-extrabold text-ink"><app-icon name="Gift" class="h-5 w-5 text-primary" /> Beneficios</legend>
                  <div class="mt-3 flex flex-wrap gap-2">
                    @for (c of catalog.categoriasBeneficio(); track c.slug) {
                      <button type="button" [attr.aria-pressed]="selBeneficios().includes(c.slug)" (click)="alternarInteres(c.slug)" [class]="chipInteres(selBeneficios().includes(c.slug))">
                        @if (selBeneficios().includes(c.slug)) { <app-icon name="Check" class="h-4 w-4" /> }
                        {{ c.label }}
                      </button>
                    }
                  </div>
                </fieldset>

                <p class="mt-4 text-sm text-muted-foreground" aria-live="polite">{{ totalIntereses() === 0 ? "Aún no elegiste ninguna categoría." : totalIntereses() + (totalIntereses() === 1 ? " categoría seleccionada" : " categorías seleccionadas") }}</p>

                <h3 class="mt-8 text-base font-extrabold text-ink">¿Por dónde te avisamos?</h3>
                <ul class="mt-2 divide-y divide-border border-y border-border">
                  <li class="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p id="can-push" class="text-base font-semibold text-ink">Notificaciones push</p>
                      <p class="text-sm text-muted-foreground">Avisos en tu navegador o dispositivo.</p>
                    </div>
                    <button type="button" role="switch" data-compact [attr.aria-checked]="pushInteres()" aria-labelledby="can-push" (click)="cambiarCanal('push', !pushInteres())"
                      [class]="'relative h-7 w-12 shrink-0 rounded-full transition-colors ' + (pushInteres() ? 'bg-primary' : 'bg-border')">
                      <span [class]="'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ' + (pushInteres() ? 'left-6' : 'left-1')"></span>
                    </button>
                  </li>
                  <li class="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p id="can-correo" class="text-base font-semibold text-ink">Correo electrónico</p>
                      <p class="text-sm text-muted-foreground">Promociones y novedades en tu bandeja. Los avisos de tu cuenta los recibes siempre.</p>
                    </div>
                    <button type="button" role="switch" data-compact [attr.aria-checked]="correoInteres()" aria-labelledby="can-correo" (click)="cambiarCanal('correo', !correoInteres())"
                      [class]="'relative h-7 w-12 shrink-0 rounded-full transition-colors ' + (correoInteres() ? 'bg-primary' : 'bg-border')">
                      <span [class]="'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ' + (correoInteres() ? 'left-6' : 'left-1')"></span>
                    </button>
                  </li>
                </ul>

                <div class="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <p class="text-sm text-muted-foreground" [attr.role]="errorIntereses() || interesesGuardados() ? 'status' : null">
                    {{ errorIntereses() || (interesesGuardados() ? "Preferencias guardadas." : "Puedes cambiarlo cuando quieras.") }}
                  </p>
                  <button type="button" (click)="guardarIntereses()" class="min-h-12 rounded-full bg-primary px-8 text-base font-bold uppercase tracking-wide text-primary-foreground lg:min-h-14">Guardar preferencias</button>
                </div>
              }
            </section>
          } @else {
            <section class="rounded-3xl bg-card p-6 shadow-[var(--shadow-card)]" aria-labelledby="seg-titulo">
              <h2 id="seg-titulo" class="text-lg font-extrabold text-ink">Dispositivos con sesión iniciada</h2>
              <p class="mt-2 text-base text-muted-foreground">Tu sesión dura como máximo 5 días en cada dispositivo; pasado ese plazo debes volver a ingresar con tu documento y un código. Si no reconoces alguno, cierra todas las sesiones.</p>

              @if (errorSesiones()) {
                <p role="alert" class="mt-5 rounded-2xl bg-aviso-fondo px-5 py-4 text-base font-semibold text-aviso">No pudimos cargar tus dispositivos. Inténtalo de nuevo más tarde.</p>
              } @else if (sesiones(); as lista) {
                <ul class="mt-5 grid gap-3">
                  @for (s of lista; track $index) {
                    <li class="flex items-center gap-4 rounded-2xl border border-border p-4">
                      <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><app-icon [name]="iconoDispositivo(s.dispositivo)" class="h-5 w-5" /></span>
                      <div class="min-w-0 flex-1">
                        <p class="text-base font-bold text-ink">{{ s.dispositivo }}
                          @if (s.actual) { <span class="ml-2 inline-flex items-center rounded-full bg-primary px-3 py-0.5 align-middle text-xs font-bold uppercase tracking-wide text-primary-foreground">Este dispositivo</span> }
                        </p>
                        <p class="text-sm text-muted-foreground">Último uso {{ tiempo(s.ultimoUso) }}</p>
                      </div>
                    </li>
                  } @empty {
                    <li class="rounded-2xl bg-surface p-6 text-center text-base text-muted-foreground">No hay sesiones activas.</li>
                  }
                </ul>
              }

              <button type="button" (click)="cerrarTodas.set(true)"
                class="mt-6 min-h-12 rounded-full border border-destructive px-6 text-base font-bold text-destructive transition-colors hover:bg-destructive/10 lg:min-h-14">
                Cerrar sesión en todos los dispositivos
              </button>

              <app-modal [open]="cerrarTodas()" title="Cerrar todas las sesiones" (closed)="cerrarTodas.set(false)">
                <p class="text-base text-ink">Se cerrará tu sesión en todos tus dispositivos, incluido este. Para volver a entrar tendrás que validar tu documento y un código.</p>
                <div class="mt-6 grid gap-3 sm:grid-cols-2">
                  <button type="button" (click)="cerrarTodas.set(false)"
                    class="min-h-12 rounded-full border border-border bg-card text-base font-bold uppercase tracking-wide text-ink transition-colors hover:border-primary hover:text-primary lg:min-h-14">Cancelar</button>
                  <button type="button" (click)="cerrarEnTodos()"
                    class="min-h-12 rounded-full bg-destructive text-base font-bold uppercase tracking-wide text-destructive-foreground transition-transform hover:scale-[1.02] lg:min-h-14">Sí, cerrar todas</button>
                </div>
              </app-modal>
            </section>
          }
        </div>
      </div>
    </div>
  `,
})
export class PerfilPage {
  protected readonly store = inject(StoreService);
  private readonly api = inject(ApiService);
  protected readonly tabs = [
    { value: "datos", label: "Datos" },
    { value: "intereses", label: "Intereses" },
    { value: "seguridad", label: "Seguridad" },
  ] as const;

  protected readonly tab = signal<"datos" | "intereses" | "seguridad">("datos");

  /* ---- Intereses: categorías de las que quiere recibir promociones (push y correo) ---- */
  protected readonly selBeneficios = signal<string[]>([]);
  protected readonly pushInteres = signal(false);
  /** Lo que se eligió para el correo sin guardar; null = lo que ya está guardado (consentimiento de novedades). */
  private readonly correoElegido = signal<boolean | null>(null);
  protected readonly correoInteres = computed(() => this.correoElegido() ?? this.recibeNovedades() ?? false);
  protected readonly interesesListos = signal(false);
  protected readonly errorIntereses = signal("");
  protected readonly interesesGuardados = signal(false);
  protected readonly totalIntereses = computed(() => this.selBeneficios().length);
  private readonly cargaIntereses = effect(() => {
    if (this.tab() !== "intereses" || this.interesesListos()) return;
    this.errorIntereses.set("");
    this.api.get<Intereses>("me/intereses").subscribe({
      next: (r) => {
        this.selBeneficios.set(r.beneficios);
        this.pushInteres.set(r.push);
        this.interesesListos.set(true);
      },
      error: () => this.errorIntereses.set("No pudimos cargar tus intereses. Inténtalo de nuevo más tarde."),
    });
  });
  protected alternarInteres(slug: string) {
    this.interesesGuardados.set(false);
    this.selBeneficios.update((l) => alternar(l, slug));
  }
  protected cambiarCanal(canal: "push" | "correo", valor: boolean) {
    this.interesesGuardados.set(false);
    if (canal === "push") this.pushInteres.set(valor);
    else this.correoElegido.set(valor);
  }
  protected guardarIntereses() {
    if (!this.interesesListos()) return;
    this.errorIntereses.set("");
    this.interesesGuardados.set(false);
    this.api.put<Intereses>("me/intereses", { beneficios: this.selBeneficios(), push: this.pushInteres() }).subscribe({
      next: (r) => {
        this.selBeneficios.set(r.beneficios);
        this.pushInteres.set(r.push);
        const correo = this.correoElegido();
        if (correo !== null && correo !== this.recibeNovedades()) this.cambiarNovedades(correo);
        this.correoElegido.set(null);
        this.interesesGuardados.set(true);
      },
      error: () => this.errorIntereses.set("No pudimos guardar tus preferencias. Inténtalo de nuevo."),
    });
  }
  protected chipInteres(activo: boolean) {
    return "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-base font-semibold transition-colors " + (activo ? "border-primary bg-secondary text-primary" : "border-border text-ink hover:border-primary hover:text-primary");
  }

  /* ---- Seguridad: dispositivos con sesión iniciada ---- */
  private readonly sesionApp = inject(SesionService);
  protected readonly tiempo = haceTiempo;
  protected readonly sesiones = signal<{ dispositivo: string; creada: string; ultimoUso: string; actual: boolean }[] | null>(null);
  protected readonly errorSesiones = signal(false);
  protected readonly cerrarTodas = signal(false);
  private readonly cargaSesiones = effect(() => {
    if (this.tab() !== "seguridad") return;
    this.errorSesiones.set(false);
    this.api.get<{ sesiones: { dispositivo: string; creada: string; ultimoUso: string; actual: boolean }[] }>("me/sesiones").subscribe({
      next: (r) => this.sesiones.set(r.sesiones),
      error: () => this.errorSesiones.set(true),
    });
  });
  protected iconoDispositivo(d: string) {
    return /iPhone|iPad|Android/.test(d) ? "Smartphone" : "Monitor";
  }
  protected cerrarEnTodos() {
    this.sesionApp.salirDeTodos();
  }
  protected readonly perfil = this.store.perfil;
  protected readonly catalog = inject(CatalogService);
  /** Campos extra que el admin configura en Admin → Formulario de datos (los datos vienen del padrón y aquí solo se muestran). */
  protected readonly camposExtra = computed(() => this.catalog.config()?.formulario ?? []);

  /** Consentimiento de novedades por correo; null mientras carga. Se guarda junto con los intereses. */
  protected readonly recibeNovedades = signal<boolean | null>(null);
  private readonly cargaNovedades = this.api.get<{ recibe: boolean }>("me/novedades").subscribe({ next: (r) => this.recibeNovedades.set(r.recibe), error: () => undefined });
  protected cambiarNovedades(recibe: boolean) {
    const antes = this.recibeNovedades();
    this.recibeNovedades.set(recibe);
    this.api.put<{ recibe: boolean }>("me/novedades", { recibe }).subscribe({
      next: (r) => this.recibeNovedades.set(r.recibe),
      error: () => this.recibeNovedades.set(antes),
    });
  }

  private valor(id: string) {
    const v = this.perfil()?.extra?.[id];
    if (v !== undefined) return v;
    // Apellido paterno y materno se completan con los apellidos que ya tiene la cuenta.
    const m = this.camposExtra().find((c) => c.id === id)?.mapeo;
    if (m === "celular") return this.perfil()?.telefono ?? "";
    if (m === "apellido_paterno" || m === "apellido_materno") {
      const [paterno = "", ...resto] = (this.perfil()?.apellidos ?? "").trim().split(/\s+/);
      return m === "apellido_paterno" ? paterno : resto.join(" ");
    }
    return undefined;
  }
  /** Con apellido paterno y materno configurados, el campo "Apellidos" sobra: se arma con ellos. */
  private readonly apellidosSeparados = computed(() => this.camposExtra().some((c) => c.mapeo === "apellido_paterno"));
  /** Si el formulario trae "N.º de celular", ese es el teléfono de la cuenta y no se repite. */
  private readonly campoCelular = computed(() => this.camposExtra().find((c) => c.mapeo === "celular"));

  /** Datos del padrón, solo lectura. */
  protected readonly filasDatos = computed(() => {
    const p = this.perfil();
    if (!p) return [];
    const filas: { etiqueta: string; valor: string }[] = [
      { etiqueta: "Tipo de documento", valor: p.tipoDocumento },
      { etiqueta: "Código de participante", valor: p.codigoParticipante },
      { etiqueta: "Correo de acceso", valor: p.correo },
      { etiqueta: "Nombres", valor: p.nombres },
    ];
    if (!this.apellidosSeparados()) filas.push({ etiqueta: "Apellidos", valor: p.apellidos });
    if (!this.campoCelular()) filas.push({ etiqueta: "Teléfono", valor: p.telefono });
    for (const c of this.camposExtra()) {
      if (c.mapeo === "fecha_nacimiento") continue;
      const v = this.valor(c.id);
      filas.push({ etiqueta: c.etiqueta, valor: typeof v === "boolean" ? (v ? "Sí" : "No") : String(v ?? "") });
    }
    return filas.map((x) => ({ etiqueta: x.etiqueta, valor: x.valor?.trim() ? x.valor : "—" }));
  });

  protected readonly brand = inject(BrandService);
}

/* ------------------------------------------------------------------ */
/* Contáctanos                                                         */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-contacto-page",
  imports: [IconComponent, ModalComponent, FlagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface py-10 lg:py-14">
      <div class="page-container">
        <div class="grid gap-6 overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-card)] lg:grid-cols-2 lg:gap-0">
          <div class="p-6 sm:p-9">
            <h1 class="text-center text-xl font-extrabold text-ink sm:text-2xl">¿Alguna pregunta o sugerencia?<br />Ponte en contacto con nosotros</h1>

            @if (sesion.logged()) {
              <dl class="mt-7 rounded-2xl bg-surface p-5 text-base">
                <div class="flex flex-wrap justify-between gap-2"><dt class="font-semibold text-ink">Nombre completo</dt><dd class="text-muted-foreground">{{ nombreCompleto() }}</dd></div>
                <div class="mt-3 flex flex-wrap justify-between gap-2"><dt class="font-semibold text-ink">Correo electrónico</dt><dd class="text-muted-foreground">{{ perfil()?.correo }}</dd></div>
              </dl>
            } @else {
              <div class="mt-7 space-y-5">
                <div>
                  <label for="nombre" class="block text-base font-semibold text-ink">Nombre completo</label>
                  <input id="nombre" type="text" autocomplete="name" maxlength="80" [value]="nombre()" (input)="nombre.set($any($event.target).value)" placeholder="Ej. María Pérez"
                    class="mt-2 h-14 w-full rounded-2xl border border-border bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label for="correo" class="block text-base font-semibold text-ink">Correo electrónico</label>
                  <input id="correo" type="email" autocomplete="email" maxlength="80" [value]="correo()" (input)="correo.set($any($event.target).value)" placeholder="tucorreo@ejemplo.com"
                    class="mt-2 h-14 w-full rounded-2xl border border-border bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
            }

            <form class="mt-6" (submit)="$event.preventDefault(); enviar()">
              <label for="telefono" class="block text-base font-semibold text-ink">Teléfono</label>
              <div class="mt-2 flex h-14 items-center gap-3 rounded-2xl border border-border bg-surface px-4">
                <span class="flex items-center gap-2 text-base text-ink"><app-flag [codigo]="brand.pais().codigo" [nombre]="brand.pais().nombre" [ancho]="24" />{{ brand.pais().telefonoPrefijo }}</span>
                <input id="telefono" inputmode="tel" [attr.maxlength]="brand.pais().telefonoDigitos" [value]="telefono()" (input)="onTelefono($event)" placeholder="99 654 3210"
                  class="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none" />
              </div>

              <label for="motivo" class="mt-5 block text-base font-semibold text-ink">¿Sobre qué quieres más información?</label>
              <select id="motivo" (change)="motivo.set($any($event.target).value)"
                class="select-field mt-2 h-14 w-full rounded-2xl border border-border bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-primary/50">
                @for (m of motivos; track m) { <option [value]="m" [selected]="m === motivo()">{{ m }}</option> }
              </select>

              <label for="consulta" class="mt-5 block text-base font-semibold text-ink">Consulta</label>
              <textarea id="consulta" rows="4" maxlength="1000" [value]="consulta()" (input)="consulta.set($any($event.target).value)" placeholder="Escribe aquí"
                class="mt-2 w-full rounded-2xl border border-border bg-surface p-4 text-base text-ink focus:ring-2 focus:ring-primary/50"></textarea>

              <button type="submit" [disabled]="!datosValidos() || telefono().length < brand.pais().telefonoDigitos || consulta().trim().length < 5"
                class="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 lg:min-h-14">
                <app-icon name="Send" class="h-5 w-5" /> Enviar
              </button>
            </form>

            <section class="mt-7 overflow-hidden rounded-2xl bg-surface p-5">
              <h2 class="text-lg font-extrabold text-ink">Contáctanos</h2>
              @if (contacto(); as c) {
                <ul class="mt-4 space-y-3 text-base text-ink">
                  @if (c.horario) { <li class="flex items-start gap-3"><app-icon name="Clock" class="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span class="min-w-0 break-words">{{ c.horario }}</span></li> }
                  <li class="flex items-start gap-3"><app-icon name="Phone" class="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span class="min-w-0 break-words">{{ c.telefonos }}</span></li>
                  <li class="flex items-start gap-3"><app-icon name="Mail" class="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span class="min-w-0 break-all">{{ c.correo }}</span></li>
                </ul>
              }
            </section>
          </div>

          <div class="relative min-h-[20rem] lg:min-h-full">
            <img [src]="brand.imagenes().contacto" alt="Asesora BanBif atendiendo consultas desde su laptop" width="1024" height="1280" loading="lazy"
              class="h-full w-full object-cover lg:absolute lg:inset-0" />
          </div>
        </div>
      </div>
    </div>

    <app-modal [open]="enviado()" title="Consulta enviada" (closed)="enviado.set(false)">
      <p class="text-base text-ink">¡Gracias {{ quien().nombre }}! Recibimos tu consulta y te responderemos a {{ quien().correo }} dentro de las próximas 48 horas hábiles.</p>
      <button type="button" (click)="reiniciar()" class="mt-6 min-h-12 w-full rounded-full bg-primary text-base font-bold uppercase tracking-wide text-primary-foreground lg:min-h-14">Entendido</button>
    </app-modal>
  `,
})
export class ContactoPage {
  protected readonly brand = inject(BrandService);
  private readonly store = inject(StoreService);
  private readonly api = inject(ApiService);
  private readonly catalog = inject(CatalogService);
  protected readonly perfil = this.store.perfil;
  /** Datos de la tarjeta Contáctanos (Admin → Configuración → Página Contáctanos); lo que falte usa los de soporte del pie. */
  protected readonly contacto = computed(() => {
    const cfg = this.catalog.config();
    if (!cfg) return undefined;
    return {
      horario: cfg.contacto?.horario?.trim() ?? "",
      telefonos: cfg.contacto?.telefonos?.trim() || cfg.sitio.telefonoPie,
      correo: cfg.contacto?.correo?.trim() || cfg.sitio.correoSoporte,
    };
  });
  protected readonly nombreCompleto = computed(() => (this.perfil() ? `${this.perfil()!.nombres} ${this.perfil()!.apellidos}` : ""));

  protected readonly sesion = inject(SesionService);
  protected readonly telefono = signal("");
  protected readonly consulta = signal("");
  protected readonly enviado = signal(false);
  /** Sin sesión se pide el nombre y el correo para poder responder. */
  protected readonly nombre = signal("");
  protected readonly correo = signal("");
  protected readonly motivos = ["Conocer Club Hola y sus beneficios", "Cómo acceder a mi nivel o beneficios", "Comercios y promociones", "Problemas para ingresar", "Otro"];
  protected readonly motivo = signal(this.motivos[0]!);
  protected readonly datosValidos = computed(() => this.sesion.logged() || (this.nombre().trim().length >= 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo().trim())));
  /** A quién se le responde (con sesión, su perfil; sin sesión, lo que escribió). */
  protected readonly quien = computed(() => (this.sesion.logged() ? { nombre: this.perfil()?.nombres ?? "", correo: this.perfil()?.correo ?? "" } : { nombre: this.nombre().trim(), correo: this.correo().trim() }));

  protected onTelefono(e: Event) {
    this.telefono.set((e.target as HTMLInputElement).value.replace(/\D/g, ""));
  }
  protected enviar() {
    const q = this.quien();
    this.api.post("contacto", { telefono: this.telefono(), consulta: this.consulta(), motivo: this.motivo(), ...(this.sesion.logged() ? {} : { nombre: q.nombre, correo: q.correo }) }).subscribe(() => this.enviado.set(true));
  }
  protected reiniciar() {
    this.enviado.set(false);
    this.consulta.set("");
    this.telefono.set("");
    this.nombre.set("");
    this.correo.set("");
  }
}

/* ------------------------------------------------------------------ */
/* Login (código OTP de 6 dígitos)                                     */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-login-page",
  imports: [IconComponent, LogoComponent, ModalComponent, MarkdownComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid min-h-screen bg-surface font-sans lg:grid-cols-2">
      <!-- Banner lateral -->
      <aside class="relative hidden overflow-hidden bg-brand-dark lg:sticky lg:top-0 lg:block lg:h-dvh">
        <img [src]="brand.imagenes().login" [alt]="'Clientes de ' + brand.marca().nombre + ' disfrutando sus beneficios'" width="900" height="1200" class="absolute inset-0 h-full w-full object-cover" />
        <div class="absolute inset-0 bg-header-gradient opacity-80"></div>
        <div class="absolute inset-x-0 bottom-0 max-h-full overflow-y-auto p-6 text-white xl:p-10">
          <p class="text-xs font-semibold uppercase tracking-widest text-white xl:text-sm">{{ brand.programa() }}</p>
          <h2 class="mt-2 max-w-md text-2xl font-extrabold leading-tight xl:mt-3 xl:text-3xl">{{ txt().tituloLateral }}</h2>
          <p class="mt-3 max-w-md text-sm text-white/85 xl:mt-4 xl:text-base">{{ txt().mensajeLateral }}</p>
        </div>
      </aside>

      <!-- Formulario -->
      <main class="relative flex items-center justify-center px-4 py-10 sm:px-8">
        <a routerLink="/" aria-label="Cerrar y volver al inicio"
          class="fixed right-4 top-4 z-50 grid h-11 w-11 place-items-center rounded-full bg-card text-ink shadow-sm ring-1 ring-border transition-colors hover:bg-muted">
          <app-icon name="X" class="h-5 w-5" />
        </a>
        <div class="w-full max-w-md">
          <div class="flex justify-center px-6 py-2 lg:hidden"><app-logo variant="light" class="h-9" /></div>
          <div class="hidden justify-center lg:flex"><app-logo variant="light" class="h-10" /></div>

          <div class="mt-8 rounded-3xl bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
            @if (paso() > 1) {
              <button type="button" (click)="atras()" class="mb-4 flex min-h-11 items-center gap-2 text-base font-semibold text-primary">
                <app-icon name="ArrowLeft" class="h-5 w-5" /> Volver
              </button>
            }

            @if (paso() === 1) {
              <form (submit)="continuar($event)" novalidate>
                <h1 class="text-2xl font-extrabold text-ink">{{ txt().tituloFormulario }}</h1>
                <p class="mt-2 text-base text-muted-foreground">{{ txt().subtituloFormulario }}</p>

                <label for="tipo-doc" class="mt-6 block text-base font-semibold text-ink">Tipo de documento</label>
                <select id="tipo-doc" [value]="tipoVal()" (change)="cambiarTipo($any($event.target).value)"
                  class="select-field mt-2 h-14 w-full rounded-2xl border border-border bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-primary/60">
                  @for (t of tipos(); track t.value) { <option [value]="t.value" [selected]="t.value === tipoVal()">{{ t.label }}</option> }
                </select>

                <label for="num-doc" class="mt-5 block text-base font-semibold text-ink">Número de documento</label>
                <input id="num-doc" [value]="documento()" (input)="onDocumento($event)" autocomplete="off"
                  (blur)="alSalirDelDocumento()" [attr.inputmode]="tipoActual()?.numerico ? 'numeric' : 'text'" [placeholder]="txt().placeholderDocumento"
                  [attr.aria-invalid]="error() ? true : null"
                  [class]="'mt-2 h-14 w-full rounded-2xl border bg-surface px-4 text-base text-ink outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/60 ' + (error() ? 'border-destructive' : 'border-border')" />

                @if (consultando()) { <p role="status" class="mt-2 text-sm text-muted-foreground">Verificando…</p> }
                @if (requiere()) {
                  <div role="group" aria-labelledby="aceptacion-titulo" class="animate-fade-up mt-4 rounded-2xl border border-border bg-surface p-4">
                    <p id="aceptacion-titulo" class="text-base font-bold text-ink">Antes de continuar</p>
                    <p class="mt-1 text-base text-muted-foreground">Es la primera vez que ingresas con este documento. Para continuar, confirma lo siguiente:</p>
                    <label class="mt-3 flex cursor-pointer items-start gap-3 text-base leading-6 text-ink">
                      <input type="checkbox" [checked]="aceptaTerminos()" (change)="aceptaTerminos.set($any($event.target).checked); error.set('')" class="mt-1 h-5 w-5 shrink-0 accent-[var(--color-primary)]" />
                      <span>He leído y acepto los <a href="#" (click)="$event.preventDefault(); abrirLegal('terminos')" class="font-semibold text-primary underline underline-offset-2">Términos de uso</a>.</span>
                    </label>
                    <label class="mt-2 flex cursor-pointer items-start gap-3 text-base leading-6 text-ink">
                      <input type="checkbox" [checked]="aceptaPrivacidad()" (change)="aceptaPrivacidad.set($any($event.target).checked); error.set('')" class="mt-1 h-5 w-5 shrink-0 accent-[var(--color-primary)]" />
                      <span>Autorizo el tratamiento de mis datos personales de acuerdo con la <a href="#" (click)="$event.preventDefault(); abrirLegal('privacidad')" class="font-semibold text-primary underline underline-offset-2">Política de privacidad</a>.</span>
                    </label>
                  </div>
                }

                @if (error()) { <p role="alert" class="mt-3 text-base text-destructive">{{ error() }}</p> }

                <button type="submit" [disabled]="enviando() || consultando() || (requiere() && !aceptaTodo())" class="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-70">
                  @if (enviando()) { <app-icon name="Loader2" class="h-5 w-5 animate-spin" /> Enviando… } @else { Continuar }
                </button>
                @if (txt().notaLegal && !requiere()) { <app-markdown [enLinea]="true" clase="md-corto" [texto]="txt().notaLegal" (ancla)="abrirLegal($event)" /> }
              </form>
            } @else if (paso() === 2) {
              <div>
                <h1 class="text-2xl font-extrabold text-ink">{{ txt().tituloCanal }}</h1>
                <p class="mt-2 text-base text-muted-foreground">{{ txt().subtituloCanal }}</p>

                <div class="mt-6 space-y-3">
                  <button type="button" (click)="elegirCanal('correo')" [disabled]="enviando()"
                    class="flex min-h-16 w-full items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-primary hover:bg-muted disabled:opacity-70">
                    <span class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-celeste/15 text-celeste"><app-icon name="Mail" class="h-6 w-6" /></span>
                    <span class="min-w-0">
                      <span class="block text-base font-semibold text-ink">Correo electrónico</span>
                      <span class="block truncate text-base text-muted-foreground">{{ canales()?.correo }}</span>
                    </span>
                  </button>
                  @if (canales()?.telefono; as tel) {
                    <button type="button" (click)="elegirCanal('sms')" [disabled]="enviando()"
                      class="flex min-h-16 w-full items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-primary hover:bg-muted disabled:opacity-70">
                      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><app-icon name="MessageSquare" class="h-6 w-6" /></span>
                      <span class="min-w-0">
                        <span class="block text-base font-semibold text-ink">Mensaje de texto (SMS)</span>
                        <span class="block truncate text-base text-muted-foreground">{{ tel }}</span>
                      </span>
                    </button>
                  }
                </div>
                @if (error()) { <p role="alert" class="mt-4 text-base text-destructive">{{ error() }}</p> }
              </div>
            } @else {
              <form (submit)="validar($event)">
                <h1 class="text-2xl font-extrabold text-ink">{{ txt().tituloCodigo }}</h1>
                <div class="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                  <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-celeste/15 text-celeste"><app-icon [name]="canal() === 'sms' ? 'MessageSquare' : 'Mail'" class="h-5 w-5" /></span>
                  <p class="min-w-0 text-base text-muted-foreground">Enviamos un código de 6 dígitos a tu {{ canal() === 'sms' ? 'celular' : 'correo' }} <strong class="text-ink">{{ destino() }}</strong>.</p>
                </div>

                <div class="mt-6 flex justify-between gap-2">
                  @for (d of codigo(); track $index; let i = $index) {
                    <input #digito [value]="d" (input)="onDigito(i, $event)" (keydown)="onKey(i, $event)" (paste)="alPegar($event)" inputmode="numeric" [attr.aria-label]="'Dígito ' + (i + 1)"
                      [class]="'h-14 w-full min-w-0 rounded-2xl border border-border bg-surface text-center text-xl font-bold text-ink outline-none focus:ring-2 focus:ring-primary/60 ' + (d ? 'border-primary' : '')" />
                  }
                </div>

                @if (demo() && usarMock) {
                  <p class="mt-3 text-sm text-muted-foreground">Código de prueba (solo demo):
                    <button type="button" (click)="usarDemo()" class="font-mono font-bold text-primary underline">{{ demo() }}</button>
                  </p>
                }
                @if (aviso()) { <p role="status" class="mt-3 text-base text-ink">{{ aviso() }}</p> }
                @if (error()) { <p role="alert" class="mt-3 text-base text-destructive">{{ error() }}</p> }

                <button type="submit" [disabled]="cargando()"
                  class="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-70">
                  @if (cargando()) { <app-icon name="Loader2" class="h-5 w-5 animate-spin" /> Validando… } @else { <app-icon name="Check" class="h-5 w-5" /> Validar e ingresar }
                </button>
                <button type="button" (click)="reenviar()" [disabled]="espera() > 0 || enviando()" class="mt-3 flex min-h-11 w-full items-center justify-center text-base font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60">
                  {{ enviando() ? 'Enviando…' : espera() > 0 ? 'Reenviar código en ' + espera() + ' s' : 'Reenviar código' }}
                </button>
              </form>
            }
          </div>
        </div>
      </main>

      <app-modal [open]="!!legal()" [title]="legal() === 'privacidad' ? 'Política de privacidad' : 'Términos de uso'" maxWidth="max-w-3xl" (closed)="legal.set(null)">
        <app-markdown [texto]="textoLegal()" />
      </app-modal>
    </div>
  `,
})
export class LoginPage {
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly store = inject(StoreService);
  private readonly sesion = inject(SesionService);
  private readonly ruta = inject(ActivatedRoute);
  protected readonly brand = inject(BrandService);
  protected readonly tipos = computed(() => this.brand.pais().documentos);
  private readonly catalogo = inject(CatalogService);
  /** Textos editables en Admin → Configuración → Pantalla de ingreso, con los de la marca ya reemplazados. */
  protected readonly txt = computed(() => {
    const guardados = this.catalogo.config()?.sitio?.ingreso ?? {};
    const r = (s: string) => s.replaceAll("{unidad}", this.brand.unidad()).replaceAll("{banco}", this.brand.marca().nombre).replaceAll("{programa}", this.brand.programa());
    const out = { ...TEXTOS_INGRESO };
    for (const k of Object.keys(out) as (keyof TextosIngreso)[]) {
      const v = guardados[k];
      out[k] = r(!v ? TEXTOS_INGRESO[k] : v);
    }
    if (this.catalogo.config()?.sitio?.ocultarNotaIngreso) out.notaLegal = "";
    return out;
  });

  /** Texto legal abierto en el modal (desde los enlaces de la nota bajo el botón). */
  protected readonly legal = signal<"terminos" | "privacidad" | null>(null);
  protected readonly textoLegal = computed(() => {
    const c = this.catalogo.config()?.contenido;
    return legalAMarkdown(this.legal() === "privacidad" ? c?.privacidad : c?.terminos);
  });
  protected abrirLegal(ancla: string) {
    if (ancla === "terminos" || ancla === "privacidad") this.legal.set(ancla);
  }

  /** 1 documento · 2 canal del código (solo si hay celular) · 3 código. */
  protected readonly paso = signal<1 | 2 | 3>(1);
  protected readonly tipo = signal<string | null>(null);
  protected readonly tipoVal = computed(() => this.tipo() ?? this.tipos()[0]?.value ?? "");
  protected readonly tipoActual = computed(() => this.tipos().find((t) => t.value === this.tipoVal()));
  protected readonly documento = signal("");
  protected readonly codigo = signal(["", "", "", "", "", ""]);
  protected readonly error = signal("");
  protected readonly aviso = signal("");
  /** Validando el código. */
  protected readonly cargando = signal(false);
  /** Consultando los canales o enviando el código. */
  protected readonly enviando = signal(false);
  protected readonly canales = signal<{ correo: string; telefono: string | null } | null>(null);
  protected readonly canal = signal<"correo" | "sms">("correo");
  /** Correo o celular ofuscado al que se envió el código. */
  protected readonly destino = signal("");
  /** Código de prueba que devuelve la MockAPI (un backend real no lo envía). */
  protected readonly demo = signal("");
  /** Primer ingreso de este documento: hay que aceptar los textos legales antes de recibir el código. */
  protected readonly requiere = signal(false);
  protected readonly aceptaTerminos = signal(false);
  protected readonly aceptaPrivacidad = signal(false);
  protected readonly aceptaTodo = computed(() => this.aceptaTerminos() && this.aceptaPrivacidad());
  protected readonly consultando = signal(false);
  /** Documento ya consultado («tipo:número»). */
  private consultado = "";
  private esperaConsulta: ReturnType<typeof setTimeout> | undefined;
  protected readonly usarMock = environment.usarMock;
  /** Segundos que faltan para poder pedir otro código. */
  protected readonly espera = signal(0);
  private temporizador: ReturnType<typeof setInterval> | undefined;
  private readonly digitos = viewChildren<ElementRef<HTMLInputElement>>("digito");

  constructor() {
    effect(() => {
      if (this.paso() === 3) queueMicrotask(() => this.digitos()[0]?.nativeElement.focus());
    });
    inject(DestroyRef).onDestroy(() => {
      clearInterval(this.temporizador);
      clearTimeout(this.esperaConsulta);
    });
  }

  protected cambiarTipo(valor: string) {
    this.tipo.set(valor);
    this.documento.set("");
    this.error.set("");
    this.reiniciarAceptacion();
  }
  private reiniciarAceptacion() {
    clearTimeout(this.esperaConsulta);
    this.requiere.set(false);
    this.aceptaTerminos.set(false);
    this.aceptaPrivacidad.set(false);
    this.consultando.set(false);
    this.consultado = "";
  }
  private claveDocumento() {
    return `${this.tipoVal()}:${this.documento()}`;
  }
  /**
   * Consulta si este documento debe aceptar los textos legales. Si la consulta falla (o llega el límite de consultas) se pide la
   * aceptación igual: ante la duda nunca se omite.
   */
  private consultarAceptacion(luego?: () => void) {
    if (validarNumeroDocumento(this.tipoActual(), this.documento())) return;
    const clave = this.claveDocumento();
    if (this.consultado === clave) {
      luego?.();
      return;
    }
    this.consultando.set(true);
    const terminar = (requiere: boolean) => {
      if (clave !== this.claveDocumento()) return; // el documento cambió mientras tanto
      this.consultando.set(false);
      this.consultado = clave;
      this.requiere.set(requiere);
      luego?.();
    };
    this.api.post<{ requiere: boolean }>("auth/aceptacion", { tipo: this.tipoVal(), documento: this.documento() }).subscribe({
      next: (r) => terminar(r.requiere),
      error: () => terminar(true),
    });
  }
  /** En DNI y RUC la consulta sale sola al completar el largo; en los demás tipos, al salir del campo. */
  protected alSalirDelDocumento() {
    if (!this.tipoActual()?.numerico) this.consultarAceptacion();
  }
  /** Solo se escribe lo que cabe en el tipo elegido: dígitos en DNI y RUC, letras y números en los demás, sin pasar de su largo. */
  protected onDocumento(e: Event) {
    const input = e.target as HTMLInputElement;
    const limpio = limpiarNumeroDocumento(this.tipoActual(), input.value);
    input.value = limpio;
    this.documento.set(limpio);
    this.error.set("");
    this.reiniciarAceptacion();
    const tipo = this.tipoActual();
    // Largo exacto (DNI, RUC): al completarlo se consulta solo, tras una pausa corta.
    if (tipo?.numerico && limpio.length === tipo.digitos) this.esperaConsulta = setTimeout(() => this.consultarAceptacion(), 300);
  }

  protected continuar(e: Event) {
    e.preventDefault();
    const mensaje = validarNumeroDocumento(this.tipoActual(), this.documento());
    if (mensaje) {
      this.error.set(mensaje);
      return;
    }
    // Sin haber consultado todavía (otro tipo de documento, o se pulsó muy rápido), se consulta y luego se sigue.
    if (this.consultado !== this.claveDocumento()) {
      clearTimeout(this.esperaConsulta);
      this.consultarAceptacion(() => this.continuar(e));
      return;
    }
    if (this.requiere() && !this.aceptaTodo()) {
      this.error.set(
        !this.aceptaTerminos() && !this.aceptaPrivacidad() ? "Marca las dos casillas para continuar." : !this.aceptaTerminos() ? "Marca la casilla de los Términos de uso." : "Marca la casilla de la Política de privacidad.",
      );
      return;
    }
    this.enviando.set(true);
    this.api.post<{ correo: string; telefono: string | null }>("auth/canales", { tipo: this.tipoVal(), documento: this.documento() }).subscribe({
      next: (c) => {
        this.enviando.set(false);
        this.error.set("");
        this.canales.set(c);
        // Sin celular registrado no hay nada que elegir: el código va al correo.
        if (c.telefono) this.paso.set(2);
        else this.enviar("correo");
      },
      error: (err) => {
        this.enviando.set(false);
        this.error.set(err.error?.message ?? "No pudimos validar tu documento.");
      },
    });
  }

  protected elegirCanal(canal: "correo" | "sms") {
    this.enviar(canal);
  }
  protected reenviar() {
    if (this.espera() > 0 || this.enviando()) return;
    this.enviar(this.canal(), true);
  }
  private enviar(canal: "correo" | "sms", reenvio = false) {
    this.enviando.set(true);
    this.error.set("");
    this.api.post<{ destino: string; demo?: string }>("auth/otp", { tipo: this.tipoVal(), documento: this.documento(), canal, aceptaciones: this.requiere() ? [...(this.aceptaTerminos() ? ["terminos"] : []), ...(this.aceptaPrivacidad() ? ["privacidad"] : [])] : [], dispositivo: nombreDispositivo(navigator.userAgent) }).subscribe({
      next: (r) => {
        this.enviando.set(false);
        this.canal.set(canal);
        this.destino.set(r.destino);
        this.demo.set(r.demo ?? "");
        this.codigo.set(["", "", "", "", "", ""]);
        this.aviso.set(reenvio ? "Te enviamos un código nuevo." : "");
        this.paso.set(3);
        this.iniciarEspera();
        if (reenvio) queueMicrotask(() => this.digitos()[0]?.nativeElement.focus());
      },
      error: (err) => {
        this.enviando.set(false);
        this.error.set(err.error?.message ?? "No pudimos enviar el código. Inténtalo de nuevo.");
      },
    });
  }
  /** Hay que esperar 30 s antes de pedir otro código. */
  private iniciarEspera() {
    clearInterval(this.temporizador);
    this.espera.set(30);
    this.temporizador = setInterval(() => {
      this.espera.update((n) => Math.max(0, n - 1));
      if (this.espera() === 0) clearInterval(this.temporizador);
    }, 1000);
  }
  protected atras() {
    this.error.set("");
    this.aviso.set("");
    this.paso.update((p) => (p === 3 && this.canales()?.telefono ? 2 : 1));
  }

  protected onDigito(i: number, e: Event) {
    const input = e.target as HTMLInputElement;
    const d = input.value.replace(/\D/g, "").slice(-1);
    input.value = d;
    this.codigo.update((prev) => prev.map((x, idx) => (idx === i ? d : x)));
    if (d && i < 5) this.digitos()[i + 1]?.nativeElement.focus();
  }
  /** Pegar el código completo (p. ej. desde el correo) llena las seis casillas. */
  protected alPegar(e: ClipboardEvent) {
    const d = (e.clipboardData?.getData("text") ?? "").replace(/\D/g, "").slice(0, 6);
    if (!d) return;
    e.preventDefault();
    this.codigo.set(Array.from({ length: 6 }, (_, i) => d[i] ?? ""));
    queueMicrotask(() => this.digitos()[Math.min(d.length, 5)]?.nativeElement.focus());
  }
  protected usarDemo() {
    this.codigo.set(this.demo().split("").slice(0, 6));
    queueMicrotask(() => this.digitos()[5]?.nativeElement.focus());
  }
  protected onKey(i: number, e: KeyboardEvent) {
    if (e.key === "Backspace" && !this.codigo()[i] && i > 0) this.digitos()[i - 1]?.nativeElement.focus();
  }

  protected validar(e: Event) {
    e.preventDefault();
    this.cargando.set(true);
    this.api.post<{ token: string }>("auth/verificar", { codigo: this.codigo(), dispositivo: nombreDispositivo(navigator.userAgent) }).subscribe({
      next: (r) => {
        // El servidor emite el token; desde aquí las peticiones de cuenta lo llevan y las rutas privadas se abren.
        this.sesion.entrar(r.token);
        this.store.init();
        const destino = SesionService.destinoSeguro(this.ruta.snapshot.queryParamMap.get("volver"));
        setTimeout(() => this.router.navigateByUrl(destino), 900);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err.error?.message ?? "Código inválido.");
        // Se vacían las casillas para volver a escribir.
        this.codigo.set(["", "", "", "", "", ""]);
        queueMicrotask(() => this.digitos()[0]?.nativeElement.focus());
      },
    });
  }
}
