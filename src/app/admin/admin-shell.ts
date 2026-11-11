import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, Injectable, computed, effect, inject, signal, untracked } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ConexionService } from "../core/conexion.service";
import { puede, registrarRoles, seccionDeRuta, type MatrizPermisos } from "../core/permisos";
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { filter, map } from "rxjs/operators";
import { IconComponent } from "../shared/icon.component";
import { LogoComponent } from "../shared/ui";
import { BrandService } from "../core/brand.service";
import { ApiService } from "../core/api.service";
import { DescargaDialogComponent } from "./descarga-dialog";
import { BtnDirective, ConfirmComponent, FieldComponent, INPUT_CLS, ToasterComponent, ToastService } from "./kit";
import type { RolAdmin } from "../core/models";
import { AdminSession, type UsuarioSesion } from "./session";
export { AdminSession, type UsuarioSesion } from "./session";

/** ¿Puede el rol ver esta ruta del panel? (la matriz de permisos está en core/permisos.ts). */
export const puedeVer = (rol: RolAdmin, ruta: string) => {
  if (ruta.split(/[?#]/)[0]!.replace(/\/$/, "") === "/admin/perfil") return true; // Mi perfil: cualquier usuario con sesión
  const s = seccionDeRuta(ruta);
  return !!s && puede(rol, s, "ver");
};
/** Menú lateral del panel, agrupado por área. */
const grupos = [
  { label: "General", items: [{ to: "/admin", label: "Dashboard", icon: "LayoutDashboard" }, { to: "/admin/reportes", label: "Reportes", icon: "BarChart3" }] },
  { label: "Participantes", items: [
    { to: "/admin/participantes", label: "Participantes", icon: "Users" },
    { to: "/admin/formulario", label: "Formulario de datos", icon: "FormInput" },
    { to: "/admin/importaciones", label: "Importaciones", icon: "FileSpreadsheet" },
  ] },
  { label: "Programa", items: [{ to: "/admin/niveles", label: "Niveles", icon: "Award" }] },
  { label: "Catálogos", items: [
    { to: "/admin/beneficios", label: "Beneficios", icon: "Gift" },
    { to: "/admin/marcas", label: "Marcas", icon: "Tag" },
  ] },
  { label: "Juegos", items: [
    { to: "/admin/ruleta", label: "Ruleta", icon: "Trophy" },
    { to: "/admin/codigos", label: "Lucky Code", icon: "Gift" },
  ] },
  { label: "Eventos", items: [
    { to: "/admin/eventos", label: "Eventos", icon: "CalendarDays" },
    { to: "/admin/pre-inscripciones", label: "Pre-inscripciones", icon: "Ticket" },
  ] },
  { label: "Operación", items: [
    { to: "/admin/pedidos", label: "Compras", icon: "ShoppingBag" },
    { to: "/admin/atencion", label: "Atención", icon: "MessageSquare" },
  ] },
  { label: "Sitio y app", items: [
    { to: "/admin/contenido", label: "Contenido", icon: "Image" },
    { to: "/admin/popups", label: "Pop-ups", icon: "Sparkles" },
    { to: "/admin/legales", label: "Textos legales", icon: "FileText" },
    { to: "/admin/configuracion", label: "Configuración", icon: "Settings" },
    { to: "/admin/correos", label: "Correos", icon: "Mail" },
    { to: "/admin/usuarios", label: "Usuarios", icon: "Users" },
    { to: "/admin/roles", label: "Roles", icon: "ShieldCheck" },
    { to: "/admin/auditoria", label: "Registro de cambios", icon: "List" },
    { to: "/admin/ayuda", label: "Ayuda", icon: "MessageCircleQuestion" },
  ] },
];

/* ------------------------------------------------------------------ */
/* Ingreso al panel                                                    */
/* ------------------------------------------------------------------ */
@Component({
  selector: "a-login",
  imports: [LogoComponent, BtnDirective, FieldComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid min-h-screen place-items-center bg-muted p-4">
      <div class="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-lg">
        <app-logo variant="light" class="h-9" />

        @switch (modo()) {
          @case ("login") {
            <form (submit)="ingresar($event)">
              <h1 class="mt-6 text-2xl font-bold">Panel de administración</h1>
              <p class="mt-1 text-muted-foreground">Ingresa con tu correo y contraseña.</p>
              <div class="mt-6 space-y-4">
                <a-field label="Correo"><input [class]="input" type="email" autocomplete="username" [value]="email()" (input)="email.set($any($event.target).value)" required /></a-field>
                <a-field label="Contraseña">
                  <span class="relative block">
                    <input [class]="input + ' pr-12'" [type]="verClave() ? 'text' : 'password'" autocomplete="current-password" [value]="clave()" (input)="clave.set($any($event.target).value)" required />
                    <button type="button" (click)="verClave.set(!verClave())" [attr.aria-pressed]="verClave()" [attr.aria-label]="verClave() ? 'Ocultar clave' : 'Mostrar clave'" [title]="verClave() ? 'Ocultar clave' : 'Mostrar clave'"
                      class="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                      <app-icon [name]="verClave() ? 'EyeOff' : 'Eye'" class="h-5 w-5" />
                    </button>
                  </span>
                </a-field>
                @if (error()) { <p role="alert" class="text-sm font-semibold text-destructive">{{ error() }}</p> }
                <button type="button" (click)="modo.set('olvido')" class="text-sm font-semibold text-primary hover:underline">¿Olvidaste tu contraseña?</button>
                <button aBtn type="submit" class="w-full" [disabled]="cargando()">Ingresar</button>
              </div>
            </form>
          }
          @case ("olvido") {
            <form (submit)="recuperar($event)">
              <h1 class="mt-6 text-2xl font-bold">Recupera tu contraseña</h1>
              <p class="mt-1 text-muted-foreground">Te enviaremos un enlace para crear una nueva.</p>
              <div class="mt-6 space-y-4">
                <a-field label="Correo"><input [class]="input" type="email" [value]="email()" (input)="email.set($any($event.target).value)" required /></a-field>
                <button aBtn type="submit" class="w-full">Enviar enlace</button>
                <button aBtn type="button" variant="ghost" class="w-full" (click)="modo.set('login')">Volver</button>
              </div>
            </form>
          }
          @case ("enviado") {
            <div>
              <h1 class="mt-6 text-2xl font-bold">Revisa tu correo</h1>
              <p class="mt-1 text-muted-foreground">Si <b class="text-foreground">{{ email() }}</b> pertenece a un usuario del panel, recibirá un enlace que vence en 30 minutos.</p>
              <button aBtn class="mt-6 w-full" (click)="modo.set('login')">Volver al ingreso</button>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class AdminLoginComponent {
  protected readonly session = inject(AdminSession);
  private readonly api = inject(ApiService);
  protected readonly input = INPUT_CLS;

  protected readonly modo = signal<"login" | "olvido" | "enviado">("login");
  protected readonly email = signal("");
  protected readonly clave = signal("");
  /** Muestra u oculta lo escrito en la contraseña. */
  protected readonly verClave = signal(false);
  protected readonly error = signal("");
  protected readonly cargando = signal(false);

  protected ingresar(e: Event) {
    e.preventDefault();
    this.error.set("");
    this.cargando.set(true);
    this.api.post<UsuarioSesion>("auth/admin/login", { email: this.email(), clave: this.clave() }).subscribe({
      next: (u) => {
        this.cargando.set(false);
        this.session.entrar(u);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.error?.message ?? "No se pudo ingresar. Inténtalo de nuevo.");
      },
    });
  }
  protected recuperar(e: Event) {
    e.preventDefault();
    this.api.post("auth/admin/recuperar", { email: this.email() }).subscribe(() => this.modo.set("enviado"));
  }
}

/* ------------------------------------------------------------------ */
/* Layout SaaS del panel                                               */
/* ------------------------------------------------------------------ */
type Accion = { id: string; etiqueta: string; grupo: string; icono: string; ejecutar: () => void };
type Aviso = { texto: string; ruta: string; icono: string; n: number };

const guardar = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* sin almacenamiento */
  }
};
const leer = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

@Component({
  selector: "app-admin-layout",
  imports: [NgTemplateOutlet, RouterOutlet, RouterLink, RouterLinkActive, IconComponent, LogoComponent, ToasterComponent, AdminLoginComponent, ConfirmComponent, DescargaDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "(document:keydown)": "teclado($event)" },
  template: `
    @if (!session.logged()) {
      <a-login />
    } @else {
      <div [class]="'flex min-h-screen w-full font-sans text-foreground ' + (oscuro() ? 'dark bg-background' : 'bg-muted/40')" [attr.data-admin-tema]="oscuro() ? 'oscuro' : 'claro'">
        <a-toaster />
    <a-descarga-dialog />
    <a-confirm [open]="!!conexion.conflicto()" title="Otro usuario modificó esto" confirmLabel="Recargar" (closed)="conexion.conflicto.set(null)" (confirmed)="recargar()">
      <p>{{ conexion.conflicto() }}</p>
      <p class="mt-2 text-sm">Si recargas verás lo último que se guardó y podrás volver a hacer tu cambio.</p>
    </a-confirm>
        <a href="#contenido" class="skip-link" (click)="$event.preventDefault(); saltarAlContenido()">Saltar al contenido</a>

        <!-- Barra lateral (escritorio) -->
        <aside [class]="'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 lg:flex ' + (colapsado() ? 'w-[72px]' : 'w-64')" aria-label="Navegación principal">
          <ng-container *ngTemplateOutlet="marcaTpl" />
          <ng-container *ngTemplateOutlet="nav; context: { $implicit: colapsado() }" />
          <div class="border-t border-border p-3">
            <button type="button" (click)="alternarColapso()" [attr.aria-label]="colapsado() ? 'Expandir barra lateral' : 'Contraer barra lateral'"
              class="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              <app-icon [name]="colapsado() ? 'ChevronRight' : 'ChevronLeft'" class="h-4 w-4" />
              @if (!colapsado()) { Contraer }
            </button>
          </div>
        </aside>

        <!-- Menú móvil -->
        @if (open()) {
          <div class="fixed inset-0 z-50 lg:hidden">
            <button aria-label="Cerrar menú" class="absolute inset-0 bg-foreground/40" (click)="open.set(false)"></button>
            <aside class="relative flex h-full w-72 flex-col bg-card">
              <div class="flex h-14 items-center justify-between border-b border-border pr-3 [&>div]:h-full [&>div]:border-b-0">
                <ng-container *ngTemplateOutlet="marcaTpl" />
                <button aria-label="Cerrar" (click)="open.set(false)" class="grid h-11 w-11 place-items-center rounded-xl hover:bg-muted"><app-icon name="X" class="h-5 w-5" /></button>
              </div>
              <ng-container *ngTemplateOutlet="nav; context: { $implicit: false }" />
            </aside>
          </div>
        }

        <div class="flex min-w-0 flex-1 flex-col">
          <!-- Barra superior -->
          <header class="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-card/95 px-3 backdrop-blur md:px-5">
            <button aria-label="Abrir menú" (click)="open.set(true)" class="grid h-10 w-10 place-items-center rounded-xl hover:bg-muted lg:hidden"><app-icon name="Menu" class="h-5 w-5" /></button>

            <button type="button" (click)="abrirPaleta()" aria-label="Buscar y ejecutar comandos"
              class="ml-auto flex h-10 min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm text-muted-foreground hover:border-primary md:ml-auto md:w-64 md:justify-between">
              <span class="flex items-center gap-2"><app-icon name="Search" class="h-4 w-4" /><span class="hidden md:inline">Buscar o ir a…</span></span>
              <kbd class="hidden rounded-md border border-border px-1.5 py-0.5 text-[11px] font-semibold md:inline">Ctrl K</kbd>
            </button>

            <div class="flex items-center gap-1">
              <!-- Notificaciones -->
              <div class="relative">
                <button type="button" aria-label="Notificaciones" [attr.aria-expanded]="notifAbierta()" (click)="menu('notif')" class="relative grid h-10 w-10 place-items-center rounded-xl hover:bg-muted">
                  <app-icon name="MessageSquare" class="h-4 w-4" />
                  @if (totalAvisos() > 0) { <span class="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{{ totalAvisos() }}</span> }
                </button>
                @if (notifAbierta()) {
                  <div class="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-border bg-card p-2 shadow-xl" role="menu">
                    <p class="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pendientes</p>
                    @for (a of avisos(); track a.ruta) {
                      <a [routerLink]="a.ruta" (click)="cerrarMenus()" role="menuitem" class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted">
                        <app-icon [name]="a.icono" class="h-4 w-4 text-primary" /><span class="flex-1">{{ a.texto }}</span><b>{{ a.n }}</b>
                      </a>
                    } @empty { <p class="px-3 py-4 text-sm text-muted-foreground">Todo al día 🎉</p> }
                  </div>
                }
              </div>

              <button type="button" [attr.aria-label]="oscuro() ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'" (click)="alternarTema()" class="grid h-10 w-10 place-items-center rounded-xl hover:bg-muted">
                <app-icon [name]="oscuro() ? 'Sun' : 'Moon'" class="h-4 w-4" />
              </button>
              <a routerLink="/" class="hidden h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium hover:bg-muted md:inline-flex"><app-icon name="ExternalLink" class="h-4 w-4" /> Ver sitio</a>

              <!-- Usuario -->
              <div class="relative">
                <button type="button" aria-label="Menú de usuario" [attr.aria-expanded]="userAbierto()" (click)="menu('user')" class="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-muted">
                  <span class="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{{ iniciales() }}</span>
                  <span class="hidden text-left text-sm leading-tight lg:block"><b class="block">{{ nombre() }}</b><span class="text-muted-foreground">{{ session.rol() }}</span></span>
                </button>
                @if (userAbierto()) {
                  <div class="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-border bg-card p-2 shadow-xl" role="menu">
                    <div class="px-3 py-2"><p class="font-semibold">{{ nombre() }}</p><p class="text-sm text-muted-foreground">{{ session.rol() }}</p></div>
                    <p class="px-3 pb-2 text-sm text-muted-foreground">{{ session.usuario()?.email }}</p>
                    <div class="my-1 border-t border-border"></div>
                    <a routerLink="/admin/perfil" role="menuitem" (click)="cerrarMenus()" class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-muted"><app-icon name="User" class="h-4 w-4" /> Mi perfil</a>
                    <button type="button" role="menuitem" aria-label="Cerrar sesión" (click)="session.salir()" class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-muted"><app-icon name="LogOut" class="h-4 w-4" /> Cerrar sesión</button>
                  </div>
                }
              </div>
            </div>
          </header>

          <main id="contenido" tabindex="-1" class="mx-auto w-full max-w-[1500px] flex-1 p-4 outline-none md:p-8" (click)="cerrarMenus()">
            @if (permitido()) {
              @if (soloLectura()) {
                <p role="status" class="mb-4 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-muted-foreground"><b class="text-foreground">Solo lectura.</b> Tu rol ({{ session.rol() }}) puede consultar esta sección, pero no modificarla.</p>
              }
              <router-outlet />
            } @else {
              <div class="mx-auto mt-16 max-w-md rounded-2xl border border-border bg-card p-8 text-center">
                <app-icon name="ShieldAlert" class="mx-auto h-10 w-10 text-muted-foreground" />
                <h1 class="mt-4 text-xl font-bold">Sin acceso a esta sección</h1>
                <p class="mt-2 text-muted-foreground">Tu rol <b>{{ session.rol() }}</b> no tiene permiso. Pide acceso a un administrador.</p>
                <a routerLink="/admin" class="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground">Ir al Dashboard</a>
              </div>
            }
          </main>
        </div>

        <!-- Paleta de comandos -->
        @if (paleta()) {
          <div class="fixed inset-0 z-[80] grid place-items-start justify-items-center bg-foreground/40 p-4 pt-[12vh]" (click)="paleta.set(false)">
            <div class="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" role="dialog" aria-modal="true" aria-label="Paleta de comandos" (click)="$event.stopPropagation()">
              <div class="flex items-center gap-3 border-b border-border px-4">
                <app-icon name="Search" class="h-4 w-4 text-muted-foreground" />
                <input #q autofocus aria-label="Buscar comandos" class="h-12 flex-1 bg-transparent text-sm outline-none" placeholder="Ir a una sección o ejecutar una acción…"
                  [value]="consulta()" (input)="consulta.set($any($event.target).value); activo.set(0)" (keydown)="tecladoPaleta($event)" />
                <kbd class="rounded-md border border-border px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">Esc</kbd>
              </div>
              <ul class="max-h-80 overflow-y-auto p-2" role="listbox">
                @for (a of resultados(); track a.id; let i = $index) {
                  <li role="option" [attr.aria-selected]="i === activo()">
                    <button type="button" (mouseenter)="activo.set(i)" (click)="ejecutar(a)"
                      [class]="'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ' + (i === activo() ? 'bg-primary/10' : '')">
                      <app-icon [name]="a.icono" class="h-4 w-4 text-primary" /><span class="flex-1 font-medium">{{ a.etiqueta }}</span><span class="text-xs text-muted-foreground">{{ a.grupo }}</span>
                    </button>
                  </li>
                } @empty { <li class="px-3 py-6 text-center text-sm text-muted-foreground">Sin resultados para “{{ consulta() }}”.</li> }
              </ul>
            </div>
          </div>
        }
      </div>

      <ng-template #marcaTpl>
        <div class="flex h-14 items-center border-b border-border px-4">
          <a routerLink="/admin" class="flex min-w-0 items-center" [attr.aria-label]="'Inicio del panel · ' + brand.marca().nombre">
            @if (colapsado() && !open()) {
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-sm font-extrabold text-primary-foreground">{{ brand.marca().nombre.charAt(0) }}</span>
            } @else {
              <app-logo variant="light" class="h-9" />
            }
          </a>
        </div>
      </ng-template>

      <ng-template #nav let-compacto>
        <nav class="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          @for (g of gruposVisibles(); track g.label) {
            <div>
              @if (!compacto) { <p class="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{{ g.label }}</p> } @else { <div class="mx-3 mb-2 border-t border-border"></div> }
              @for (it of g.items; track it.to) {
                <a [routerLink]="it.to" routerLinkActive="!bg-primary !text-primary-foreground" ariaCurrentWhenActive="page" [routerLinkActiveOptions]="{ exact: it.to === '/admin' }"
                  [attr.title]="compacto ? it.label : null" [attr.aria-label]="it.label"
                  [class]="'flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted ' + (compacto ? 'justify-center' : '')">
                  <app-icon [name]="it.icon" class="h-4 w-4 shrink-0" /> @if (!compacto) { <span class="truncate">{{ it.label }}</span> }
                </a>
              }
            </div>
          }
        </nav>
      </ng-template>
    }
  `,
})
export class AdminLayoutComponent {
  protected readonly session = inject(AdminSession);
  protected readonly conexion = inject(ConexionService);
  protected recargar() {
    location.reload();
  }
  private readonly toast = inject(ToastService);
  protected readonly brand = inject(BrandService);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);

  protected readonly open = signal(false);
  protected readonly colapsado = signal(leer("bs_admin_colapsado") === "1");
  protected readonly oscuro = signal(leer("bs_admin_oscuro") === "1");
  protected readonly paleta = signal(false);
  private readonly tiposReporte = signal<{ id: string; titulo: string }[]>([]);
  protected readonly consulta = signal("");
  protected readonly activo = signal(0);
  protected readonly notifAbierta = signal(false);
  protected readonly userAbierto = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), map(() => this.router.url)),
    { initialValue: this.router.url },
  );
  protected readonly avisos = signal<Aviso[]>([]);
  protected readonly totalAvisos = computed(() => this.avisos().reduce((a, x) => a + x.n, 0));

  protected readonly permitido = computed(() => puedeVer(this.session.rol(), this.url()));
  /** Puede ver la sección pero no modificarla (se avisa arriba; el servidor igual rechaza las escrituras con 403). */
  protected readonly soloLectura = computed(() => {
    const s = seccionDeRuta(this.url());
    return !!s && puede(this.session.rol(), s, "ver") && !puede(this.session.rol(), s, "editar");
  });
  protected readonly gruposVisibles = computed(() =>
    grupos.map((g) => ({ ...g, items: g.items.filter((it) => puedeVer(this.session.rol(), it.to)) })).filter((g) => g.items.length),
  );
  protected readonly nombre = computed(() => this.session.usuario()?.nombre ?? "");
  protected readonly iniciales = computed(() => this.nombre().split(" ").map((x) => x[0]).join(""));

  /** Comandos disponibles en la paleta (secciones permitidas + acciones). */
  private readonly comandos = computed<Accion[]>(() => {
    const secciones: Accion[] = this.gruposVisibles().flatMap((g) =>
      g.items.map((it) => ({ id: it.to, etiqueta: it.label, grupo: g.label, icono: it.icon, ejecutar: () => void this.router.navigateByUrl(it.to) })),
    );
    const reportes: Accion[] = this.tiposReporte().map((t) => ({
      id: `reporte-${t.id}`, etiqueta: `Reporte: ${t.titulo}`, grupo: "Reportes", icono: "BarChart3",
      ejecutar: () => void this.router.navigate(["/admin/reportes"], { queryParams: { tipo: t.id === "resumen" ? null : t.id } }),
    }));
    return [
      ...secciones,
      ...reportes,
      { id: "tema", etiqueta: this.oscuro() ? "Cambiar a tema claro" : "Cambiar a tema oscuro", grupo: "Acciones", icono: this.oscuro() ? "Sun" : "Moon", ejecutar: () => this.alternarTema() },
      { id: "sitio", etiqueta: "Ver el sitio del participante", grupo: "Acciones", icono: "ExternalLink", ejecutar: () => void this.router.navigateByUrl("/") },
      { id: "marca", etiqueta: "Marca y localización", grupo: "Acciones", icono: "Settings", ejecutar: () => void this.router.navigateByUrl("/admin/configuracion") },
      { id: "colores", etiqueta: "Cambiar colores del sitio", grupo: "Acciones", icono: "Settings", ejecutar: () => void this.router.navigateByUrl("/admin/configuracion") },
      { id: "perfil", etiqueta: "Mi perfil", grupo: "Acciones", icono: "User", ejecutar: () => void this.router.navigateByUrl("/admin/perfil") },
      { id: "salir", etiqueta: "Cerrar sesión", grupo: "Acciones", icono: "LogOut", ejecutar: () => this.session.salir() },
    ];
  });
  protected readonly resultados = computed(() => {
    const q = this.consulta().trim().toLowerCase();
    return this.comandos().filter((c) => !q || `${c.etiqueta} ${c.grupo}`.toLowerCase().includes(q));
  });

  constructor() {
    // Roles personalizados: el servidor manda qué permisos tiene cada uno para decidir qué mostrar en el menú.
    this.api.get<{ roles: { rol: string; matriz?: MatrizPermisos }[] }>("admin/meta").subscribe({ next: (m) => registrarRoles(m.roles), error: () => undefined });
    // El servidor negó una acción por permisos: se informa con el motivo.
    effect(() => {
      const m = this.conexion.permisoDenegado();
      if (m) {
        this.toast.error(m);
        this.conexion.permisoDenegado.set(null);
      }
    });
    // El API devolvió 401 (token vencido): se cierra la sesión y vuelve al ingreso.
    effect(() => {
      if (this.conexion.sesionVencida()) {
        this.session.salir();
        this.conexion.sesionVencida.set(false);
      }
    });
    let primera = true;
    effect(() => {
      this.url();
      this.open.set(false);
      this.cerrarMenus();
      // Al cambiar de sección el foco pasa al contenido (accesibilidad con teclado y lector de pantalla).
      if (primera) primera = false;
      else document.getElementById("contenido")?.focus({ preventScroll: true });
    });
    // Los avisos requieren sesión: se piden al ingresar (y al volver a ingresar con otro rol).
    effect(() => {
      if (this.session.logged()) untracked(() => this.cargarAvisos());
      else this.avisos.set([]);
    });
  }

  private cargarAvisos() {
    this.api.get<{ mensajes: unknown[] }>("admin/resumen").subscribe((r) => {
      this.avisos.update((a) => [
        ...a.filter((x) => x.ruta !== "/admin/atencion"),
        ...(r.mensajes.length ? [{ texto: "Mensajes sin responder", ruta: "/admin/atencion", icono: "MessageSquare", n: r.mensajes.length }] : []),
      ]);
    });
  }

  protected menu(cual: "notif" | "user") {
    const previo = { notif: this.notifAbierta(), user: this.userAbierto() }[cual];
    this.cerrarMenus();
    if (!previo) ({ notif: this.notifAbierta, user: this.userAbierto })[cual].set(true);
  }
  protected cerrarMenus() {
    this.notifAbierta.set(false);
    this.userAbierto.set(false);
  }
  protected alternarColapso() {
    this.colapsado.update((v) => !v);
    guardar("bs_admin_colapsado", this.colapsado() ? "1" : "0");
  }
  protected alternarTema() {
    this.oscuro.update((v) => !v);
    guardar("bs_admin_oscuro", this.oscuro() ? "1" : "0");
  }

  protected saltarAlContenido() {
    document.getElementById("contenido")?.focus();
  }

  protected abrirPaleta() {
    this.consulta.set("");
    this.activo.set(0);
    this.cerrarMenus();
    this.paleta.set(true);
    this.cargarTiposReporte();
    setTimeout(() => document.querySelector<HTMLInputElement>('[aria-label="Buscar comandos"]')?.focus());
  }
  /** Los tipos de reporte los define la API: se piden la primera vez que se abre la paleta (solo si la persona puede ver reportes). */
  private cargarTiposReporte() {
    if (this.tiposReporte().length || !puedeVer(this.session.rol(), "/admin/reportes")) return;
    this.api.get<{ id: string; titulo: string }[]>("admin/reportes/tipos").subscribe({ next: (t) => this.tiposReporte.set(t), error: () => undefined });
  }
  protected ejecutar(a: Accion) {
    this.paleta.set(false);
    a.ejecutar();
  }
  protected teclado(e: KeyboardEvent) {
    if (!this.session.logged()) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      this.paleta() ? this.paleta.set(false) : this.abrirPaleta();
    } else if (e.key === "Escape") {
      this.paleta.set(false);
      this.cerrarMenus();
    }
  }
  protected tecladoPaleta(e: KeyboardEvent) {
    const n = this.resultados().length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.activo.update((i) => Math.min(i + 1, n - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.activo.update((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && this.resultados()[this.activo()]) {
      e.preventDefault();
      this.ejecutar(this.resultados()[this.activo()]!);
    }
  }
}
