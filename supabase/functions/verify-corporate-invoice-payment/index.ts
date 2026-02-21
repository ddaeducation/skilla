import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transaction_id, invoice_id } = await req.json();
    if (!transaction_id || !invoice_id) {
      throw new Error("Missing transaction_id or invoice_id");
    }

    const flutterwaveSecretKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!flutterwaveSecretKey) throw new Error("Flutterwave secret key not configured");

    // Verify transaction with Flutterwave
    const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      headers: { Authorization: `Bearer ${flutterwaveSecretKey}` },
    });
    const verifyData = await verifyRes.json();
    console.log("Flutterwave verify response:", JSON.stringify(verifyData));

    if (verifyData.status !== "success" || verifyData.data?.status !== "successful") {
      throw new Error("Payment verification failed");
    }

    // Get invoice to validate amount
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: invoice, error: invError } = await supabase
      .from("corporate_invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (invError || !invoice) throw new Error("Invoice not found");

    const paidAmount = verifyData.data.amount;
    const paidCurrency = verifyData.data.currency;

    if (paidAmount < invoice.amount) {
      throw new Error(`Paid amount (${paidCurrency} ${paidAmount}) is less than invoice amount (${invoice.currency} ${invoice.amount})`);
    }

    // Mark invoice as paid
    const { error: updateError } = await supabase
      .from("corporate_invoices")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        notes: `Payment verified. Flutterwave TX: ${transaction_id}. Amount: ${paidCurrency} ${paidAmount}`,
      })
      .eq("id", invoice_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, message: "Invoice marked as paid" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error verifying corporate payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
