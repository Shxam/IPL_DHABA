import { Client } from '@upstash/qstash';

/**
 * Enqueues a background job to QStash, or triggers it inline in local development
 * @param orderId ID of the created order
 * @param orderData Fully populated order object including items
 */
export async function dispatchOrderCreatedJob(orderId: string, orderData: any) {
  const token = process.env.QSTASH_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';

  if (!token) {
    if (process.env.NODE_ENV !== 'development') {
      console.error('[Jobs] QSTASH_TOKEN is missing. Background order tasks were not enqueued.');
      return;
    }

    console.warn('[Jobs] QSTASH_TOKEN is missing. Triggering order-created background tasks inline.');

    fetch(`${appUrl}/api/jobs/order-created`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bypass-signature': 'true',
      },
      body: JSON.stringify({ orderId, order: orderData }),
    }).catch((err) => {
      console.error('[Jobs] Local inline background task invocation failed:', err.message);
    });
    return;
  }

  try {
    const qstashClient = new Client({ token });
    
    await qstashClient.publishJSON({
      url: `${appUrl}/api/jobs/order-created`,
      body: { orderId, order: orderData },
      retries: 3, // Enforce 3-tier automatic retry capability
    });
    
    console.log(`[Jobs] Successfully enqueued order-created job to QStash for order: ${orderId}`);
  } catch (error: any) {
    console.error('[Jobs] QStash enqueue failed:', error.message);
  }
}
