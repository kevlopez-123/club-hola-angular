import { inject } from "@angular/core";
import { toObservable } from "@angular/core/rxjs-interop";
import { CanActivateChildFn, Router, Routes } from "@angular/router";
import { filter, firstValueFrom, merge } from "rxjs";
import { CatalogService } from "./core/catalog.service";
import { SiteLayoutComponent } from "./shared/layout";

import { participanteGuard, sitioCerradoGuard } from "./core/participante.guard";

/** Bloquea las rutas que el admin deshabilitó en el menú. */
const rutaHabilitada: CanActivateChildFn = async (_ruta, estado) => {
  const catalogo = inject(CatalogService);
  const router = inject(Router);
  // Espera la configuración del menú; si el API falla no se queda esperando para siempre (la pantalla muestra su estado de error).
  if (!catalogo.config() && !catalogo.errorCarga()) {
    await firstValueFrom(merge(toObservable(catalogo.config), toObservable(catalogo.errorCarga)).pipe(filter(Boolean)));
  }
  return catalogo.rutaHabilitada(estado.url.split("?")[0]!) ? true : router.parseUrl("/");
};

const catalog = () => import("./pages/catalog-pages");
const account = () => import("./pages/account-pages");
const checkout = () => import("./pages/checkout-pages");
const profile = () => import("./pages/profile-pages");
const info = () => import("./pages/info-pages");
const games = () => import("./pages/games-pages");
const events = () => import("./pages/events-pages");

const general = () => import("./admin/pages-general");
const operacion = () => import("./admin/pages-operacion");
const catalogos = () => import("./admin/pages-catalogos");
const contenido = () => import("./admin/pages-contenido");
const adminTitle = (t: string) => `${t} · Panel Banco Solidario Puntos`;

