import crypto from 'crypto';

export const config = {
  runtime: 'nodejs',
};

const DIVINEPAY_SECRET = 'f45349c5d0003822dbe9cedf833a3a771585dc932f5978076f0b33db69f59ca1';

function verifyDivinePaySign(payload: Record<string, any>, secret: string): boolean {
  if (!payload || !payload.sign) return false;
  const receivedSign = String(payload.sign).toLowerCase();

  const filteredKeys = Object.keys(payload)
    .filter((k) => k !== 'sign' && payload[k] !== undefined && payload[k] !== null && payload[k] !== '')
    .sort();

  const rawString = filteredKeys.map((k) => `${k}=${payload[k]}`).join('&');
  const expectedSign = crypto.createHmac('sha256', secret).update(rawString).digest('hex').toLowerCase();

  return receivedSign === expectedSign;
}

export default async function handler(req: any, res?: any) {
  let method = req.method;
  let body: any = {};
  let query: any = {};

  if (typeof req.json === 'function') {
    method = req.method;
    try {
      if (method === 'POST' || method === 'PUT') {
        body = await req.json();
      }
      const url = new URL(req.url);
      query = Object.fromEntries(url.searchParams.entries());
    } catch {
      body = {};
    }
  } else {
    body = req.body || {};
    query = req.query || {};
  }

  const payload = { ...query, ...body };

  console.log('[payment-callback] Incoming webhook notification:', JSON.stringify(payload, null, 2));

  try {
    if (payload.merchantId || payload.orderId?.startsWith('DVP') || payload.method) {
      console.log('[payment-callback] Detected DivinePay webhook callback');
      if (payload.sign) {
        const isValid = verifyDivinePaySign(payload, DIVINEPAY_SECRET);
        if (isValid) {
          console.log(`[payment-callback] DivinePay signature verified successfully for order: ${payload.orderId}`);
        } else {
          console.warn(`[payment-callback] DivinePay signature verification failed for order: ${payload.orderId}`);
        }
      }
    } else if (payload.merOrderNo || payload.orderNo?.startsWith('EDP') || payload.payMethod) {
      console.log(`[payment-callback] Detected EDPay webhook for order: ${payload.merOrderNo || payload.orderNo}`);
    }

    const orderId = payload.orderId || payload.merOrderNo || payload.merchant_order_id || payload.out_trade_no || 'UNKNOWN';
    const status = payload.status || payload.trade_status || payload.order_status || 'SUCCESS';
    console.log(`[payment-callback] Processed order ${orderId} with status ${status}`);

    if (res && typeof res.status === 'function') {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send('OK');
    }

    return new Response('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('[payment-callback] Webhook error:', err);
    if (res && typeof res.status === 'function') {
      return res.status(200).send('OK');
    }
    return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
}
