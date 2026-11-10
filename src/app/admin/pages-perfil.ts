import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { ApiService } from "../core/api.service";
import { claveValida, requisitosClave, validarNombrePersona } from "../core/validaciones";
import { IconComponent } from "../shared/icon.component";
import { ClaveInputComponent } from "./clave-input";
import { BtnDirective, FieldComponent, INPUT_CLS, PageHeaderComponent, PanelComponent, PillComponent, ToastService } from "./kit";
import { AdminSession } from "./session";

type Perfil = { id: string; nombre: string; email: string; rol: string; estado: string; ultimo: string; descripcionRol: string; secciones: string[] };

/**
 * Mi perfil del panel: la persona que tiene la sesión ve sus datos, cambia su nombre y su contraseña. El correo y el rol los define
 * un administrador (Usuarios y Roles). Los cambios quedan en el Registro de cambios (nunca la contraseña).
 */
@Component({
  selector: "a-perfil-admin-page",
  imports: [PageHeaderComponent, PanelComponent, FieldComponent, BtnDirective, PillComponent, IconComponent, ClaveInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header title="Mi perfil" desc="Tus datos de acceso al panel y tu contraseña." />

    @if (error()) {
      <div role="alert" class="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{{ error() }} <button aBtn variant="outline" class="ml-2" (click)="cargar()">Reintentar</button></div>
    } @else if (!perfil()) {
      <div role="status" aria-label="Cargando" class="skeleton h-40 rounded-2xl"></div>
    }

    @if (perfil(); as p) {
      <div class="grid gap-6 lg:grid-cols-2 lg:items-start">
        <a-panel title="Mis datos">
          <div class="mb-5 flex items-center gap-4">
            <span class="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground" aria-hidden="true">{{ iniciales() }}</span>
            <div class="min-w-0">
              <p class="truncate text-lg font-bold">{{ p.nombre }}</p>
              <p class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><a-pill tone="info">{{ p.rol }}</a-pill> <a-pill [tone]="p.estado === 'Inactivo' ? 'bad' : 'ok'">{{ p.estado }}</a-pill></p>
            </div>
          </div>

          <div class="space-y-4">
            <a-field label="Nombre completo" [error]="errNombre()" [forzar]="intentoNombre()">
              <input [class]="input" maxlength="60" autocomplete="name" [value]="nombre()" (input)="nombre.set($any($event.target).value)" />
            </a-field>
            <a-field label="Correo de acceso">
              <input [class]="input + ' bg-muted'" type="email" [value]="p.email" disabled />
            </a-field>
            <p class="-mt-2 text-xs text-muted-foreground">Con este correo ingresas al panel. Si necesitas cambiarlo, pídeselo a un administrador.</p>
            <dl class="grid gap-3 rounded-xl bg-muted/50 p-3 text-sm sm:grid-cols-2">
              <div><dt class="text-xs text-muted-foreground">Último ingreso</dt><dd class="font-medium">{{ p.ultimo }}</dd></div>
              <div><dt class="text-xs text-muted-foreground">Tu rol</dt><dd class="font-medium">{{ p.rol }}</dd></div>
            </dl>
            <div class="flex justify-end"><button aBtn [disabled]="guardandoNombre() || nombre().trim() === p.nombre" (click)="guardarNombre()">Guardar nombre</button></div>
          </div>
        </a-panel>

        <div class="space-y-6">
          <a-panel title="Lo que puedes hacer">
            <p class="text-sm text-muted-foreground">{{ p.descripcionRol }}</p>
            <ul class="mt-3 flex flex-wrap gap-1.5" aria-label="Secciones a las que tienes acceso">
              @for (s of p.secciones; track s) { <li class="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{{ s }}</li> } @empty { <li class="text-sm text-muted-foreground">Sin secciones asignadas.</li> }
            </ul>
          </a-panel>

          <a-panel title="Cambiar contraseña">
            <form class="space-y-4" (submit)="cambiarClave($event)" novalidate>
              <div>
                <label class="mb-1.5 block text-sm font-medium" for="clave-actual">Contraseña actual</label>
                <a-clave-input inputId="clave-actual" nombre="actual" [valor]="actual()" autocompletar="current-password" [invalido]="!!errActual()" (valorChange)="actual.set($event); errActual.set('')" />
                @if (errActual()) { <p role="alert" class="mt-1 text-xs font-medium text-destructive">{{ errActual() }}</p> }
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium" for="clave-nueva">Contraseña nueva</label>
                <a-clave-input inputId="clave-nueva" nombre="nueva" [valor]="nueva()" autocompletar="new-password" describe="reglas-clave" (valorChange)="nueva.set($event)" />
                <ul id="reglas-clave" class="mt-2 space-y-1 text-xs" aria-label="Requisitos de la contraseña">
                  @for (r of requisitos(); track r.texto) {
                    <li [class]="r.ok ? 'flex items-center gap-1.5 text-primary' : 'flex items-center gap-1.5 text-muted-foreground'">
                      <app-icon [name]="r.ok ? 'CheckCircle2' : 'Minus'" class="h-3.5 w-3.5" /> <span>{{ r.texto }}</span><span class="sr-only">{{ r.ok ? ' (cumplido)' : ' (falta)' }}</span>
                    </li>
                  }
                </ul>
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium" for="clave-repetir">Repite la contraseña nueva</label>
                <a-clave-input inputId="clave-repetir" nombre="repetida" [valor]="repetir()" autocompletar="new-password" [invalido]="!!errRepetir()" (valorChange)="repetir.set($event)" />
                @if (errRepetir()) { <p role="alert" class="mt-1 text-xs font-medium text-destructive">{{ errRepetir() }}</p> }
              </div>
              @if (errorClave()) { <p role="alert" class="text-sm font-semibold text-destructive">{{ errorClave() }}</p> }
              <div class="flex justify-end"><button aBtn type="submit" [disabled]="cambiando()">{{ cambiando() ? 'Guardando…' : 'Cambiar contraseña' }}</button></div>
            </form>
          </a-panel>
        </div>
      </div>
    }
  `,
})
export class PerfilAdminPage {
  private readonly api = inject(ApiService);
  private readonly session = inject(AdminSession);
  private readonly toast = inject(ToastService);
  protected readonly input = INPUT_CLS;

  protected readonly perfil = signal<Perfil | null>(null);
  protected readonly error = signal("");
  protected readonly nombre = signal("");
  protected readonly intentoNombre = signal(false);
  protected readonly guardandoNombre = signal(false);
  protected readonly errNombre = computed(() => validarNombrePersona(this.nombre(), "Tu nombre"));
  protected readonly iniciales = computed(() => (this.perfil()?.nombre ?? "").split(/\s+/).map((x) => x[0] ?? "").slice(0, 2).join("").toUpperCase());

  protected readonly actual = signal("");
  protected readonly nueva = signal("");
  protected readonly repetir = signal("");
  protected readonly errActual = signal("");
  protected readonly errorClave = signal("");
  protected readonly cambiando = signal(false);
  protected readonly requisitos = computed(() => requisitosClave(this.nueva(), this.actual()));
  protected readonly errRepetir = computed(() => (this.repetir() && this.repetir() !== this.nueva() ? "Las contraseñas no coinciden." : ""));

  constructor() {
    this.cargar();
  }

  protected cargar() {
    this.error.set("");
    this.api.get<Perfil>("admin/perfil").subscribe({
      next: (p) => { this.perfil.set(p); this.nombre.set(p.nombre); },
      error: () => this.error.set("No pudimos cargar tu perfil. Revisa tu conexión e inténtalo otra vez."),
    });
  }

  protected guardarNombre() {
    this.intentoNombre.set(true);
    if (this.errNombre()) return;
    this.guardandoNombre.set(true);
    this.api.put<{ nombre: string }>("admin/perfil", { nombre: this.nombre() }).subscribe({
      next: (r) => {
        this.guardandoNombre.set(false);
        this.perfil.update((p) => (p ? { ...p, nombre: r.nombre } : p));
        this.nombre.set(r.nombre);
        this.session.actualizarNombre(r.nombre);
        this.toast.show("Nombre actualizado");
      },
      error: (e) => { this.guardandoNombre.set(false); this.toast.error(e?.error?.message ?? "No pudimos guardar tu nombre."); },
    });
  }

  protected cambiarClave(e: Event) {
    e.preventDefault();
    this.errorClave.set("");
    if (!this.actual()) { this.errActual.set("Escribe tu contraseña actual."); return; }
    if (!claveValida(this.nueva(), this.actual())) { this.errorClave.set("La contraseña nueva todavía no cumple todos los requisitos."); return; }
    if (this.nueva() !== this.repetir()) return;
    this.cambiando.set(true);
    this.api.post("admin/perfil/clave", { actual: this.actual(), nueva: this.nueva() }).subscribe({
      next: () => {
        this.cambiando.set(false);
        this.actual.set(""); this.nueva.set(""); this.repetir.set("");
        this.toast.show("Contraseña actualizada");
      },
      error: (er) => {
        this.cambiando.set(false);
        const m = er?.error?.message ?? "No pudimos cambiar la contraseña.";
        if (/actual/i.test(m)) this.errActual.set(m); else this.errorClave.set(m);
      },
    });
  }
}
