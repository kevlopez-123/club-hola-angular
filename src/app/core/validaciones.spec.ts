import { describe, expect, it } from "vitest";
import { ciudadCoincidente, ciudadesDe } from "./ubicaciones";
import {
  claveValida, requisitosClave, digitosTelefono, edadA, fechaReal, limitesNacimiento, validarEmail, validarFechaNacimiento, validarNombrePersona, validarNumero, validarOpcion, validarTelefono, validarTexto,
} from "./validaciones";
import { erroresPerfil, claveExtra } from "./validar-perfil";

const HOY = "2026-11-09";

describe("fecha de nacimiento", () => {
  it("calcula la edad cumplida", () => {
    expect(edadA("2000-11-09", HOY)).toBe(26);
    expect(edadA("2000-11-10", HOY)).toBe(25);
  });
  it("rechaza fechas inexistentes", () => {
    expect(fechaReal("2001-02-29")).toBe(false);
    expect(fechaReal("2000-02-29")).toBe(true);
    expect(validarFechaNacimiento("2001-02-29", false, HOY)).toBe("Escribe una fecha válida.");
  });
  it("rechaza futuras, menores de 18 y mayores de 110", () => {
    expect(validarFechaNacimiento("2027-01-01", false, HOY)).toMatch(/futura/);
    expect(validarFechaNacimiento("2010-01-01", false, HOY)).toMatch(/al menos 18/);
    expect(validarFechaNacimiento("1900-01-01", false, HOY)).toMatch(/110/);
  });
  it("acepta exactamente 18 años y respeta lo obligatorio", () => {
    expect(validarFechaNacimiento("2008-11-09", false, HOY)).toBe("");
    expect(validarFechaNacimiento("", true, HOY)).toMatch(/Indica/);
    expect(validarFechaNacimiento("", false, HOY)).toBe("");
  });
  it("los límites del selector coinciden con las reglas", () => {
    const l = limitesNacimiento(HOY);
    expect(l.max).toBe("2008-11-09");
    expect(l.min).toBe("1916-11-09");
  });
});

describe("otros campos", () => {
  it("nombres: letras, tildes, ñ, apóstrofo y guion; largo 2 a 60", () => {
    for (const ok of ["Ana", "María José", "O'Brien", "Núñez-Peña", "Jean-Luc"]) expect(validarNombrePersona(ok, "Tus nombres"), ok).toBe("");
    for (const mal of ["", "A", "Ana123", "Ana_", "<b>x</b>", "x".repeat(61)]) expect(validarNombrePersona(mal, "Tus nombres"), mal).not.toBe("");
  });
  it("teléfono: acepta prefijo y 0 local, exige los dígitos del país", () => {
    for (const ok of ["996543210", "0996543210", "+593 99 654 3210", "099-654-3210", "(099) 654 3210"]) expect(validarTelefono(ok, 9, "+593"), ok).toBe("");
    expect(digitosTelefono("+593 99 654 3210", "+593", 9)).toBe("996543210");
    expect(validarTelefono("99654", 9, "+593")).toMatch(/faltan 4/);
    expect(validarTelefono("99654321098", 9, "+593")).toMatch(/sobran/);
    expect(validarTelefono("99654abc1", 9, "+593")).toMatch(/solo puede llevar números/);
    expect(validarTelefono("999999999", 9, "+593")).toMatch(/repetir/);
    expect(validarTelefono("", 9, "+593", false)).toBe("");
  });
  it("correo, texto, número y opción", () => {
    expect(validarEmail("ana@correo.com")).toBe("");
    for (const mal of ["", "ana", "ana@", "ana@x", "a b@c.com", "a@b.com,c@d.com"]) expect(validarEmail(mal), mal).not.toBe("");
    expect(validarTexto("x".repeat(101), "Ocupación", 100)).toMatch(/100/);
    expect(validarNumero("12,5", "Edad")).toBe("");
    expect(validarNumero("doce", "Edad")).toMatch(/número/);
    expect(validarOpcion("Marte", "la provincia", ["Quito"])).toMatch(/de la lista/);
  });
});

describe("provincia y ciudad en cascada", () => {
  it("cada provincia tiene sus ciudades fijas", () => {
    expect(ciudadesDe("EC", "Pichincha")).toContain("Quito");
    expect(ciudadesDe("EC", "Guayas")).toContain("Guayaquil");
    expect(ciudadesDe("EC", "Pichincha")).not.toContain("Guayaquil");
    expect(ciudadesDe("EC", "Inventada")).toEqual([]);
    expect(ciudadesDe("PE", "Lima")).toEqual([]);
  });
  it("reconoce la ciudad que sugiere el mapa", () => {
    expect(ciudadCoincidente("EC", "Pichincha", "Quito, Pichincha")).toBe("Quito");
    expect(ciudadCoincidente("EC", "Guayas", "guayaquil")).toBe("Guayaquil");
    expect(ciudadCoincidente("EC", "Guayas", "Quito")).toBe("");
  });
  const campos = [
    { id: "p", tipo: "select", etiqueta: "Provincia", obligatorio: false, mapeo: "provincia" },
    { id: "c", tipo: "select", etiqueta: "Ciudad", obligatorio: false, mapeo: "ciudad" },
    { id: "n", tipo: "fecha", etiqueta: "Fecha de nacimiento", obligatorio: true, mapeo: "fecha_nacimiento" },
  ];
  const datos = { nombres: "Ana", apellidos: "Torres", telefono: "0996543210" };
  const pais = { codigo: "EC", telefonoPrefijo: "+593", telefonoDigitos: 9 };
  it("la ciudad debe ser de la provincia elegida", () => {
    const e = erroresPerfil(datos, { p: "Pichincha", c: "Guayaquil", n: "1990-05-05" }, campos, pais, ["Pichincha", "Guayas"], HOY);
    expect(e[claveExtra("c")]).toMatch(/de la lista/);
    expect(erroresPerfil(datos, { p: "Pichincha", c: "Quito", n: "1990-05-05" }, campos, pais, ["Pichincha", "Guayas"], HOY)).toEqual({});
  });
  it("sin provincia no hay ciudad", () => {
    const e = erroresPerfil(datos, { c: "Quito", n: "1990-05-05" }, campos, pais, ["Pichincha"], HOY);
    expect(e[claveExtra("c")]).toMatch(/primero la provincia/);
  });
  it("valida la fecha de nacimiento configurada", () => {
    expect(erroresPerfil(datos, { n: "2015-01-01" }, campos, pais, [], HOY)[claveExtra("n")]).toMatch(/18/);
    expect(erroresPerfil(datos, {}, campos, pais, [], HOY)[claveExtra("n")]).toMatch(/Indica/);
  });
});

describe("contraseña del panel", () => {
  it("exige 10 caracteres, mayúscula y minúscula, número y símbolo", () => {
    expect(claveValida("Nueva#Clave2026")).toBe(true);
    for (const mala of ["corta1#A", "todaenminuscula#1", "TODAENMAYUSCULA#1", "SinNumeros#Aqui", "SinSimbolo12345"]) expect(claveValida(mala), mala).toBe(false);
  });
  it("no puede ser igual a la actual", () => {
    expect(claveValida("Nueva#Clave2026", "Nueva#Clave2026")).toBe(false);
    expect(requisitosClave("Nueva#Clave2026", "otra").every((r) => r.ok)).toBe(true);
  });
});