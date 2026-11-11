export const config = {
  runtime: 'edge',
};

const NEFERBYTE_API_KEY = process.env.NEFERBYTE_API_KEY || '7e7fd9cae78a542bf3ba679f94a5afa2';
const NEFERBYTE_BASE_URL = 'https://api.neferbyte.com/game-id-checker/pubgm-global';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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
    let body: any = {};
    if (req.body && typeof req.body === 'object') {
      body = req.body;
    } else if (typeof req.json === 'function') {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    } else if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body);
      } catch {
        body = {};
      }
    }

    const { playerId } = body;

    if (!playerId) {
      return sendRes(res, 400, { error: 'Player ID is required' });
    }

    const trimmedId = String(playerId).trim();
    if (trimmedId.length < 8 || trimmedId.length > 12 || !/^\d+$/.test(trimmedId)) {
      return sendRes(res, 400, {
        success: false,
        error: 'Invalid Player ID format. Must be 8-12 digits.',
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const apiUrl = `${NEFERBYTE_BASE_URL}/${trimmedId}`;
    const apiResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-api-key': NEFERBYTE_API_KEY.trim(),
        'Accept': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const rawText = await apiResponse.text();
    let data: any = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }

    if (apiResponse.ok && data && typeof data === 'object' && !data.error && data.data?.username) {
      if (data.data.is_ban) {
        return sendRes(res, 400, {
          success: false,
          error: 'This PUBG Mobile account is banned.',
        });
      }

      return sendRes(res, 200, {
        success: true,
        name: data.data.username,
        id: data.data.id || trimmedId,
        message: 'ID Verified',
      });
    } else {
      const errorMsg =
        data && typeof data === 'object' && (data.msg || data.message || data.error)
          ? data.msg === 'id_not_found'
            ? 'Player not found. Please check your PUBG UID.'
            : data.msg || data.message
          : 'Player not found. Please check your PUBG UID.';

      return sendRes(res, 404, {
        success: false,
        error: errorMsg,
      });
    }
  } catch (error: any) {
    console.error('[verify-player error]:', error);
    if (error.name === 'AbortError') {
      return sendRes(res, 504, {
        success: false,
        error: 'Verification service timed out. Please try again.',
      });
    }
    return sendRes(res, 500, {
      success: false,
      error: 'Failed to verify player ID. Please try again later.',
    });
  }
}
