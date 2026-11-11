import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { ApiService } from '../core/api.service';
import { NOMBRE_LEGAL, TIPOS_LEGALES, type EstadoLegalesParticipante, type TipoLegal } from '../core/legales';
import { CatalogService } from '../core/catalog.service';
import { BrandService } from '../core/brand.service';
import { AdminSession } from './session';
import { formatUSD } from '../core/format';
import { estadoLabels } from '../core/labels';
import type { BeneficioUsuario, Direccion, Participante } from '../core/models';
import { IconComponent } from '../shared/icon.component';
import { TelefonoInputComponent } from '../shared/telefono-input';
import { edadA, validarNombrePersona, validarTelefono } from '../core/validaciones';
import { agruparCampos } from '../core/validar-perfil';
import { AdminModalComponent, BtnDirective, ConfirmComponent, FieldComponent, INPUT_CLS, OrdenColumnaComponent, PagerComponent, PillComponent, ToastService, descargarTabla } from './kit';
import { BarraListaComponent, ListaLocal } from './lista-local';

type Ficha = Participante & { direcciones: Direccion[] };
type Pedido = {
  codigo: string;
  fecha: string;
  estadoAdmin: string;
  montoUSD: number;
  items: { nombre: string; cantidad: number }[];
};
type Auditoria = { fecha: string; usuario: string; accion: string; seccion: string };
type Actividad = {
  pedidos: Pedido[];
  beneficios: BeneficioUsuario[];
  auditoria: Auditoria[];
  legales?: EstadoLegalesParticipante;
};

const TABS = [
  { k: 'resumen', l: 'Resumen' },
  { k: 'datos', l: 'Datos y direcciones' },
  { k: 'compras', l: 'Compras' },
  { k: 'beneficios', l: 'Beneficios' },
  { k: 'historial', l: 'Historial' },
  { k: 'nivel', l: 'Nivel' },
] as const;
type TabK = (typeof TABS)[number]['k'];

/**
 * Ficha del participante en su propia página (/admin/participantes/:id). Todo lo que muestra sale de la información de ese
 * participante: sus compras, beneficios, nivel y los registros de auditoría que lo mencionan.
 */
