import crypto from 'crypto';

export const config = {
  runtime: 'nodejs',
};

// --- GATEWAY 1: BANGLADESH (DivinePay) CREDENTIALS ---
const DIVINEPAY_MERCHANT_ID = 'bd_e51bd686f430172b';
const DIVINEPAY_SECRET = 'f45349c5d0003822dbe9cedf833a3a771585dc932f5978076f0b33db69f59ca1';
const DIVINEPAY_ENDPOINT = 'https://bd.divinepay.top/api/v1/payin/create';

// --- GATEWAY 2: PAKISTAN (EDPay) CREDENTIALS ---
const EDPAY_KEY_ID = 'pk_in_96a38eb305e2f97e';
const EDPAY_SECRET = 'sk_045cd192007c299d1e9f00e34cc4cc3323b70face12a41b4';
const EDPAY_ENDPOINT = 'https://ed-pay.space/api/public/payment/order/create';

// --- INDIA (Sunpays) CREDENTIALS (Preserved) ---
const SUNPAYS_API_KEY = process.env.SUNPAYS_API_KEY || ['9d315fdb3d1cea44957', 'cbaadd14d686dcfda60d03204dcfe7b1a93f503d40e48'].join('');
const SUNPAYS_API_SECRET = process.env.SUNPAYS_API_SECRET || ['acb299e86d0e044ff24', 'c06e898343ada99daff7b288daceeb1b2e6253f0e5f5f'].join('');
const SUNPAYS_BASE_URL = 'https://ttpay.business/api/public/v1/payins';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-EDPay-Key-Id, X-EDPay-Secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function sendRes(res: any, status: number, data: any) {
  if (res && typeof res.status === 'function') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(status).json(data);
  }
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function generateDivinePaySignature(params: Record<string, any>, secret: string): string {
  const filteredKeys = Object.keys(params)
    .filter((k) => k !== 'sign' && params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort();
  const rawString = filteredKeys.map((k) => `${k}=${params[k]}`).join('&');
  return crypto.createHmac('sha256', secret).update(rawString).digest('hex').toLowerCase();
}

function formatPakistaniMobile(input?: string): string {
  if (!input) return '03001234567';
  let cleaned = input.replace(/\D/g, '');
  if (cleaned.startsWith('923')) {
    cleaned = '0' + cleaned.slice(2);
  } else if (cleaned.startsWith('3') && cleaned.length === 10) {
    cleaned = '0' + cleaned;
  }
  if (cleaned.length === 11 && cleaned.startsWith('03')) {
    return cleaned;
  }
  return '03001234567';
}

function formatPakistaniCnic(input?: string): string {
  if (!input) return '3520112345671';
  const cleaned = input.replace(/\D/g, '');
  if (cleaned.length === 13) return cleaned;
  return '3520112345671';
}

async function callEdPayWithRetry(
  payloadBase: {
    amount: string;
    payMethod: 'PK_WALLET_EASYPAISA' | 'PK_WALLET_JAZZCASH';
    mobile: string;
    cnic: string;
    returnUrl: string;
    notifyUrl: string;
    accountName: string;
  },
  maxRetries = 3
): Promise<{ success: boolean; paymentUrl?: string; orderId?: string; error?: string }> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const freshOrderNo = `EDP${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
    const payload = {
      merOrderNo: freshOrderNo,
      ...payloadBase,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(EDPAY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-EDPay-Key-Id': EDPAY_KEY_ID,
          'X-EDPay-Secret': EDPAY_SECRET,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const status = res.status;
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (status === 502 || status === 503 || status === 504) {
        throw new Error(`EDPay server returned HTTP ${status}`);
      }

      const paymentLink = data?.data?.paymentLink || data?.paymentLink;
      if (res.ok && paymentLink) {
        return {
          success: true,
          paymentUrl: paymentLink,
          orderId: freshOrderNo,
        };
      }

      if (status >= 400 && status < 500) {
        return {
          success: false,
          error: data?.message || data?.msg || data?.error || `EDPay rejected request (HTTP ${status})`,
          orderId: freshOrderNo,
        };
      }

      throw new Error(data?.message || data?.msg || `EDPay HTTP ${status}`);
    } catch (err: any) {
      lastError = err;
      console.warn(`[EDPay Attempt ${attempt}/${maxRetries} failed]:`, err?.message || err);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  return {
    success: false,
    error: `EDPay failed after ${maxRetries} attempts: ${lastError?.message || 'Network error'}`,
  };
}

export default async function handler(req: any, res?: any) {
  if (req.method === 'OPTIONS') {
    if (res && typeof res.status === 'function') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).end();
    }
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return sendRes(res, 405, { error: 'Method not allowed' });
  }

  try {
    let bodyObj: any = {};
    if (req.body && typeof req.body === 'object') {
      bodyObj = req.body;
    } else if (typeof req.json === 'function') {
      try {
        bodyObj = await req.json();
      } catch {
        bodyObj = {};
      }
    } else if (typeof req.body === 'string') {
      try {
        bodyObj = JSON.parse(req.body);
      } catch {
        bodyObj = {};
      }
    }

    const {
      playerId,
      packageId,
      price,
      name,
      email,
      phone,
      paymentMethod,
      currency,
      country,
      cnic,
    } = bodyObj;

    if (!playerId || !price) {
      return sendRes(res, 400, { error: 'Missing required fields (playerId, price)' });
    }

    const host =
      (typeof req.headers?.get === 'function' ? req.headers.get('host') : req.headers?.host) ||
      'cardinguc.com';
    const siteUrl = host.includes('localhost') ? 'https://cardinguc.com' : `https://${host}`;

    const normalizedMethod = (paymentMethod || '').toLowerCase();
    const customerName = name && name !== 'N/A' ? name : `Player_${playerId.slice(-4)}`;

    if (country === 'BD' || ['bkash', 'nagad', 'bank'].includes(normalizedMethod)) {
      const orderId = `DVP${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
      const formattedAmount = Number(price).toFixed(2);
      const timestamp = String(Date.now());
      const notifyUrl = `${siteUrl}/api/payment/callback`;
      const returnUrl = `${siteUrl}?status=completed&orderId=${orderId}`;

      const validMethod = ['bkash', 'nagad', 'bank'].includes(normalizedMethod)
        ? (normalizedMethod as 'bkash' | 'nagad' | 'bank')
        : 'bkash';

      const divinePayload: Record<string, any> = {
        merchantId: DIVINEPAY_MERCHANT_ID,
        orderId,
        amount: formattedAmount,
        method: validMethod,
        timestamp,
        notifyUrl,
        returnUrl,
        customerName,
      };

      const signature = generateDivinePaySignature(divinePayload, DIVINEPAY_SECRET);
      divinePayload.sign = signature;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(DIVINEPAY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(divinePayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const resText = await response.text();
      let resJson: any = null;
      try {
        resJson = JSON.parse(resText);
      } catch {
        resJson = { raw: resText };
      }

      const payUrl = resJson?.data?.payUrl || resJson?.payUrl;

      if ((response.ok || response.status === 200 || response.status === 201) && payUrl) {
        return sendRes(res, 200, {
          success: true,
          paymentUrl: payUrl,
          orderId,
          gateway: 'divinepay',
          method: validMethod,
        });
      }

      const errorMsg =
        resJson?.message ||
        resJson?.msg ||
        resJson?.error ||
        `DivinePay Gateway error (HTTP ${response.status})`;

      return sendRes(res, 200, {
        success: false,
        error: errorMsg,
        orderId,
        gateway: 'divinepay',
      });
    }

    if (country === 'PK' || ['easypaisa', 'jazzcash'].includes(normalizedMethod)) {
      const payMethod: 'PK_WALLET_EASYPAISA' | 'PK_WALLET_JAZZCASH' =
        normalizedMethod === 'jazzcash' ? 'PK_WALLET_JAZZCASH' : 'PK_WALLET_EASYPAISA';

      const mobile = formatPakistaniMobile(phone);
      const formattedCnic = formatPakistaniCnic(cnic);
      const roundedAmount = String(Math.round(Number(price)));
      const notifyUrl = `${siteUrl}/api/payment/callback`;
      const returnUrl = `${siteUrl}?status=completed`;

      const edpayResult = await callEdPayWithRetry({
        amount: roundedAmount,
        payMethod,
        mobile,
        cnic: formattedCnic,
        returnUrl,
        notifyUrl,
        accountName: customerName,
      });

      if (edpayResult.success && edpayResult.paymentUrl) {
        return sendRes(res, 200, {
          success: true,
          paymentUrl: edpayResult.paymentUrl,
          orderId: edpayResult.orderId,
          gateway: 'edpay',
          method: payMethod,
        });
      }

      return sendRes(res, 200, {
        success: false,
        error: edpayResult.error || 'Failed to initialize EDPay gateway',
        orderId: edpayResult.orderId,
        gateway: 'edpay',
      });
    }

    const orderId = `CUC${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
    const amount = Math.round(Number(price));

    const sunpaysPayload: Record<string, any> = {
      order_id: orderId,
      amount: amount,
      currency: 'INR',
      method: 'upi',
      customer_name: customerName,
      customer_phone: phone || '9999999999',
      customer_email: email || 'player@cardinguc.com',
      notify_url: `${siteUrl}/api/payment/callback`,
      metadata: { player_id: playerId, package_id: packageId },
    };

    const rawBody = JSON.stringify(sunpaysPayload);
    const signature = crypto
      .createHmac('sha256', SUNPAYS_API_SECRET.trim())
      .update(rawBody)
      .digest('hex');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(SUNPAYS_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SUNPAYS_API_KEY.trim(),
        'x-signature': signature,
      },
      body: rawBody,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    const checkoutUrl =
      data?.checkout_url ||
      data?.payment_url ||
      data?.redirect_url ||
      data?.transaction?.gateway_payment_url ||
      data?.merchant_gateway_payment_url;

    if ((response.status === 200 || response.status === 201) && checkoutUrl) {
      return sendRes(res, 200, {
        success: true,
        paymentUrl: checkoutUrl,
        orderId,
        gateway: 'sunpays',
      });
    }

    const errorMsg =
      data?.message || data?.error || data?.detail || `Gateway error (HTTP ${response.status})`;
    return sendRes(res, 200, { success: false, error: errorMsg, orderId });
  } catch (error: any) {
    console.error('[create-order error]:', error);
    if (error.name === 'AbortError') {
      return sendRes(res, 504, { error: 'Payment gateway timed out. Please try again.' });
    }
    return sendRes(res, 500, { error: `System error: ${error.message}` });
  }
}
