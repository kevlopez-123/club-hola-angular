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
const points = () => import("./pages/points-pages");
const checkout = () => import("./pages/checkout-pages");
const profile = () => import("./pages/profile-pages");
const flights = () => import("./pages/flights-pages");
const info = () => import("./pages/info-pages");

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
      { path: "movimientos", title: adminTitle("Movimientos de puntos"), loadComponent: () => general().then((m) => m.MovimientosPage) },
      { path: "niveles", title: adminTitle("Niveles"), loadComponent: () => general().then((m) => m.NivelesPage) },
      { path: "reglas", title: adminTitle("Reglas de puntos"), loadComponent: () => general().then((m) => m.ReglasPage) },
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
      { path: "compras-puntos", title: adminTitle("Compras de puntos"), loadComponent: () => operacion().then((m) => m.ComprasPuntosPage) },
      { path: "pedidos", title: adminTitle("Pedidos"), loadComponent: () => operacion().then((m) => m.PedidosPage) },
      { path: "cotizaciones", title: adminTitle("Cotizaciones de vuelos"), loadComponent: () => operacion().then((m) => m.CotizacionesAdminPage) },
      { path: "productos", title: adminTitle("Productos"), loadComponent: () => catalogos().then((m) => m.ProductosAdminPage) },
      { path: "beneficios", title: adminTitle("Beneficios"), loadComponent: () => catalogos().then((m) => m.BeneficiosAdminPage) },
      { path: "marcas", title: adminTitle("Marcas aliadas"), loadComponent: () => import("./admin/pages-aliadas").then((m) => m.MarcasAdminPage) },
      { path: "marcas/:id", title: adminTitle("Ficha de la marca"), loadComponent: () => import("./admin/pages-marca-ficha").then((m) => m.MarcaFichaPage) },
      { path: "destinos", title: adminTitle("Destinos"), loadComponent: () => catalogos().then((m) => m.DestinosAdminPage) },
      { path: "contenido", title: adminTitle("Contenido"), loadComponent: () => contenido().then((m) => m.ContenidoPage) },
      { path: "formulario", title: adminTitle("Formulario de datos"), loadComponent: () => contenido().then((m) => m.FormularioPage) },
    ],
  },

  {
    path: "",
    component: SiteLayoutComponent,
    canActivateChild: [sitioCerradoGuard, rutaHabilitada],
    children: [
      { path: "", pathMatch: "full", title: "Banco Solidario Puntos | Canjea tus puntos y accede a descuentos", loadComponent: () => catalog().then((m) => m.HomePage) },

      { path: "canjea", title: "Canjea tus puntos | Catálogo de productos Banco Solidario", loadComponent: () => catalog().then((m) => m.CanjeaPage) },
      { path: "canjea/:id", title: "Canjea tus puntos | Banco Solidario", loadComponent: () => catalog().then((m) => m.ProductoDetallePage) },
      { path: "beneficios", title: "Beneficios Banco Solidario | Descuentos exclusivos para tarjetahabientes", loadComponent: () => catalog().then((m) => m.BeneficiosPage) },
      { path: "beneficios/:id", title: "Beneficio | Banco Solidario Puntos", loadComponent: () => catalog().then((m) => m.BeneficioDetallePage) },
      { path: "buscar", title: "Resultados de búsqueda | Banco Solidario Puntos", loadComponent: () => catalog().then((m) => m.BuscarPage) },
      { path: "favoritos", canActivate: [participanteGuard], title: "Mis favoritos | Banco Solidario Puntos", loadComponent: () => catalog().then((m) => m.FavoritosPage) },

      { path: "carrito", canActivate: [participanteGuard], title: "Tu carrito | Banco Solidario Puntos", loadComponent: () => checkout().then((m) => m.CarritoPage) },
      { path: "gracias", canActivate: [participanteGuard], title: "¡Gracias por tu canje! | Banco Solidario Puntos", loadComponent: () => checkout().then((m) => m.GraciasPage) },

      { path: "mi-nivel", canActivate: [participanteGuard], title: "Mi nivel | Banco Solidario Puntos", loadComponent: () => account().then((m) => m.MiNivelPage) },
      { path: "notificaciones", canActivate: [participanteGuard], title: "Notificaciones | Banco Solidario Puntos", loadComponent: () => account().then((m) => m.NotificacionesPage) },
      { path: "mis-beneficios", canActivate: [participanteGuard], title: "Mis beneficios | Banco Solidario Puntos", loadComponent: () => account().then((m) => m.MisBeneficiosPage) },
      { path: "mis-compras", canActivate: [participanteGuard], title: "Historial de compras | Banco Solidario Puntos", loadComponent: () => account().then((m) => m.MisComprasPage) },
      { path: "mis-compras/:codigo", canActivate: [participanteGuard], title: "Detalle de compra | Banco Solidario Puntos", loadComponent: () => account().then((m) => m.DetalleCompraPage) },
      { path: "mis-puntos/historial", canActivate: [participanteGuard], title: "Historial de puntos | Banco Solidario Puntos", loadComponent: () => account().then((m) => m.HistorialPuntosPage) },
      { path: "mis-puntos/compra", canActivate: [participanteGuard], title: "Compra de puntos | Banco Solidario Puntos", loadComponent: () => points().then((m) => m.CompraPuntosPage) },

      { path: "perfil", canActivate: [participanteGuard], title: "Mi perfil | Banco Solidario Puntos", loadComponent: () => profile().then((m) => m.PerfilPage) },
      { path: "contacto", canActivate: [participanteGuard], title: "Contáctanos | Banco Solidario Puntos", loadComponent: () => profile().then((m) => m.ContactoPage) },

      { path: "vuelos", title: "Vuelos | Cotiza tu ticket aéreo", loadComponent: () => flights().then((m) => m.VuelosPage) },
      { path: "vuelos/cotizaciones", canActivate: [participanteGuard], title: "Historial de cotizaciones de vuelos", loadComponent: () => flights().then((m) => m.CotizacionesPage) },
      { path: "vuelos/destinos/:slug", title: "Destino | Vuelos", loadComponent: () => flights().then((m) => m.DestinoPage) },

      { path: "preguntas-frecuentes", title: "Preguntas frecuentes | Banco Solidario Puntos", loadComponent: () => info().then((m) => m.FaqPage) },
      { path: "terminos", title: "Términos y condiciones | Banco Solidario Puntos", loadComponent: () => info().then((m) => m.TerminosPage) },
      { path: "privacidad", title: "Política de privacidad | Banco Solidario Puntos", loadComponent: () => info().then((m) => m.PrivacidadPage) },

      { path: "baja", title: "Novedades por correo | Banco Solidario Puntos", loadComponent: () => info().then((m) => m.BajaPage) },

      { path: "**", title: "Página no encontrada | Banco Solidario", loadComponent: () => info().then((m) => m.NotFoundPage) },
    ],
  },
];
