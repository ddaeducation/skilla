import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FALLBACK_RATE = 1450;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Fetching USD/RWF exchange rate...");

    // Try open.er-api.com (free, no key needed)
    const response = await fetch(
      "https://open.er-api.com/v6/latest/USD"
    );

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();

    if (data.result === "success" && data.rates?.RWF) {
      const rate = data.rates.RWF;
      console.log("USD to RWF rate:", rate);

      return new Response(
        JSON.stringify({
          success: true,
          rate,
          currency: "USD",
          source: "ExchangeRate-API (aligned with BNR)",
          fetched_at: new Date().toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Could not parse rate from API response");
  } catch (error) {
    console.error("Error fetching exchange rate:", error);

    // Fallback: try alternative free API
    try {
      const altResponse = await fetch(
        "https://api.exchangerate.host/latest?base=USD&symbols=RWF"
      );
      const altData = await altResponse.json();
      
      if (altData.rates?.RWF) {
        return new Response(
          JSON.stringify({
            success: true,
            rate: altData.rates.RWF,
            currency: "USD",
            source: "exchangerate.host",
            fetched_at: new Date().toISOString(),
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (_) {
      // Ignore fallback error
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        fallback_rate: FALLBACK_RATE,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