export const routes: Routes = [
  { path: "login", title: "Ingresar | Banco Solidario Puntos", loadComponent: () => profile().then((m) => m.LoginPage) },

  {
    path: "admin",
    loadComponent: () => import("./admin/admin-shell").then((m) => m.AdminLayoutComponent),
    children: [
      { path: "", pathMatch: "full", title: adminTitle("Dashboard"), loadComponent: () => import("./admin/pages-dashboard").then((m) => m.DashboardPage) },
      { path: "reportes", title: adminTitle("Reportes"), loadComponent: () => import("./admin/pages-reportes").then((m) => m.ReportesPage) },
      { path: "importaciones", title: adminTitle("Importaciones"), loadComponent: () => import("./admin/pages-importaciones").then((m) => m.ImportacionesPage) },
      { path: "niveles", title: adminTitle("Niveles"), loadComponent: () => general().then((m) => m.NivelesPage) },
      { path: "configuracion", title: adminTitle("Configuración"), loadComponent: () => general().then((m) => m.ConfiguracionPage) },
      { path: "atencion", title: adminTitle("Atención"), loadComponent: () => general().then((m) => m.AtencionPage) },
      { path: "correos", title: adminTitle("Correos"), loadComponent: () => import("./admin/pages-correos").then((m) => m.CorreosPage) },
      { path: "perfil", title: adminTitle("Mi perfil"), loadComponent: () => import("./admin/pages-perfil").then((m) => m.PerfilAdminPage) },
      { path: "popups", title: adminTitle("Pop-ups"), loadComponent: () => import("./admin/pages-popups").then((m) => m.PopupsPage) },
      { path: "ayuda", title: adminTitle("Centro de ayuda"), loadComponent: () => import("./admin/pages-ayuda").then((m) => m.AyudaPage) },
      { path: "legales", title: adminTitle("Textos legales"), loadComponent: () => import("./admin/pages-legales").then((m) => m.LegalesPage) },
      { path: "usuarios", title: adminTitle("Usuarios"), loadComponent: () => general().then((m) => m.UsuariosPage) },
      { path: "roles", title: adminTitle("Roles"), loadComponent: () => general().then((m) => m.RolesPage) },
      { path: "auditoria", title: adminTitle("Registro de cambios"), loadComponent: () => general().then((m) => m.AuditoriaPage) },
      { path: "participantes", title: adminTitle("Participantes"), loadComponent: () => operacion().then((m) => m.ParticipantesPage) },
      { path: "participantes/:id", title: adminTitle("Ficha del participante"), loadComponent: () => import("./admin/pages-participante").then((m) => m.ParticipanteFichaPage) },
      { path: "pedidos", title: adminTitle("Pedidos"), loadComponent: () => operacion().then((m) => m.PedidosPage) },
      { path: "beneficios", title: adminTitle("Beneficios"), loadComponent: () => catalogos().then((m) => m.BeneficiosAdminPage) },
      { path: "eventos", title: adminTitle("Eventos"), loadComponent: () => import("./admin/pages-eventos").then((m) => m.EventosAdminPage) },
      { path: "pre-inscripciones", title: adminTitle("Pre-inscripciones"), loadComponent: () => import("./admin/pages-eventos").then((m) => m.PreinscripcionesAdminPage) },
      { path: "ruleta", title: adminTitle("Ruleta"), loadComponent: () => import("./admin/pages-juegos").then((m) => m.RuletaAdminPage) },
      { path: "codigos", title: adminTitle("Lucky Code"), loadComponent: () => import("./admin/pages-juegos").then((m) => m.CodigosAdminPage) },
      { path: "marcas", title: adminTitle("Marcas aliadas"), loadComponent: () => import("./admin/pages-aliadas").then((m) => m.MarcasAdminPage) },
      { path: "marcas/:id", title: adminTitle("Ficha de la marca"), loadComponent: () => import("./admin/pages-marca-ficha").then((m) => m.MarcaFichaPage) },
      { path: "contenido", title: adminTitle("Contenido"), loadComponent: () => contenido().then((m) => m.ContenidoPage) },
      { path: "formulario", title: adminTitle("Formulario de datos"), loadComponent: () => contenido().then((m) => m.FormularioPage) },
    ],
  },

  {
    path: "",
    component: SiteLayoutComponent,
    canActivateChild: [sitioCerradoGuard, rutaHabilitada],
    children: [
      { path: "", pathMatch: "full", title: "Banco Solidario Puntos | Accede a beneficios y descuentos", loadComponent: () => catalog().then((m) => m.HomePage) },

      { path: "beneficios", title: "Beneficios Banco Solidario | Descuentos exclusivos para tarjetahabientes", loadComponent: () => catalog().then((m) => m.BeneficiosPage) },
      { path: "beneficios/:id", title: "Beneficio | Banco Solidario Puntos", loadComponent: () => catalog().then((m) => m.BeneficioDetallePage) },
      { path: "buscar", title: "Resultados de búsqueda | Banco Solidario Puntos", loadComponent: () => catalog().then((m) => m.BuscarPage) },
      { path: "favoritos", canActivate: [participanteGuard], title: "Mis favoritos | Banco Solidario Puntos", loadComponent: () => catalog().then((m) => m.FavoritosPage) },

      { path: "carrito", canActivate: [participanteGuard], title: "Tu carrito | Banco Solidario Puntos", loadComponent: () => checkout().then((m) => m.CarritoPage) },
      { path: "gracias", canActivate: [participanteGuard], title: "¡Gracias por tu compra! | Banco Solidario Puntos", loadComponent: () => checkout().then((m) => m.GraciasPage) },

      { path: "mi-nivel", canActivate: [participanteGuard], title: "Mi nivel | Banco Solidario Puntos", loadComponent: () => account().then((m) => m.MiNivelPage) },
      { path: "notificaciones", canActivate: [participanteGuard], title: "Notificaciones | Banco Solidario Puntos", loadComponent: () => account().then((m) => m.NotificacionesPage) },
      { path: "mis-beneficios", canActivate: [participanteGuard], title: "Mis beneficios | Banco Solidario Puntos", loadComponent: () => account().then((m) => m.MisBeneficiosPage) },
      { path: "eventos", canActivate: [participanteGuard], title: "Eventos | Experiencias exclusivas", loadComponent: () => events().then((m) => m.EventosPage) },
      { path: "eventos/mis-inscripciones", canActivate: [participanteGuard], title: "Mis pre-inscripciones | Eventos", loadComponent: () => events().then((m) => m.MisInscripcionesPage) },
      { path: "eventos/:id", canActivate: [participanteGuard], title: "Evento | Club Hola", loadComponent: () => events().then((m) => m.EventoDetallePage) },
      { path: "spin-win", canActivate: [participanteGuard], title: "Spin & Win | Gira la ruleta ganadora", loadComponent: () => games().then((m) => m.SpinWinPage) },
      { path: "lucky-code", canActivate: [participanteGuard], title: "Lucky Code | Valida tu código promocional", loadComponent: () => games().then((m) => m.LuckyCodePage) },
      { path: "mis-compras", canActivate: [participanteGuard], title: "Historial de compras | Banco Solidario Puntos", loadComponent: () => account().then((m) => m.MisComprasPage) },
      { path: "mis-compras/:codigo", canActivate: [participanteGuard], title: "Detalle de compra | Banco Solidario Puntos", loadComponent: () => account().then((m) => m.DetalleCompraPage) },

      { path: "perfil", canActivate: [participanteGuard], title: "Mi perfil | Banco Solidario Puntos", loadComponent: () => profile().then((m) => m.PerfilPage) },
      { path: "contacto", canActivate: [participanteGuard], title: "Contáctanos | Banco Solidario Puntos", loadComponent: () => profile().then((m) => m.ContactoPage) },


      { path: "preguntas-frecuentes", title: "Preguntas frecuentes | Banco Solidario Puntos", loadComponent: () => info().then((m) => m.FaqPage) },
      { path: "terminos", title: "Términos y condiciones | Banco Solidario Puntos", loadComponent: () => info().then((m) => m.TerminosPage) },
      { path: "privacidad", title: "Política de privacidad | Banco Solidario Puntos", loadComponent: () => info().then((m) => m.PrivacidadPage) },

      { path: "baja", title: "Novedades por correo | Banco Solidario Puntos", loadComponent: () => info().then((m) => m.BajaPage) },

      { path: "**", title: "Página no encontrada | Banco Solidario", loadComponent: () => info().then((m) => m.NotFoundPage) },
    ],
  },
];
