import { HttpClient, provideHttpClient, withInterceptors } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { environment } from "../../environments/environment";
import { ConexionService } from "./conexion.service";
import { authInterceptor, erroresInterceptor } from "./http.interceptors";
import { TokenService } from "./token.service";

describe("interceptores HTTP", () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let conexion: ConexionService;
  let token: TokenService;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authInterceptor, erroresInterceptor])), provideHttpClientTesting()] });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    conexion = TestBed.inject(ConexionService);
    token = TestBed.inject(TokenService);
    conexion.sinConexion.set(false);
  });
  afterEach(() => {
    ctrl.verify();
    vi.useRealTimers();
  });

  it("envía el token solo a las peticiones del API (el del participante a las del sitio y el del panel a admin/)", () => {
    token.set("abc", "participante");
    token.set("adm", "admin");
    http.get(`${environment.apiBase}/me`).subscribe();
    http.get("https://otro.test/x").subscribe();
    http.get(`${environment.apiBase}/admin/resumen`).subscribe();
    expect(ctrl.expectOne(`${environment.apiBase}/me`).request.headers.get("Authorization")).toBe("Bearer abc");
    expect(ctrl.expectOne(`${environment.apiBase}/admin/resumen`).request.headers.get("Authorization")).toBe("Bearer adm");
    expect(ctrl.expectOne("https://otro.test/x").request.headers.has("Authorization")).toBe(false);
  });

  it("sin token no agrega el encabezado", () => {
    http.get(`${environment.apiBase}/me`).subscribe();
    expect(ctrl.expectOne(`${environment.apiBase}/me`).request.headers.has("Authorization")).toBe(false);
  });

  it("un 401 del sitio fuera de /auth/ marca sesión del participante vencida y borra su token", () => {
    token.set("abc", "participante");
    http.get(`${environment.apiBase}/me`).subscribe({ error: () => undefined });
    ctrl.expectOne(`${environment.apiBase}/me`).flush({ message: "x" }, { status: 401, statusText: "Unauthorized" });
    expect(conexion.sesionParticipanteVencida()).toBe(true);
    expect(conexion.sesionVencida()).toBe(false);
    expect(token.get("participante")).toBeNull();
  });

  it("un 401 del panel marca la sesión del panel vencida sin tocar la del participante", () => {
    token.set("adm", "admin");
    token.set("part", "participante");
    http.get(`${environment.apiBase}/admin/resumen`).subscribe({ error: () => undefined });
    ctrl.expectOne(`${environment.apiBase}/admin/resumen`).flush({ message: "x" }, { status: 401, statusText: "Unauthorized" });
    expect(conexion.sesionVencida()).toBe(true);
    expect(token.get("admin")).toBeNull();
    expect(token.get("participante")).toBe("part");
  });

  it("un 401 en /auth/ (credenciales incorrectas) NO es sesión vencida", () => {
    conexion.sesionVencida.set(false);
    conexion.sesionParticipanteVencida.set(false);
    http.post(`${environment.apiBase}/auth/admin/login`, {}).subscribe({ error: () => undefined });
    ctrl.expectOne(`${environment.apiBase}/auth/admin/login`).flush({ message: "x" }, { status: 401, statusText: "Unauthorized" });
    expect(conexion.sesionVencida()).toBe(false);
    expect(conexion.sesionParticipanteVencida()).toBe(false);
  });

  it("un 422 se devuelve tal cual, sin avisos globales", () => {
    let status = 0;
    http.post(`${environment.apiBase}/x`, {}).subscribe({ error: (e) => (status = e.status) });
    ctrl.expectOne(`${environment.apiBase}/x`).flush({ message: "mal" }, { status: 422, statusText: "Unprocessable" });
    expect(status).toBe(422);
    expect(conexion.errorServidor()).toBe(false);
  });

  it("una lectura con 503 se reintenta y, si sigue fallando, avisa error de servidor", () => {
    vi.useFakeTimers();
    http.get(`${environment.apiBase}/catalogo/productos`).subscribe({ error: () => undefined });
    for (let i = 0; i <= environment.reintentosLectura; i++) {
      ctrl.expectOne(`${environment.apiBase}/catalogo/productos`).flush("x", { status: 503, statusText: "Unavailable" });
      vi.advanceTimersByTime(5000);
    }
    expect(conexion.errorServidor()).toBe(true);
  });

  it("una escritura (POST) con 503 NO se reintenta", () => {
    http.post(`${environment.apiBase}/ordenes`, {}).subscribe({ error: () => undefined });
    ctrl.expectOne(`${environment.apiBase}/ordenes`).flush("x", { status: 503, statusText: "Unavailable" });
    ctrl.expectNone(`${environment.apiBase}/ordenes`);
  });

  it("una respuesta correcta limpia los avisos", () => {
    conexion.errorServidor.set(true);
    http.get(`${environment.apiBase}/me`).subscribe();
    ctrl.expectOne(`${environment.apiBase}/me`).flush({});
    expect(conexion.errorServidor()).toBe(false);
  });
});