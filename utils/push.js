const webpush = require('web-push');

// Las claves VAPID deben ya estar en process.env cargadas por el entry point del servidor.
// NO llamamos dotenv.config() aquí para evitar problemas de ruta relativa.
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn('[PUSH] ADVERTENCIA: Las variables VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY no están definidas. Las notificaciones push estarán desactivadas.');
} else {
  webpush.setVapidDetails(
    'mailto:admin@delfinboard.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('[PUSH] VAPID configurado correctamente.');
}

/**
 * Envía una Web Push Notification.
 * @param {object} subscription - Objeto de suscripción con { endpoint, keys: { p256dh, auth } }
 * @param {object} payload - Objeto con { title, body, url }
 */
const sendPushNotification = async (subscription, payload) => {
  if (!subscription) return;

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[PUSH] Intento de envío cancelado: VAPID no configurado.');
    return;
  }

  // Reconstruir el objeto con el formato exacto que espera la librería web-push
  const pushSub = {
    endpoint: subscription.endpoint,
    keys: typeof subscription.keys === 'string'
      ? JSON.parse(subscription.keys)   // Supabase a veces devuelve JSONB como string
      : subscription.keys               // Ya es objeto
  };

  // Lanzamos el error para que el llamador lo registre con detalle
  await webpush.sendNotification(pushSub, JSON.stringify(payload));
};

module.exports = { sendPushNotification };
