import { Resend } from 'resend';
import { Order, OrderStatus } from '@/types';

let resendClient: Resend | null = null;

const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!resendClient && apiKey) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
};

const RESTAURANT_EMAIL = process.env.RESTAURANT_EMAIL || 'owner@ipldhaba.com';
const FROM_EMAIL = 'IPL Dhaba <orders@ipldhaba.com>';

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCurrency = (amount: number | string) => `Rs. ${Number(amount).toFixed(2)}`;

const getAppUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://apk-hazel.vercel.app';
  try {
    return new URL(rawUrl).origin;
  } catch {
    return 'https://apk-hazel.vercel.app';
  }
};

const getTrackingUrl = (order: Order) => {
  const url = new URL(`/orders/${order.id}`, getAppUrl());
  if (order.tracking_token) {
    url.searchParams.set('token', order.tracking_token);
  }
  return url.toString();
};

const emailWrapper = (title: string, content: string) => `
  <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FFF8F0; padding: 24px; border-radius: 16px; border: 1px solid #E8E0D5;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #FF6B00; font-size: 2.2rem; margin: 0; font-family: sans-serif; font-weight: 800;">IPL Dhaba</h1>
      <p style="color: #6B6B6B; margin: 4px 0; font-size: 0.95rem;">Tasty & Healthy Indian Prime Line</p>
    </div>
    <div style="background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1.5px solid #E8E0D5; box-shadow: 0 4px 12px rgba(28, 28, 28, 0.03);">
      <h2 style="margin-top: 0; color: #1C1C1C; font-size: 1.4rem; border-bottom: 2px solid #FF6B00; padding-bottom: 8px;">${escapeHtml(title)}</h2>
      ${content}
      <hr style="border: 0; border-top: 1.5px solid #E8E0D5; margin: 24px 0;" />
      <p style="color: #6B6B6B; font-size: 0.85rem; text-align: center; margin: 0;">
        Questions? Call us at <a href="tel:+919876543210" style="color: #FF6B00; text-decoration: none; font-weight: 600;">+91 98765 43210</a>
      </p>
    </div>
  </div>
`;

export async function sendOrderPlacedEmail(order: Order) {
  const resend = getResend();
  const email = order.phone.includes('@') ? order.phone : null;

  const itemsList = (order.order_items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 0; font-size: 0.9rem; color: #1C1C1C;">${escapeHtml(item.name)}</td>
        <td style="padding: 8px 0; font-size: 0.9rem; color: #6B6B6B; text-align: right;">${escapeHtml(item.quantity)}x</td>
        <td style="padding: 8px 0; font-size: 0.9rem; color: #1C1C1C; text-align: right; font-weight: 600;">${formatCurrency(item.subtotal)}</td>
      </tr>
    `
    )
    .join('');

  const orderLabel = order.order_number || order.id.slice(0, 8);
  const paymentLabel = order.payment_method === 'cod' ? 'Cash on Delivery' : 'Paid Online';

  const customerHtml = emailWrapper(
    'Order Placed Successfully',
    `
    <p>Hi <strong>${escapeHtml(order.customer_name)}</strong>,</p>
    <p>Your order has been received and is currently being confirmed by the Dhaba staff.</p>
    <div style="background-color: #FFF8F0; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 0.9rem;">
      <p style="margin: 4px 0;"><strong>Order ID:</strong> #${escapeHtml(orderLabel)}</p>
      <p style="margin: 4px 0;"><strong>Payment Method:</strong> ${paymentLabel}</p>
      <p style="margin: 4px 0;"><strong>Estimated Delivery:</strong> 30 - 45 mins</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
      <thead>
        <tr style="border-bottom: 1.5px solid #E8E0D5;">
          <th style="text-align: left; padding-bottom: 8px; font-size: 0.8rem; color: #6B6B6B;">Item</th>
          <th style="text-align: right; padding-bottom: 8px; font-size: 0.8rem; color: #6B6B6B;">Qty</th>
          <th style="text-align: right; padding-bottom: 8px; font-size: 0.8rem; color: #6B6B6B;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${itemsList}</tbody>
      <tfoot>
        <tr style="border-top: 2px solid #E8E0D5; font-weight: 700;">
          <td colspan="2" style="padding-top: 12px; font-size: 0.95rem;">Subtotal</td>
          <td style="padding-top: 12px; font-size: 0.95rem; text-align: right;">${formatCurrency(order.subtotal)}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top: 4px; font-size: 0.95rem; color: #6B6B6B;">Delivery Fee</td>
          <td style="padding-top: 4px; font-size: 0.95rem; text-align: right; color: #6B6B6B;">${formatCurrency(order.delivery_fee)}</td>
        </tr>
        <tr style="font-size: 1.1rem; color: #FF6B00; font-weight: 800;">
          <td colspan="2" style="padding-top: 12px;">Total Paid</td>
          <td style="padding-top: 12px; text-align: right;">${formatCurrency(order.total_amount)}</td>
        </tr>
      </tfoot>
    </table>
  `
  );

  const adminHtml = emailWrapper(
    'New Order Received',
    `
    <p>A new order has been placed by <strong>${escapeHtml(order.customer_name)}</strong> (${escapeHtml(order.phone)}).</p>
    <div style="background-color: #FFF8F0; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 0.9rem;">
      <p style="margin: 4px 0;"><strong>Order ID:</strong> #${escapeHtml(orderLabel)}</p>
      <p style="margin: 4px 0;"><strong>Total Amount:</strong> ${formatCurrency(order.total_amount)}</p>
      <p style="margin: 4px 0;"><strong>Delivery Address:</strong> ${escapeHtml(order.delivery_address.address_line)}</p>
    </div>
    <div style="text-align: center; margin-top: 20px;">
      <a href="${escapeHtml(new URL('/admin/dashboard', getAppUrl()).toString())}" style="background-color: #FF6B00; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block;">View in Admin Panel</a>
    </div>
  `
  );

  if (!resend) {
    console.log('[Email Server] Dev Mode - Send emails output:');
    console.log(`Order confirmation to customer email: ${email || 'none (phone only)'}`);
    console.log(`Alert to owner: ${RESTAURANT_EMAIL}`);
    return;
  }

  try {
    const promises = [
      resend.emails.send({
        from: FROM_EMAIL,
        to: RESTAURANT_EMAIL,
        subject: `New Order #${orderLabel} - ${formatCurrency(order.total_amount)}`,
        html: adminHtml,
      }),
    ];

    if (email) {
      promises.push(
        resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: `Order Confirmed #${orderLabel} | IPL Dhaba`,
          html: customerHtml,
        })
      );
    }

    await Promise.allSettled(promises);
  } catch (err: any) {
    console.error('[Email Service] Failed to send order placement emails:', err.message);
  }
}

