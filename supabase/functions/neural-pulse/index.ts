const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const NEURAL_ENDPOINT = 'https://pulse.evorozen.com/api/neural';
const REQUEST_TIMEOUT_MS = 30_000;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const apiKey = Deno.env.get('EVOROZEN_API_KEY');
    if (!apiKey) {
      console.error('[neural-pulse] EVOROZEN_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Neural Pulse API key not configured', code: 'MISSING_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();
    const { action_type, prompt, data_payload } = body;

    if (!action_type) {
      return new Response(
        JSON.stringify({ error: 'action_type is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const neuralBody: Record<string, unknown> = { action_type };
    if (prompt) neuralBody.prompt = prompt;
    if (data_payload) neuralBody.data_payload = data_payload;

    console.log(`[neural-pulse] action_type=${action_type}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let neuralResponse: Response;
    try {
      neuralResponse = await fetch(NEURAL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(neuralBody),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
        console.error('[neural-pulse] Request timed out');
        return new Response(
          JSON.stringify({ error: 'Neural Pulse request timed out', code: 'TIMEOUT' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!neuralResponse.ok) {
      const errorText = await neuralResponse.text().catch(() => 'Unknown error');
      console.error(`[neural-pulse] API returned ${neuralResponse.status}: ${errorText}`);
      return new Response(
        JSON.stringify({
          error: `Neural Pulse API error: ${neuralResponse.status}`,
          code: 'API_ERROR',
          status: neuralResponse.status,
        }),
        { status: neuralResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const data = await neuralResponse.json();

    if (data.traceId) {
      console.log(`[neural-pulse] traceId=${data.traceId} action=${action_type}`);
    }

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[neural-pulse] Unhandled error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
