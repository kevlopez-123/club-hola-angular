/** Textos editables del sitio (Admin → Contenido → FAQ y legales). */
export type Seccion = { t: string; p: string[] };
export type Faq = { q: string; a: string };

export const faqs: Faq[] = [
  { q: "¿Cómo accedo a los beneficios?", a: "Ingresa con tu documento y elige el beneficio que te interesa en el catálogo. Los cupones gratuitos se generan con un clic; los beneficios exclusivos se agregan al carrito y se pagan con tu tarjeta del banco." },
  { q: "¿Qué es mi nivel?", a: "Tu nivel (Clásico, Plata, Oro o Diamante) corresponde al segmento que te asigna el banco. Cada nivel incluye beneficios exclusivos y acceso a los de los niveles anteriores." },
  { q: "¿Cómo genero un cupón?", a: "Abre el beneficio, pulsa “Generar cupón” y presenta el código QR en el establecimiento junto con tu documento de identidad antes de que venza." },
  { q: "¿Con qué puedo pagar?", a: "Todo pago se valida con una tarjeta de débito o crédito del banco. Elige tu tarjeta en la pasarela al finalizar la compra." },
  { q: "¿Cómo recibo mis beneficios comprados?", a: "Todos los beneficios son digitales: llegan al correo de entrega que elijas en tu carrito, normalmente en minutos. Revisa también tu carpeta de spam." },
  { q: "¿Qué es Spin & Win?", a: "Es una ruleta de premios digitales. Tienes un número limitado de giros por semana y los premios se envían a tu correo de entrega." },
  { q: "¿Qué es Lucky Code?", a: "Es un validador de códigos promocionales: ingresa tu código, confirma que no eres un robot y descubre el premio que ganaste." },
  { q: "¿Cómo actualizo mis datos?", a: "Desde “Mi perfil” puedes actualizar tu nombre, teléfono y tus correos de entrega en cualquier momento." },
];

export const terminos: Seccion[] = [
  { t: "1. Del programa", p: ["Club Hola es un programa de beneficios dirigido a clientes del banco en Perú. La participación es gratuita y voluntaria.", "Pueden participar personas naturales mayores de 18 años con DNI peruana vigente, y personas jurídicas con RUC activo."] },
  { t: "2. Niveles", p: ["El nivel de cada participante corresponde al segmento que le asigna el banco y puede cambiar sin previo aviso. Cada nivel da acceso a los beneficios de ese nivel y de los anteriores."] },
  { t: "3. Beneficios y cupones", p: ["Los beneficios están sujetos a la vigencia y a las condiciones que indica cada ficha. Un cupón generado tiene una duración limitada y debe presentarse en el establecimiento junto con el documento de identidad.", "Los beneficios no son canjeables por dinero en efectivo."] },
  { t: "4. Pagos", p: ["Los beneficios exclusivos se pagan con tarjetas de débito o crédito del banco. Cada pago se valida con la tarjeta elegida antes de confirmar la compra."] },
  { t: "5. Entregas", p: ["Todos los beneficios son digitales y se envían al correo de entrega que el participante elija al comprar."] },
  { t: "6. Modificaciones y vigencia del programa", p: ["El banco podrá modificar, suspender o dar por terminado el programa comunicando el cambio con al menos 30 días de anticipación en este sitio.", "El uso indebido, fraudulento o la entrega de información falsa faculta al banco a suspender la cuenta."] },
];

export const privacidad: Seccion[] = [
  { t: "1. Responsable del tratamiento", p: ["BanBif Perú es responsable del tratamiento de los datos personales que registras en el programa Club Hola. Puedes contactarnos en callcenter@banbif.com.pe o al (01) 612-0800."] },
  { t: "2. Datos que tratamos", p: ["Datos de identificación (nombres, apellidos, cédula o RUC), datos de contacto (correo, teléfono, correos de entrega) e información transaccional de tus compras."] },
  { t: "3. Finalidades", p: ["Administrar tu cuenta y tu nivel, gestionar compras y entregas, brindarte soporte, y enviarte comunicaciones sobre promociones del programa cuando lo autorices.", "No vendemos tus datos personales a terceros."] },
  { t: "4. Encargados y terceros", p: ["Compartimos información únicamente con proveedores necesarios para operar el programa: plataformas tecnológicas y pasarelas de pago, bajo obligaciones de confidencialidad."] },
  { t: "5. Conservación y seguridad", p: ["Conservamos tus datos mientras tu cuenta esté activa y por el plazo que exija la normativa peruana aplicable. Aplicamos medidas técnicas y organizativas para proteger tu información."] },
  { t: "6. Tus derechos", p: ["Puedes acceder, rectificar, eliminar, oponerte al tratamiento o solicitar la portabilidad de tus datos, conforme a la Ley Orgánica de Protección de Datos Personales del Perú, escribiendo a callcenter@banbif.com.pe"] },
  { t: "7. Cookies", p: ["Usamos cookies propias y de terceros para recordar tu sesión, medir el uso del sitio y mejorar tu experiencia. Puedes desactivarlas desde tu navegador."] },
];
