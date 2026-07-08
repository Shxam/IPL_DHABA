import webpush from 'web-push';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    'mailto:shamsai3469@gmail.com', // Verified project email address
    publicKey,
    privateKey
  );
  console.log('[Web Push] VAPID details set successfully.');
} else {
  console.warn('[Web Push] VAPID credentials missing. Push notifications will run in mock/log mode.');
}

/**
 * Send a web push notification using web-push library
 * @param subscription Subscription object containing endpoint, keys (auth and p256dh)
 * @param payload Raw string payload (typically JSON string)
 */
export async function sendPushNotification(subscription: any, payload: string) {
  if (!publicKey || !privateKey) {
    console.warn(`[Web Push Fallback] Would send notification to endpoint: ${subscription.endpoint}\nPayload: ${payload}`);
    return { success: true, mocked: true };
  }

  try {
    const result = await webpush.sendNotification(subscription, payload);
    return { success: true, statusCode: result.statusCode };
  } catch (error: any) {
    console.error('[Web Push] Error sending notification:', error.message);
    throw error;
  }
}
export default sendPushNotification;
