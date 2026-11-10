/**
 * Ciudades con aeropuerto comercial y su código IATA (estándar de 3 letras de la IATA). Es la lista de la que se elige al agregar
 * una ciudad al buscador de vuelos: no se escribe a mano, así el código, la ciudad y el país siempre son consistentes.
 * Formato: CÓDIGO|Ciudad|País (un código por ciudad principal; si una ciudad tiene varios aeropuertos se usa el principal).
 */
const DATOS = `
UIO|Quito|Ecuador
GYE|Guayaquil|Ecuador
CUE|Cuenca|Ecuador
GPS|Galápagos (Baltra)|Ecuador
SCY|San Cristóbal (Galápagos)|Ecuador
MEC|Manta|Ecuador
LOH|Loja|Ecuador
ESM|Esmeraldas|Ecuador
TUA|Tulcán|Ecuador
CCO|Coca|Ecuador
LIM|Lima|Perú
CUZ|Cusco|Perú
AQP|Arequipa|Perú
TRU|Trujillo|Perú
PIU|Piura|Perú
IQT|Iquitos|Perú
CIX|Chiclayo|Perú
PCL|Pucallpa|Perú
TCQ|Tacna|Perú
JUL|Juliaca|Perú
BOG|Bogotá|Colombia
MDE|Medellín|Colombia
CLO|Cali|Colombia
CTG|Cartagena|Colombia
BAQ|Barranquilla|Colombia
SMR|Santa Marta|Colombia
BGA|Bucaramanga|Colombia
PEI|Pereira|Colombia
ADZ|San Andrés|Colombia
CUC|Cúcuta|Colombia
LET|Leticia|Colombia
SCL|Santiago|Chile
ANF|Antofagasta|Chile
IQQ|Iquique|Chile
CJC|Calama|Chile
PMC|Puerto Montt|Chile
PUQ|Punta Arenas|Chile
CCP|Concepción|Chile
IPC|Isla de Pascua|Chile
LSC|La Serena|Chile
ZCO|Temuco|Chile
LPB|La Paz|Bolivia
VVI|Santa Cruz de la Sierra|Bolivia
CBB|Cochabamba|Bolivia
SRE|Sucre|Bolivia
TJA|Tarija|Bolivia
UYU|Uyuni|Bolivia
ASU|Asunción|Paraguay
CDE|Ciudad del Este|Paraguay
MVD|Montevideo|Uruguay
PDP|Punta del Este|Uruguay
EZE|Buenos Aires (Ezeiza)|Argentina
AEP|Buenos Aires (Aeroparque)|Argentina
COR|Córdoba|Argentina
MDZ|Mendoza|Argentina
ROS|Rosario|Argentina
BRC|San Carlos de Bariloche|Argentina
USH|Ushuaia|Argentina
IGR|Puerto Iguazú|Argentina
SLA|Salta|Argentina
TUC|San Miguel de Tucumán|Argentina
FTE|El Calafate|Argentina
NQN|Neuquén|Argentina
GRU|São Paulo|Brasil
GIG|Río de Janeiro|Brasil
BSB|Brasilia|Brasil
CNF|Belo Horizonte|Brasil
SSA|Salvador|Brasil
REC|Recife|Brasil
FOR|Fortaleza|Brasil
POA|Porto Alegre|Brasil
CWB|Curitiba|Brasil
FLN|Florianópolis|Brasil
MAO|Manaos|Brasil
BEL|Belém|Brasil
NAT|Natal|Brasil
IGU|Foz de Iguazú|Brasil
CCS|Caracas|Venezuela
MAR|Maracaibo|Venezuela
VLN|Valencia|Venezuela
PMV|Isla Margarita|Venezuela
GEO|Georgetown|Guyana
PBM|Paramaribo|Surinam
CAY|Cayena|Guayana Francesa
PTY|Ciudad de Panamá|Panamá
DAV|David|Panamá
SJO|San José|Costa Rica
LIR|Liberia|Costa Rica
SAL|San Salvador|El Salvador
GUA|Ciudad de Guatemala|Guatemala
FRS|Flores|Guatemala
TGU|Tegucigalpa|Honduras
SAP|San Pedro Sula|Honduras
RTB|Roatán|Honduras
MGA|Managua|Nicaragua
BZE|Ciudad de Belice|Belice
MEX|Ciudad de México|México
CUN|Cancún|México
GDL|Guadalajara|México
MTY|Monterrey|México
TIJ|Tijuana|México
PVR|Puerto Vallarta|México
SJD|Los Cabos|México
MID|Mérida|México
OAX|Oaxaca|México
BJX|León/Guanajuato|México
PBC|Puebla|México
CZM|Cozumel|México
HAV|La Habana|Cuba
VRA|Varadero|Cuba
SDQ|Santo Domingo|República Dominicana
PUJ|Punta Cana|República Dominicana
POP|Puerto Plata|República Dominicana
SJU|San Juan|Puerto Rico
KIN|Kingston|Jamaica
MBJ|Montego Bay|Jamaica
NAS|Nasáu|Bahamas
AUA|Aruba|Aruba
CUR|Curazao|Curazao
BGI|Bridgetown|Barbados
POS|Puerto España|Trinidad y Tobago
PAP|Puerto Príncipe|Haití
GCM|Gran Caimán|Islas Caimán
JFK|Nueva York (JFK)|Estados Unidos
EWR|Nueva York (Newark)|Estados Unidos
MIA|Miami|Estados Unidos
FLL|Fort Lauderdale|Estados Unidos
MCO|Orlando|Estados Unidos
TPA|Tampa|Estados Unidos
ATL|Atlanta|Estados Unidos
LAX|Los Ángeles|Estados Unidos
SFO|San Francisco|Estados Unidos
LAS|Las Vegas|Estados Unidos
SEA|Seattle|Estados Unidos
ORD|Chicago|Estados Unidos
DFW|Dallas|Estados Unidos
IAH|Houston|Estados Unidos
DEN|Denver|Estados Unidos
PHX|Phoenix|Estados Unidos
BOS|Boston|Estados Unidos
IAD|Washington D. C.|Estados Unidos
PHL|Filadelfia|Estados Unidos
DTW|Detroit|Estados Unidos
MSP|Mineápolis|Estados Unidos
SAN|San Diego|Estados Unidos
HNL|Honolulu|Estados Unidos
MSY|Nueva Orleans|Estados Unidos
YYZ|Toronto|Canadá
YVR|Vancouver|Canadá
YUL|Montreal|Canadá
YYC|Calgary|Canadá
YOW|Ottawa|Canadá
MAD|Madrid|España
BCN|Barcelona|España
VLC|Valencia|España
SVQ|Sevilla|España
AGP|Málaga|España
BIO|Bilbao|España
PMI|Palma de Mallorca|España
TFN|Tenerife Norte|España
TFS|Tenerife Sur|España
LPA|Gran Canaria|España
ALC|Alicante|España
IBZ|Ibiza|España
LIS|Lisboa|Portugal
OPO|Oporto|Portugal
FAO|Faro|Portugal
CDG|París|Francia
NCE|Niza|Francia
LYS|Lyon|Francia
MRS|Marsella|Francia
FCO|Roma|Italia
MXP|Milán|Italia
VCE|Venecia|Italia
NAP|Nápoles|Italia
FLR|Florencia|Italia
LHR|Londres (Heathrow)|Reino Unido
LGW|Londres (Gatwick)|Reino Unido
MAN|Mánchester|Reino Unido
EDI|Edimburgo|Reino Unido
DUB|Dublín|Irlanda
AMS|Ámsterdam|Países Bajos
BRU|Bruselas|Bélgica
FRA|Fráncfort|Alemania
MUC|Múnich|Alemania
BER|Berlín|Alemania
HAM|Hamburgo|Alemania
DUS|Düsseldorf|Alemania
ZRH|Zúrich|Suiza
GVA|Ginebra|Suiza
VIE|Viena|Austria
CPH|Copenhague|Dinamarca
ARN|Estocolmo|Suecia
OSL|Oslo|Noruega
HEL|Helsinki|Finlandia
KEF|Reikiavik|Islandia
WAW|Varsovia|Polonia
PRG|Praga|República Checa
BUD|Budapest|Hungría
ATH|Atenas|Grecia
JTR|Santorini|Grecia
IST|Estambul|Turquía
AYT|Antalya|Turquía
SVO|Moscú|Rusia
LED|San Petersburgo|Rusia
OTP|Bucarest|Rumania
SOF|Sofía|Bulgaria
BEG|Belgrado|Serbia
ZAG|Zagreb|Croacia
DBV|Dubrovnik|Croacia
DXB|Dubái|Emiratos Árabes Unidos
AUH|Abu Dabi|Emiratos Árabes Unidos
DOH|Doha|Catar
RUH|Riad|Arabia Saudita
JED|Yeda|Arabia Saudita
TLV|Tel Aviv|Israel
AMM|Ammán|Jordania
BEY|Beirut|Líbano
CAI|El Cairo|Egipto
HRG|Hurghada|Egipto
CMN|Casablanca|Marruecos
RAK|Marrakech|Marruecos
TUN|Túnez|Túnez
ALG|Argel|Argelia
LOS|Lagos|Nigeria
ACC|Acra|Ghana
ADD|Adís Abeba|Etiopía
NBO|Nairobi|Kenia
JNB|Johannesburgo|Sudáfrica
CPT|Ciudad del Cabo|Sudáfrica
DAR|Dar es-Salam|Tanzania
ZNZ|Zanzíbar|Tanzania
DEL|Nueva Delhi|India
BOM|Bombay|India
BLR|Bangalore|India
MAA|Chennai|India
CCU|Calcuta|India
PEK|Pekín|China
PKX|Pekín (Daxing)|China
PVG|Shanghái|China
CAN|Cantón|China
SZX|Shenzhen|China
CTU|Chengdu|China
HKG|Hong Kong|Hong Kong
MFM|Macao|Macao
TPE|Taipéi|Taiwán
NRT|Tokio (Narita)|Japón
HND|Tokio (Haneda)|Japón
KIX|Osaka|Japón
NGO|Nagoya|Japón
FUK|Fukuoka|Japón
CTS|Sapporo|Japón
ICN|Seúl|Corea del Sur
PUS|Busan|Corea del Sur
BKK|Bangkok|Tailandia
HKT|Phuket|Tailandia
CNX|Chiang Mai|Tailandia
SIN|Singapur|Singapur
KUL|Kuala Lumpur|Malasia
CGK|Yakarta|Indonesia
DPS|Bali (Denpasar)|Indonesia
MNL|Manila|Filipinas
CEB|Cebú|Filipinas
SGN|Ciudad Ho Chi Minh|Vietnam
HAN|Hanói|Vietnam
REP|Siem Riep|Camboya
PNH|Nom Pen|Camboya
CMB|Colombo|Sri Lanka
MLE|Malé|Maldivas
KTM|Katmandú|Nepal
SYD|Sídney|Australia
MEL|Melbourne|Australia
BNE|Brisbane|Australia
PER|Perth|Australia
AKL|Auckland|Nueva Zelanda
CHC|Christchurch|Nueva Zelanda
NAN|Nadi|Fiyi
PPT|Papeete (Tahití)|Polinesia Francesa
`;

