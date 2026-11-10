/** Textos editables del sitio (Admin → Contenido → FAQ y legales). */
export type Seccion = { t: string; p: string[] };
export type Faq = { q: string; a: string };

export const faqs: Faq[] = [
  { q: "¿Cómo acumulo puntos en Banco Solidario?", a: "Cada compra registrada con tu cédula en cualquier agencia Banco Solidario del Ecuador suma puntos automáticamente. Por cada USD 1 de compra acumulas puntos según tu nivel dentro del programa." },
  { q: "¿Cuánto vale un punto?", a: "El valor referencial del programa es de 70 puntos por USD 1 en el catálogo de canje. El valor exacto de cada producto siempre se muestra en su ficha." },
  { q: "¿Cuándo se reflejan mis puntos?", a: "Los puntos de una compra en tienda se reflejan en un máximo de 72 horas hábiles luego de facturada la compra." },
  { q: "¿Los puntos caducan?", a: "Sí. Los puntos tienen una vigencia de 12 meses calendario desde la fecha en que fueron acumulados. Puedes revisar los vencimientos en tu Historial de puntos." },
  { q: "¿Cómo canjeo mis puntos?", a: "Ingresa a “Canjea tus puntos”, elige los productos que te interesan, agrégalos al carrito y confirma tu canje. Si te faltan puntos, puedes completar el saldo pagando con cualquier tarjeta de crédito o débito." },
  { q: "¿Cuánto demora la entrega?", a: "Los productos físicos se entregan entre 5 y 10 días hábiles en Quito, Guayaquil y Cuenca, y hasta 15 días hábiles en el resto del país. Los productos digitales llegan a tu correo en minutos." },
  { q: "¿Puedo devolver un producto canjeado?", a: "Solo se aceptan cambios por fallas de fábrica dentro de los 30 días posteriores a la entrega. Los puntos utilizados no se devuelven salvo que el producto no pueda ser reemplazado." },
  { q: "¿Cómo actualizo mis datos?", a: "Desde “Mi perfil” puedes actualizar tu nombre, teléfono, contraseña y tus direcciones de envío en cualquier momento." },
];

export const terminos: Seccion[] = [
  { t: "1. Del programa", p: ["Banco Solidario Puntos es un programa de fidelización dirigido a clientes de la red de agencias Banco Solidario en Ecuador. La participación es gratuita y voluntaria.", "Pueden participar personas naturales mayores de 18 años con cédula de identidad ecuatoriana vigente, y personas jurídicas con RUC activo."] },
  { t: "2. Acumulación de puntos", p: ["Los puntos se acumulan por compras registradas con el documento del participante en agencias Banco Solidario adheridas al programa.", "La acreditación puede tomar hasta 72 horas hábiles desde la emisión de la factura. Las notas de crédito y devoluciones generan el descuento de los puntos correspondientes."] },
  { t: "3. Vigencia", p: ["Los puntos tienen una vigencia de 12 meses calendario contados desde la fecha de acumulación. Vencido ese plazo se eliminan automáticamente sin derecho a reclamo."] },
  { t: "4. Canje", p: ["El canje se realiza en el catálogo digital del programa, sujeto a la disponibilidad del catálogo. Los productos pueden ser reemplazados por otros de valor equivalente.", "Si el participante no cuenta con puntos suficientes, puede completar la diferencia pagando con cualquier tarjeta de crédito o débito emitida por instituciones autorizadas.", "Los puntos no son canjeables por dinero en efectivo ni transferibles a terceros."] },
  { t: "5. Entregas", p: ["Las entregas se realizan en la dirección registrada por el participante dentro del territorio ecuatoriano continental. Los productos digitales se envían al correo registrado."] },
  { t: "6. Modificaciones y vigencia del programa", p: ["Banco Solidario podrá modificar, suspender o dar por terminado el programa comunicando el cambio con al menos 30 días de anticipación en este sitio.", "El uso indebido, fraudulento o la entrega de información falsa faculta a Banco Solidario a suspender la cuenta y anular los puntos acumulados."] },
];

export const privacidad: Seccion[] = [
  { t: "1. Responsable del tratamiento", p: ["Banco Solidario Ecuador es responsable del tratamiento de los datos personales que registras en el programa Banco Solidario Puntos. Puedes contactarnos en servicioalcliente@banco-solidario.com o al 1800 SOLIDARIO (285 2684)."] },
  { t: "2. Datos que tratamos", p: ["Datos de identificación (nombres, apellidos, cédula o RUC), datos de contacto (correo, teléfono, dirección de entrega) e información transaccional de tus compras y canjes."] },
  { t: "3. Finalidades", p: ["Administrar tu cuenta y tu saldo de puntos, gestionar canjes y entregas, brindarte soporte, y enviarte comunicaciones sobre promociones del programa cuando lo autorices.", "No vendemos tus datos personales a terceros."] },
  { t: "4. Encargados y terceros", p: ["Compartimos información únicamente con proveedores necesarios para operar el programa: plataformas tecnológicas, empresas de logística y pasarelas de pago, bajo obligaciones de confidencialidad."] },
  { t: "5. Conservación y seguridad", p: ["Conservamos tus datos mientras tu cuenta esté activa y por el plazo que exija la normativa ecuatoriana aplicable. Aplicamos medidas técnicas y organizativas para proteger tu información."] },
  { t: "6. Tus derechos", p: ["Puedes acceder, rectificar, eliminar, oponerte al tratamiento o solicitar la portabilidad de tus datos, conforme a la Ley Orgánica de Protección de Datos Personales del Ecuador, escribiendo a servicioalcliente@banco-solidario.com"] },
  { t: "7. Cookies", p: ["Usamos cookies propias y de terceros para recordar tu sesión, medir el uso del sitio y mejorar tu experiencia. Puedes desactivarlas desde tu navegador."] },
];