@Component({
  selector: 'a-participante-page',
  imports: [RouterLink, IconComponent, TelefonoInputComponent, PillComponent, BtnDirective, FieldComponent, ConfirmComponent, AdminModalComponent, BarraListaComponent, PagerComponent, OrdenColumnaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/admin/participantes" class="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
      <app-icon name="ArrowLeft" class="h-4 w-4" /> Participantes
    </a>

    @if (f(); as s) {
      <header class="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <h1 class="text-2xl font-bold">{{ s.nombre }}</h1>
          <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{{ s.cedula }}</span>
            <span>Código {{ s.id }}</span>
            <span>Alta {{ s.alta }}</span>
            <a-pill [tone]="s.estado === 'Activo' ? 'ok' : 'bad'">{{ s.estado }}</a-pill>
          </p>
        </div>
        <dl class="grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-xl bg-card px-4 py-2 shadow-[var(--shadow-card)]"><dt class="text-xs text-muted-foreground">Nivel</dt><dd class="text-lg font-bold">{{ s.nivel }}</dd></div>
          <div class="rounded-xl bg-card px-4 py-2 shadow-[var(--shadow-card)]"><dt class="text-xs text-muted-foreground">Canal</dt><dd class="text-lg font-bold">{{ s.canal }}</dd></div>
        </dl>
      </header>

      <div class="mt-5 flex gap-1 overflow-x-auto border-b border-border" role="tablist" aria-label="Secciones de la ficha">
        @for (t of tabs; track t.k) {
          <button type="button" role="tab" [attr.aria-selected]="tab() === t.k" (click)="irA(t.k)"
            [class]="'h-11 shrink-0 border-b-2 px-3 text-sm font-semibold ' + (tab() === t.k ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')">
            {{ t.l }}@if (cuenta(t.k) !== null) { <span class="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-semibold">{{ cuenta(t.k) }}</span> }
          </button>
        }
      </div>

      <div class="mt-6" role="tabpanel">
        @switch (tab()) {
          @case ('resumen') {
            <div class="grid gap-6 lg:grid-cols-2">
              <section class="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
                <h2 class="font-semibold">Últimas compras</h2>
                <ul class="mt-2 divide-y divide-border text-sm">
                  @for (c of act().pedidos.slice(0, 3); track c.codigo) {
                    <li class="flex items-center justify-between gap-3 py-2"><span>{{ c.codigo }} · {{ c.fecha }}</span><a-pill>{{ c.estadoAdmin }}</a-pill></li>
                  } @empty { <li class="py-2 text-muted-foreground">Sin compras todavía.</li> }
                </ul>
                <button type="button" class="mt-2 text-sm font-semibold text-primary hover:underline" (click)="irA('compras')">Ver todas</button>
              </section>
              @if (act().legales; as lg) {
                <section class="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] lg:col-span-2" aria-label="Textos legales">
                  <h2 class="font-semibold">Textos legales</h2>
                  <ul class="mt-2 divide-y divide-border text-sm">
                    @for (t of tiposLegales; track t.k) {
                      <li class="flex flex-wrap items-center justify-between gap-2 py-2">
                        <span>{{ t.l }}<span class="block text-xs text-muted-foreground">
                          @if (lg.aceptadas[t.k]; as a) { Aceptó la versión {{ a.version }} el {{ a.fecha.slice(0, 10).split('-').reverse().join('/') }} · {{ a.canal }} } @else { Todavía no ha aceptado ningún texto }
                        </span></span>
                        @if (pendienteLegal(t.k)) { <a-pill tone="warn">Pendiente: versión {{ lg.vigentes[t.k].version }}</a-pill> } @else { <a-pill tone="ok">Al día</a-pill> }
                      </li>
                    }
                  </ul>
                </section>
              }
              <section class="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] lg:col-span-2">
                <h2 class="font-semibold">Acceso a la cuenta</h2>
                <p class="mt-1 text-sm text-muted-foreground">
                  El participante ingresa con su documento y un código de 6 dígitos que se envía a <b class="text-foreground">{{ s.email }}</b>. No tiene contraseña que restablecer.
                </p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button aBtn variant="outline" [disabled]="s.estado !== 'Activo'" (click)="reenviarCodigo()"><app-icon name="Mail" class="h-4 w-4" /> Reenviar código de acceso</button>
                  <button aBtn variant="outline" (click)="abrirCambioCorreo()"><app-icon name="Pencil" class="h-4 w-4" /> Cambiar correo de acceso</button>
                  <button aBtn [variant]="s.estado === 'Activo' ? 'peligro' : 'outline'" (click)="confirm.set('estado')">{{ s.estado === 'Activo' ? 'Bloquear cuenta' : 'Activar cuenta' }}</button>
                </div>
                @if (s.estado !== 'Activo') { <p class="mt-2 text-xs text-muted-foreground">La cuenta está bloqueada: actívala para poder enviar el código.</p> }
              </section>
            </div>
          }
          @case ('datos') {
            <div class="grid gap-6 lg:grid-cols-2">
              <section class="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
                <h2 class="font-semibold">Datos personales</h2>
                <div class="mt-3 space-y-4">
                  <a-field label="Cédula (no editable)"><input [class]="input + ' bg-muted'" [value]="s.cedula" disabled /></a-field>
                  <a-field label="Nombre completo" [error]="errNombre()" [forzar]="intento()"><input [class]="input" maxlength="100" [value]="datos().nombre" (input)="setDato('nombre', $event)" /></a-field>
                  <a-field label="Correo de acceso (no editable aquí)"><input [class]="input + ' bg-muted'" type="email" [value]="s.email" disabled /></a-field>
                  <p class="-mt-2 text-xs text-muted-foreground">Se cambia desde Resumen → Acceso a la cuenta, porque a ese correo llegan los códigos para ingresar y el cambio queda registrado.</p>
                  <div>
                    <span class="mb-1.5 block text-sm font-medium text-foreground">Celular</span>
                    <app-telefono-input variante="panel" inputId="ficha-celular" [valor]="datos().celular" [invalido]="!!errCelular() && intento()" (valorChange)="setCelular($event)" />
                    @if (errCelular() && intento()) { <p role="alert" class="mt-1 text-xs font-medium text-destructive">{{ errCelular() }}</p> }
                  </div>
                  <label class="flex cursor-pointer items-start gap-3 text-sm">
                    <input type="checkbox" class="mt-0.5 h-4 w-4" aria-label="Acepta novedades por correo" [checked]="s.recibeNovedades !== false" (change)="cambiarNovedades($any($event.target).checked)" />
                    <span><b>Acepta novedades y campañas por correo</b>
                      <span class="block text-xs text-muted-foreground">Solo cámbialo si la persona lo pidió. Los avisos de su cuenta se envían siempre.
                        @if (s.novedadesCambio; as n) { Último cambio: {{ n.fecha }} ({{ origenNovedades[n.origen] }}). }</span></span>
                  </label>
                  <p class="text-sm text-muted-foreground">Fecha de alta: {{ s.alta }}</p>
                  <button aBtn (click)="guardarDatos()">Guardar datos</button>
                </div>
              </section>
              <section class="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
                <h2 class="font-semibold">Direcciones de envío</h2>
                <ul class="mt-3 space-y-3">
                  @for (d of s.direcciones; track d.id) {
                    <li class="flex items-start gap-3 rounded-xl border border-border p-4">
                      <div class="flex-1">
                        <p class="font-semibold">{{ d.alias }}</p>
                        <p class="text-sm text-muted-foreground">{{ d.direccion }}</p>
                        <p class="text-sm text-muted-foreground">{{ d.distrito }}@if (d.provincia) { · {{ d.provincia }} } · Recibe {{ d.recibe }} · {{ d.telefono }}</p>
                      </div>
                      <button aria-label="Eliminar dirección" title="Eliminar dirección" (click)="confirm.set('dir:' + d.id)" class="grid h-11 w-11 place-items-center rounded-xl text-destructive hover:bg-destructive/10"><app-icon name="Trash2" class="h-4 w-4" /></button>
                    </li>
                  } @empty { <li class="text-muted-foreground">Sin direcciones registradas.</li> }
                </ul>
              </section>
              <section class="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] lg:col-span-2" aria-labelledby="form-datos">
                <h2 id="form-datos" class="font-semibold">Datos del formulario</h2>
                <p class="mt-1 text-sm text-muted-foreground">Respuestas a los campos adicionales que el participante completa en Mi perfil (se configuran en Formulario de datos).</p>
                @if (camposForm().length) {
                  @for (g of gruposForm(); track g.titulo) {
                    @if (g.campos.length) {
                      <h3 class="mt-4 text-xs font-extrabold uppercase tracking-wide text-foreground">{{ g.titulo }}</h3>
                      <dl class="mt-2 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                        @for (c of g.campos; track c.id) {
                          <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{{ c.etiqueta }}@if (c.obligatorio) { <span> *</span> }</dt>
                            <dd class="mt-0.5 text-sm font-semibold">{{ respuestaDe(s, c) }}</dd></div>
                        }
                      </dl>
                    }
                  }
                } @else { <p class="mt-3 text-sm text-muted-foreground">No hay campos adicionales configurados.</p> }
              </section>
            </div>
          }
          @case ('compras') {
            <h2 class="mb-2 font-semibold">Compras de beneficios</h2>
            <a-barra-lista [lista]="pedidos" etiqueta="pedidos" placeholder="Código o artículo" [filtros]="[{ k: 'estado', l: 'Estado' }]" (exportar)="exportarPedidos()" />
            <div class="adm-wrap">
              <table class="adm-table" aria-label="Compras de beneficios">
                <thead><tr><th aOrden="codigo" [pag]="pedidos" etiquetaOrden="Código">Código</th><th aOrden="estado" [pag]="pedidos" etiquetaOrden="Estado">Estado</th><th aOrden="fecha" [pag]="pedidos" etiquetaOrden="Fecha">Fecha</th><th aOrden="pago" [pag]="pedidos" etiquetaOrden="Pago">Pago</th><th>Artículos</th></tr></thead>
                <tbody>
                  @for (c of pedidos.items(); track c.codigo) {
                    <tr>
                      <td><a routerLink="/admin/pedidos" [queryParams]="{ ver: c.codigo }" class="font-bold text-primary hover:underline" [attr.aria-label]="'Ver el pedido ' + c.codigo">{{ c.codigo }}</a></td>
                      <td class="det-completo det-chip"><a-pill>{{ c.estadoAdmin }}</a-pill></td>
                      <td>{{ c.fecha }}@if ($any(c).hora) { · {{ $any(c).hora }} }</td>
                      <td>{{ pago(c) }}</td>
                      <td class="adm-ancha">{{ resumenItems(c) }}</td>
                    </tr>
                  } @empty { <tr><td colspan="5" class="adm-empty">{{ act().pedidos.length ? 'Ningún pedido coincide con la búsqueda.' : 'Este participante no tiene pedidos.' }}</td></tr> }
                </tbody>
              </table>
            </div>
            <a-pager [p]="pedidos" />
          }
          @case ('beneficios') {
            <a-barra-lista [lista]="benefs" etiqueta="beneficios" placeholder="Beneficio, marca o cupón" [filtros]="[{ k: 'estado', l: 'Estado', opciones: opcionesEstadoBenef }]" (exportar)="exportarBenefs()" />
            <ul class="space-y-3">
              @for (x of benefs.items(); track x.mb.id) {
                <li class="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  @if (x.b) { <img [src]="x.b.imagen" alt="" class="h-12 w-16 rounded-lg object-cover" /> }
                  <div class="min-w-0 flex-1">
                    @if (x.b) { <a routerLink="/admin/beneficios" [queryParams]="{ ver: x.b.id }" class="block truncate font-semibold text-primary hover:underline" [attr.aria-label]="'Ver el beneficio ' + x.b.nombre">{{ x.b.nombre }}</a> }
                    <p class="text-xs text-muted-foreground">{{ x.b?.marca }} · Cupón {{ x.mb.codigo }} · {{ x.mb.fecha }}</p>
                  </div>
                  <a-pill [tone]="x.mb.estado === 'activo' ? 'ok' : x.mb.estado === 'usado' ? 'muted' : 'bad'">{{ estadoLabels[x.mb.estado] }}</a-pill>
                </li>
              } @empty { <li class="rounded-xl bg-card p-6 text-center text-muted-foreground">{{ act().beneficios.length ? 'Ningún cupón coincide con la búsqueda.' : 'Este participante no ha generado cupones.' }}</li> }
            </ul>
            <a-pager [p]="benefs" />
          }
          @case ('historial') {
            <p class="mb-3 text-sm text-muted-foreground">Cambios del panel que mencionan a este participante: ajustes, correo de acceso, códigos reenviados y bloqueos.</p>
            <a-barra-lista [lista]="historial" etiqueta="historial" placeholder="Buscar en los cambios" [filtros]="[{ k: 'usuario', l: 'Usuario' }]" (exportar)="exportarHistorial()" />
            <ul class="divide-y divide-border rounded-2xl bg-card px-5 shadow-[var(--shadow-card)]">
              @for (a of historial.items(); track $index) {
                <li class="py-3 text-sm"><p>{{ a.accion }}</p><p class="text-xs text-muted-foreground">{{ a.fecha }} · {{ a.usuario }}</p></li>
              } @empty { <li class="py-6 text-center text-muted-foreground">{{ act().auditoria.length ? 'Ningún cambio coincide con la búsqueda.' : 'Todavía no hay cambios registrados para este participante.' }}</li> }
            </ul>
            <a-pager [p]="historial" />
          }
          @case ('nivel') {
            <section class="max-w-xl rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
              <h2 class="font-semibold">Nivel del participante</h2>
              <p class="mt-1 text-sm text-muted-foreground">El nivel corresponde al segmento que asigna el banco. Al cambiarlo, el participante recibe un aviso por correo.</p>
              <a-field label="Nivel" class="mt-4">
                <select [class]="input" [value]="nivelSel() || s.nivel" (change)="nivelSel.set($any($event.target).value)">
                  @for (n of catalog.niveles(); track n.id) { <option [value]="n.nombre" [selected]="n.nombre === (nivelSel() || s.nivel)">{{ n.nombre }}</option> }
                </select>
              </a-field>
              <button aBtn class="mt-3" [disabled]="!nivelSel() || nivelSel() === s.nivel" (click)="confirm.set('nivel')">Guardar nivel</button>
            </section>
          }
        }
      </div>
    } @else if (cargado()) {
      <div class="mt-10 rounded-2xl bg-card p-10 text-center shadow-[var(--shadow-card)]">
        <h1 class="text-xl font-bold">No encontramos a este participante</h1>
        <a routerLink="/admin/participantes" class="mt-4 inline-block font-semibold text-primary hover:underline">Volver a Participantes</a>
      </div>
    }

    <a-confirm [open]="confirm() === 'nivel'" title="Confirmar cambio de nivel" confirmLabel="Guardar" (closed)="confirm.set(null)" (confirmed)="aplicarNivel()">
      @if (f(); as s) { Se cambiará el nivel de {{ s.nombre }} de <b class="text-foreground">{{ s.nivel }}</b> a <b class="text-foreground">{{ nivelSel() }}</b>. }
    </a-confirm>
    <a-confirm [open]="confirm() === 'estado'" [danger]="f()?.estado === 'Activo'" [title]="f()?.estado === 'Activo' ? '¿Bloquear esta cuenta?' : '¿Activar esta cuenta?'"
      [confirmLabel]="f()?.estado === 'Activo' ? 'Bloquear' : 'Activar'" (closed)="confirm.set(null)" (confirmed)="cambiarEstado()">
      {{ f()?.estado === 'Activo' ? f()?.nombre + ' no podrá ingresar a la web ni a la app ni comprar beneficios hasta que se reactive.' : f()?.nombre + ' podrá volver a ingresar y canjear.' }}
    </a-confirm>
    <a-confirm [open]="!!confirm()?.startsWith('dir:')" [danger]="true" title="¿Eliminar dirección?" confirmLabel="Eliminar" (closed)="confirm.set(null)" (confirmed)="eliminarDireccion()">
      La dirección dejará de estar disponible.
    </a-confirm>
    <a-modal [open]="cambioCorreo() !== null" title="Cambiar correo de acceso" (closed)="cambioCorreo.set(null)">
      @if (f(); as s) {
        <div class="space-y-4">
          <p class="text-sm text-muted-foreground">
            A este correo llegan los códigos con los que <b class="text-foreground">{{ s.nombre }}</b> ingresa. Después del cambio los códigos nuevos irán solo al correo nuevo. El cambio queda registrado en Auditoría.
          </p>
          <p class="rounded-xl bg-muted/60 p-3 text-sm">Correo actual: <b>{{ s.email }}</b></p>
          <a-field label="Correo nuevo">
            <input [class]="input" type="email" autocomplete="off" placeholder="nombre@correo.com" [attr.aria-invalid]="!!errorCorreo()"
              [value]="cambioCorreo() ?? ''" (input)="cambioCorreo.set($any($event.target).value); errorCorreo.set('')" (keydown.enter)="confirmarCorreo()" />
          </a-field>
          @if (errorCorreo()) { <p role="alert" class="text-sm font-semibold text-destructive">{{ errorCorreo() }}</p> }
          <div class="flex justify-end gap-2">
            <button aBtn variant="outline" (click)="cambioCorreo.set(null)">Cancelar</button>
            <button aBtn [disabled]="!(cambioCorreo() ?? '').trim()" (click)="confirmarCorreo()">Cambiar correo</button>
          </div>
        </div>
      }
    </a-modal>
  `,
})
export class ParticipanteFichaPage {
  /** Viene de la ruta /admin/participantes/:id */
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);
  private readonly catalog = inject(CatalogService);
  private readonly brand = inject(BrandService);
  private readonly session = inject(AdminSession);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly toast = inject(ToastService);
  protected readonly input = INPUT_CLS;
  protected readonly usd = formatUSD;
  protected readonly estadoLabels = estadoLabels;
  protected readonly tabs = TABS;

  protected readonly f = signal<Ficha | null>(null);
  protected readonly cargado = signal(false);
  protected readonly tiposLegales = TIPOS_LEGALES.map((k) => ({ k, l: NOMBRE_LEGAL[k] }));
  protected pendienteLegal(t: TipoLegal) {
    return !!this.act().legales?.pendientes.some((p) => p.tipo === t);
  }
  protected readonly act = signal<Actividad>({ pedidos: [], beneficios: [], auditoria: [] });
  protected readonly datos = signal({ nombre: '', celular: '' });
  protected readonly confirm = signal<string | null>(null);
  protected readonly nivelSel = signal('');
  protected readonly cambioCorreo = signal<string | null>(null);
  protected readonly errorCorreo = signal('');

  /** La pestaña activa vive en la URL (?tab=movimientos): se puede compartir el enlace y el botón atrás funciona. */
  private readonly tabParam = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('tab'))), { initialValue: null });
  protected readonly tab = computed<TabK>(() => (TABS.find((t) => t.k === this.tabParam())?.k ?? 'resumen') as TabK);

  protected readonly misBeneficios = computed(() => this.act().beneficios.map((mb) => ({ mb, b: this.catalog.beneficioPorId(mb.beneficioId) })));

  /* ---- Búsqueda, filtros, exportación y paginación de cada sección (la actividad del participante ya está en el navegador) ---- */
  private static iso(f: string): string {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(f ?? '');
    return m ? `${m[3]}-${m[2]}-${m[1]}` : (f ?? '').slice(0, 10);
  }
  protected readonly opcionesEstadoBenef = Object.entries(estadoLabels).map(([v, l]) => ({ v, l: String(l) }));

  protected readonly pedidos = new ListaLocal<Pedido>(() => this.act().pedidos, {
    texto: (p) => `${p.codigo} ${this.resumenItems(p)}`,
    filtros: { estado: (p) => p.estadoAdmin },
    campos: { codigo: (p) => p.codigo, fecha: (p) => (p as { fechaISO?: string }).fechaISO ?? '', pago: (p) => p.montoUSD, estado: (p) => p.estadoAdmin },
    fecha: (p) => (p as { fechaISO?: string }).fechaISO ?? '',
    orden: { k: 'fecha', dir: 'desc' },
  });
  protected readonly benefs = new ListaLocal<{ mb: BeneficioUsuario; b: ReturnType<CatalogService['beneficioPorId']> }>(() => this.misBeneficios(), {
    texto: (x) => `${x.b?.nombre ?? ''} ${x.b?.marca ?? ''} ${x.mb.codigo}`,
    filtros: { estado: (x) => x.mb.estado },
  });
  protected readonly historial = new ListaLocal<Auditoria>(() => this.act().auditoria, {
    texto: (a) => `${a.accion} ${a.usuario}`,
    filtros: { usuario: (a) => a.usuario },
  });

  private exportar(nombre: string, cabecera: string[], filas: (string | number)[][]) {
    descargarTabla(`${this.f()?.id ?? 'participante'}-${nombre}`, [cabecera, ...filas], `${nombre.replace(/-/g, ' ')} de ${this.f()?.nombre ?? 'participante'}`);
  }
  protected exportarPedidos() {
    this.exportar('pedidos', ['Código', 'Fecha', 'Beneficios', 'Monto', 'Estado'], this.pedidos.filtrados().map((p) => [p.codigo, p.fecha, this.resumenItems(p), p.montoUSD, p.estadoAdmin]));
  }
  protected exportarBenefs() {
    this.exportar('beneficios', ['Beneficio', 'Marca', 'Cupón', 'Fecha', 'Estado'], this.benefs.filtrados().map((x) => [x.b?.nombre ?? '', x.b?.marca ?? '', x.mb.codigo, x.mb.fecha, estadoLabels[x.mb.estado]]));
  }
  protected exportarHistorial() {
    this.exportar('historial', ['Fecha', 'Usuario', 'Cambio'], this.historial.filtrados().map((a) => [a.fecha, a.usuario, a.accion]));
  }

  constructor() {
    queueMicrotask(() => this.cargar());
  }

  private cargar() {
    const id = this.id();
    this.api.get<Ficha>(`admin/c/participantes/${id}`).subscribe({
      next: (p) => {
        this.f.set(p);
        this.datos.set({ nombre: p.nombre, celular: p.celular });
        this.cargado.set(true);
        this.cargarActividad();
      },
      error: () => this.cargado.set(true),
    });
  }
  private cargarActividad() {
    this.api.get<Actividad>(`admin/participantes/${this.id()}/actividad`).subscribe((a) => this.act.set(a));
  }

  protected irA(k: TabK) {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: k === 'resumen' ? null : k }, queryParamsHandling: 'merge', replaceUrl: false });
  }
  protected cuenta(k: TabK): number | null {
    const a = this.act();
    switch (k) {
      case 'compras': return a.pedidos.length;
      case 'beneficios': return a.beneficios.length;
      case 'historial': return a.auditoria.length;
      case 'nivel': return null;
      default: return null;
    }
  }
  protected abs(n: number) {
    return Math.abs(n);
  }
  protected resumenItems(c: Pedido) {
    return c.items.map((i) => (i.cantidad > 1 ? `${i.cantidad} × ${i.nombre}` : i.nombre)).join(', ');
  }
  protected pago(c: Pedido) {
    return c.montoUSD ? formatUSD(c.montoUSD) : '—';
  }

  protected setDato(k: 'nombre' | 'celular', e: Event) {
    this.datos.update((d) => ({ ...d, [k]: (e.target as HTMLInputElement).value }));
  }
  protected setCelular(v: string) {
    this.datos.update((d) => ({ ...d, celular: v }));
  }
  /* Validación de lo que el panel edita (las mismas reglas que Mis datos en el sitio). */
  protected readonly intento = signal(false);
  protected readonly errNombre = computed(() => validarNombrePersona(this.datos().nombre, "El nombre", true));
  protected readonly errCelular = computed(() => validarTelefono(this.datos().celular, this.brand.pais().telefonoDigitos, this.brand.pais().telefonoPrefijo, true));
  private patch(p: Partial<Ficha>, tras?: () => void) {
    const s = this.f();
    if (!s) return;
    const nuevo = { ...s, ...p };
    this.f.set(nuevo);
    this.api.put(`admin/c/participantes/${nuevo.id}`, nuevo).subscribe(() => {
      this.cargarActividad();
      tras?.();
    });
  }
  /** Campos que el admin configuró en Formulario de datos y la respuesta de este participante a cada uno. */
  protected readonly camposForm = computed(() => this.catalog.config()?.formulario ?? []);
  protected readonly gruposForm = computed(() => {
    const g = agruparCampos(this.camposForm());
    return [{ titulo: "Datos personales", campos: g.personal }, { titulo: "Contacto", campos: g.contacto }, { titulo: "Ubicación", campos: g.ubicacion }, { titulo: "Otros datos", campos: g.otros }];
  });
  /** La respuesta como se lee mejor: la fecha de nacimiento con día/mes/año y edad. */
  protected respuestaDe(s: Ficha, c: { id: string; mapeo?: string | undefined; etiqueta: string; tipo: string }): string {
    const r = this.respuesta(s, c.id);
    if (c.mapeo === 'fecha_nacimiento' && /^\d{4}-\d{2}-\d{2}$/.test(r)) return `${r.split('-').reverse().join('/')} (${edadA(r)} años)`;
    return r;
  }
  protected respuesta(s: Ficha, id: string): string {
    const v = (s as { extra?: Record<string, string | boolean> }).extra?.[id];
    return v === undefined || v === '' ? 'Sin responder' : v === true ? 'Sí' : v === false ? 'No' : String(v);
  }
  protected readonly origenNovedades = { participante: 'lo cambió la persona', enlace: 'enlace del correo', admin: 'panel de administración' } as const;
  protected cambiarNovedades(recibe: boolean) {
    this.patch({ recibeNovedades: recibe, novedadesCambio: { fecha: new Date().toISOString().slice(0, 19).replace('T', ' '), origen: 'admin' } });
    this.toast.show(recibe ? 'Volverá a recibir novedades' : 'No recibirá novedades por correo');
  }
  protected guardarDatos() {
    this.intento.set(true);
    if (this.errNombre() || this.errCelular()) { this.toast.error("Revisa los datos marcados antes de guardar."); return; }
    this.patch({ nombre: this.datos().nombre.trim(), celular: this.datos().celular });
    this.toast.show('Datos actualizados');
  }
  protected aplicarNivel() {
    const s = this.f();
    if (!s || !this.nivelSel()) return;
    this.patch({ nivel: this.nivelSel() });
    this.nivelSel.set('');
    this.confirm.set(null);
    this.toast.show('Nivel actualizado y registrado');
  }
  protected cambiarEstado() {
    const s = this.f();
    if (!s) return;
    const bloquear = s.estado === 'Activo';
    this.patch({ estado: bloquear ? 'Bloqueado' : 'Activo' }, () =>
      this.api.post('admin/auditoria', { seccion: 'Participantes', accion: `${bloquear ? 'Bloqueó' : 'Activó'} la cuenta de ${s.nombre}`, usuario: this.session.usuario()?.nombre }).subscribe(() => this.cargarActividad()),
    );
    this.toast.show(bloquear ? 'Cuenta bloqueada' : 'Cuenta activada');
  }
  protected eliminarDireccion() {
    const s = this.f();
    const id = this.confirm()?.slice(4);
    if (!s || !id) return;
    this.patch({ direcciones: s.direcciones.filter((d) => d.id !== id) });
    this.toast.show('Dirección eliminada');
  }

  /* ---- acceso a la cuenta ---- */
  private enmascarar(correo: string) {
    const [n = '', d = ''] = correo.split('@');
    return `${n.slice(0, 2)}${'*'.repeat(Math.max(3, n.length - 2))}@${d}`;
  }
  protected reenviarCodigo() {
    const s = this.f();
    if (!s) return;
    this.api.post<{ correo: string }>(`admin/participantes/${s.id}/codigo`, { por: this.session.usuario()?.nombre }).subscribe({
      next: (r) => {
        this.toast.show(`Código de acceso enviado a ${this.enmascarar(r.correo)}`);
        this.cargarActividad();
      },
      error: (e) => this.toast.error(e?.error?.message ?? 'No se pudo enviar el código.'),
    });
  }
  protected abrirCambioCorreo() {
    this.errorCorreo.set('');
    this.cambioCorreo.set('');
  }
  protected confirmarCorreo() {
    const s = this.f();
    const email = (this.cambioCorreo() ?? '').trim();
    if (!s) return;
    this.api.post<Ficha>(`admin/participantes/${s.id}/correo`, { email, por: this.session.usuario()?.nombre }).subscribe({
      next: (p) => {
        this.f.set(p);
        this.cambioCorreo.set(null);
        this.cargarActividad();
        this.toast.show(`Correo de acceso actualizado: ahora los códigos llegan a ${this.enmascarar(p.email)}`);
      },
      error: (e) => this.errorCorreo.set(e?.error?.message ?? 'No se pudo cambiar el correo.'),
    });
  }
}