export type Aeropuerto = { codigo: string; ciudad: string; pais: string };

export const AEROPUERTOS: Aeropuerto[] = DATOS.trim()
  .split("\n")
  .map((l) => l.split("|"))
  .map(([codigo, ciudad, pais]) => ({ codigo: codigo!.trim(), ciudad: ciudad!.trim(), pais: pais!.trim() }));

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca por código IATA, ciudad o país (sin distinguir tildes ni mayúsculas). Los códigos exactos salen primero. */
export function buscarAeropuertos(q: string, excluir: string[] = [], max = 40): Aeropuerto[] {
  const n = sinTildes(q.trim());
  const lista = AEROPUERTOS.filter((a) => !excluir.includes(a.codigo));
  if (!n) return [...lista].sort((a, b) => a.ciudad.localeCompare(b.ciudad, "es")).slice(0, max);
  // Relevancia: código exacto, ciudad que empieza igual, ciudad que lo contiene, código que empieza igual y, por último, el país.
  const puntaje = (a: Aeropuerto) => {
    const c = sinTildes(a.ciudad);
    const k = sinTildes(a.codigo);
    return k === n ? 0 : c.startsWith(n) ? 1 : c.includes(n) ? 2 : k.startsWith(n) ? 3 : 4;
  };
  return lista
    .filter((a) => sinTildes(`${a.codigo} ${a.ciudad} ${a.pais}`).includes(n))
    .sort((a, b) => puntaje(a) - puntaje(b) || a.ciudad.localeCompare(b.ciudad, "es"))
    .slice(0, max);
}

/** Parte un texto en tramos marcando los que coinciden con la búsqueda (sin distinguir tildes ni mayúsculas), para resaltarlos. */
export function partesCoincidencia(texto: string, q: string): { t: string; m: boolean }[] {
  const n = sinTildes(q.trim());
  if (!n) return [{ t: texto, m: false }];
  const plano = [...texto].map((c) => sinTildes(c)).join("");
  const i = plano.length === texto.length ? plano.indexOf(n) : -1;
  if (i < 0) return [{ t: texto, m: false }];
  return [
    ...(i > 0 ? [{ t: texto.slice(0, i), m: false }] : []),
    { t: texto.slice(i, i + n.length), m: true },
    ...(i + n.length < texto.length ? [{ t: texto.slice(i + n.length), m: false }] : []),
  ];
}