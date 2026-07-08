import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { z } from 'zod';
import { sendOrderPlacedEmail } from '@/services/email';
import { createAdminClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/webpush';

const orderStatusSchema = z.enum(['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']);
const paymentMethodSchema = z.enum(['cod', 'online']);
const paymentStatusSchema = z.enum(['pending', 'paid', 'refunded']);

const jobSchema = z.object({
  orderId: z.string().uuid(),
  order: z.object({
    id: z.string().uuid(),
    order_number: z.number().optional(),
    customer_name: z.string(),
    phone: z.string(),
    delivery_address: z.object({
      address_line: z.string(),
      city: z.string().optional(),
      pincode: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    }),
    delivery_instructions: z.string().nullable().optional(),
    subtotal: z.number(),
    delivery_fee: z.number(),
    total_amount: z.number(),
    status: orderStatusSchema,
    payment_method: paymentMethodSchema,
    payment_status: paymentStatusSchema,
    estimated_delivery_at: z.string().nullable().optional(),
    delivered_at: z.string().nullable().optional(),
    cancelled_reason: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    order_items: z.array(z.object({
      menu_item_id: z.string().uuid().nullable().optional(),
      name: z.string(),
      quantity: z.number().int().positive(),
      unit_price: z.number(),
      subtotal: z.number(),
    })).optional(),
  }).passthrough(),
});

export async function POST(request: NextRequest) {
  try {
    const bypassSignature = request.headers.get('x-bypass-signature') === 'true';
    const isDev = process.env.NODE_ENV === 'development';

    // 1. Verify QStash signatures in production environment
    if (!isDev) {
      const signature = request.headers.get('upstash-signature');
      if (!signature) {
        return NextResponse.json({ error: 'Missing Upstash signature' }, { status: 401 });
      }

      const receiver = new Receiver({
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
      });

      const bodyText = await request.clone().text();
      const isValid = await receiver.verify({
        signature,
        body: bodyText,
      });

      if (!isValid) {
        return NextResponse.json({ error: 'Invalid Upstash signature' }, { status: 401 });
      }
    } else if (!bypassSignature && process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY) {
      const signature = request.headers.get('upstash-signature');
      if (signature) {
        const receiver = new Receiver({
          currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
          nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
        });
        const bodyText = await request.clone().text();
        const isValid = await receiver.verify({ signature, body: bodyText });
        if (!isValid) {
          return NextResponse.json({ error: 'Invalid Upstash signature' }, { status: 401 });
        }
      }
    }

    const body = await request.json();
    const parseResult = jobSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body parameters' }, { status: 400 });
    }

    const { orderId, order } = parseResult.data;
    const adminDb = createAdminClient();

    // Task A: Send Customer Receipt Email via Resend
    try {
      await sendOrderPlacedEmail(order);
      console.log(`[Job order-created] Email receipt successfully sent for order ${orderId}`);
    } catch (emailError: any) {
      console.error(`[Job order-created] Email dispatch failed:`, emailError.message);
    }

    // Task B: Adjust Menu Item Inventory Stock
    try {
      for (const item of order.order_items || []) {
        if (item.menu_item_id) {
          // Fetch current stock values
          const { data: inv, error: invError } = await adminDb
            .from('inventory')
            .select('quantity')
            .eq('menu_item_id', item.menu_item_id)
            .single();

          if (!invError && inv) {
            const newQty = Math.max(0, inv.quantity - item.quantity);
            await adminDb
              .from('inventory')
              .update({ quantity: newQty })
              .eq('menu_item_id', item.menu_item_id);
            console.log(`[Job order-created] Decremented inventory for ${item.name} to ${newQty}`);
          }
        }
      }
    } catch (invError: any) {
      console.warn(`[Job order-created] Inventory adjustment bypassed:`, invError.message);
    }

    // Task C: Dispatch Web Push Notifications to Restaurant staff
    try {
      // Find staff and owner profile IDs
      const { data: staffProfiles } = await adminDb
        .from('profiles')
        .select('id')
        .in('role', ['owner', 'admin', 'super_admin', 'manager']);

      if (staffProfiles && staffProfiles.length > 0) {
        const staffIds = staffProfiles.map((p) => p.id);
        const { data: subs } = await adminDb
          .from('push_subscriptions')
          .select('*')
          .in('user_id', staffIds);

        if (subs && subs.length > 0) {
          const payload = JSON.stringify({
            title: 'New Order Placed 🏏',
            body: `Order #${order.order_number || orderId.slice(0, 8)} totaling ₹${order.total_amount} is ready!`,
            icon: '/logo.png',
            url: `/admin/dashboard`,
          });

          for (const sub of subs) {
            await sendPushNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth_key || sub.auth,
                },
              },
              payload
            ).catch((err) => console.error('[Push Notification] Send failure:', err.message));
          }
        }
      }
    } catch (pushError: any) {
      console.warn('[Job order-created] Push notification updates bypassed:', pushError.message);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Job order-created] Process error:', err.message);
    return NextResponse.json({ error: 'Failed to process background job tasks' }, { status: 500 });
  }
}
