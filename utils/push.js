const webpush = require('web-push');
require('dotenv').config();

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:test@delfinboard.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const sendPushNotification = async (subscription, payload) => {
  if (!subscription) return;
  // Reconstruir el objeto con el formato exacto que espera web-push
  const pushSub = {
    endpoint: subscription.endpoint,
    keys: subscription.keys
  };
  // Lanzamos el error para que el llamador lo capture y lo loggee con detalle
  await webpush.sendNotification(pushSub, JSON.stringify(payload));
};

module.exports = { sendPushNotification };