export async function sendOrderStatusUpdateEmail(order: Order, status: OrderStatus) {
  const resend = getResend();
  const email = order.phone.includes('@') ? order.phone : null;

  let statusTitle = '';
  let statusMessage = '';

  switch (status) {
    case 'confirmed':
      statusTitle = 'Order Accepted';
      statusMessage = 'Your order has been confirmed by the restaurant manager and is scheduled for preparation.';
      break;
    case 'preparing':
      statusTitle = 'Preparing Your Food';
      statusMessage = 'Our chefs are preparing your meal now. It will be cooked and packed soon.';
      break;
    case 'out_for_delivery':
      statusTitle = 'Out for Delivery';
      statusMessage = 'Your food has left the kitchen. Our delivery agent is on their way to your address.';
      break;
    case 'delivered':
      statusTitle = 'Order Delivered';
      statusMessage = 'Thank you for ordering from IPL Dhaba. Your order has been delivered successfully.';
      break;
    case 'cancelled':
      statusTitle = 'Order Cancelled';
      statusMessage = `We regret to inform you that your order has been cancelled. Reason: ${escapeHtml(
        order.cancelled_reason || 'Restaurant was busy or out of stock'
      )}. Any payment made will be refunded shortly.`;
      break;
    default:
      return;
  }

  const orderLabel = order.order_number || order.id.slice(0, 8);
  const contentHtml = emailWrapper(
    statusTitle,
    `
    <p>Hi <strong>${escapeHtml(order.customer_name)}</strong>,</p>
    <p>${statusMessage}</p>
    <div style="background-color: #FFF8F0; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 0.9rem;">
      <p style="margin: 4px 0;"><strong>Order ID:</strong> #${escapeHtml(orderLabel)}</p>
      <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #FF6B00; font-weight: 700; text-transform: uppercase;">${escapeHtml(status.replace(/_/g, ' '))}</span></p>
    </div>
    <div style="text-align: center; margin-top: 20px;">
      <a href="${escapeHtml(getTrackingUrl(order))}" style="background-color: #FF6B00; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block;">Track Order Real-time</a>
    </div>
  `
  );

  if (!resend) {
    console.log(`[Email Server] Dev Mode - Status changed to ${status} for Order #${order.id}. Customer email: ${email || 'none'}`);
    return;
  }

  if (!email) return;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Order Update: ${status.replace(/_/g, ' ').toUpperCase()} | IPL Dhaba`,
      html: contentHtml,
    });
  } catch (err: any) {
    console.error('[Email Service] Failed to send status update email:', err.message);
  }
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  const resend = getResend();
  const contentHtml = emailWrapper(
    'Reset Your Password',
    `
    <p>Hello,</p>
    <p>You requested a password reset for your IPL Dhaba account. Click the button below to change your password. This link is valid for 1 hour.</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${escapeHtml(resetLink)}" style="background-color: #FF6B00; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block;">Reset Password</a>
    </div>
    <p style="font-size: 0.8rem; color: #6B6B6B;">If you did not request this email, you can safely ignore it.</p>
  `
  );

  if (!resend) {
    console.log(`[Email Server] Dev Mode - Password reset requested for ${email}. Link: ${resetLink}`);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Reset Your Password | IPL Dhaba',
      html: contentHtml,
    });
  } catch (err: any) {
    console.error('[Email Service] Failed to send password reset email:', err.message);
  }
}
