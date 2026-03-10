import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Exchange rate: 1 USD = 1450 RWF
const RWF_TO_USD_RATE = 1 / 1450;

// Convert amount to USD based on currency
const convertToUSD = (amount: number, currency: string): number => {
  if (currency === "RWF") {
    return amount * RWF_TO_USD_RATE;
  }
  // Assume USD or other currencies are already in USD equivalent
  return amount;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transaction_id, tx_ref, enrollment_id, coupon_id, discount_applied, months_paid, is_full_price } = await req.json();
    
    console.log("Verifying Flutterwave payment:", { transaction_id, tx_ref, enrollment_id, coupon_id });

    if (!transaction_id || !enrollment_id) {
      console.error("Missing required parameters");
      return new Response(
        JSON.stringify({ error: "Missing transaction_id or enrollment_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const flutterwaveSecretKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!flutterwaveSecretKey) {
      console.error("Flutterwave secret key not configured");
      return new Response(
        JSON.stringify({ error: "Payment service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify transaction with Flutterwave
    console.log("Calling Flutterwave API to verify transaction:", transaction_id);
    const flwResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${flutterwaveSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const flwData = await flwResponse.json();
    console.log("Flutterwave verification response:", JSON.stringify(flwData));

    if (flwData.status !== "success" || flwData.data?.status !== "successful") {
      console.error("Payment verification failed:", flwData);
      return new Response(
        JSON.stringify({ 
          error: "Payment verification failed", 
          details: flwData.message || "Transaction not successful" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the tx_ref matches
    if (flwData.data.tx_ref !== tx_ref) {
      console.error("Transaction reference mismatch:", { expected: tx_ref, received: flwData.data.tx_ref });
      return new Response(
        JSON.stringify({ error: "Transaction reference mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch enrollment and course details in parallel
    const [enrollmentResult, ] = await Promise.all([
      supabaseAdmin.from("enrollments").select("course_id, user_id").eq("id", enrollment_id).single(),
    ]);

    if (enrollmentResult.error || !enrollmentResult.data) {
      console.error("Failed to fetch enrollment:", enrollmentResult.error);
      return new Response(
        JSON.stringify({ error: "Enrollment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const enrollment = enrollmentResult.data;

    // Fetch course (with duration for full-price) in one query
    const { data: course, error: courseFetchError } = await supabaseAdmin
      .from("courses")
      .select("instructor_id, duration")
      .eq("id", enrollment.course_id)
      .single();

    if (courseFetchError) {
      console.error("Failed to fetch course:", courseFetchError);
    }

    // Get payment details from Flutterwave
    const paymentCurrency = flwData.data.currency;
    const totalAmountOriginal = flwData.data.amount;
    
    // Convert to USD for consistent earnings calculation
    const totalAmountUSD = convertToUSD(totalAmountOriginal, paymentCurrency);
    
    // Calculate payment split: 40% platform, 60% instructor
    const platformFeeUSD = totalAmountUSD * 0.40;
    const instructorShareUSD = totalAmountUSD * 0.60;
    const platformFeeOriginal = totalAmountOriginal * 0.40;
    const instructorShareOriginal = totalAmountOriginal * 0.60;

    // Calculate subscription expiry
    const isFullPriceCourse = is_full_price === true;
    const monthsPaid = isFullPriceCourse ? null : (months_paid || 1);
    let subscriptionExpiresAt: string | null = null;
    
    if (isFullPriceCourse) {
      const expiryDate = new Date();
      const duration = course?.duration?.toLowerCase()?.trim() || "";
      const numMatch = duration.match(/(\d+)/);
      const num = numMatch ? parseInt(numMatch[1], 10) : 6;
      
      if (duration.includes("week")) {
        expiryDate.setDate(expiryDate.getDate() + num * 7 + 21);
      } else if (duration.includes("year")) {
        expiryDate.setFullYear(expiryDate.getFullYear() + num);
        expiryDate.setDate(expiryDate.getDate() + 21);
      } else {
        expiryDate.setMonth(expiryDate.getMonth() + num);
        expiryDate.setDate(expiryDate.getDate() + 21);
      }
      subscriptionExpiresAt = expiryDate.toISOString();
    } else if (monthsPaid) {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + monthsPaid);
      subscriptionExpiresAt = expiryDate.toISOString();
    }

    // Update enrollment status
    const { error: updateError } = await supabaseAdmin
      .from("enrollments")
      .update({
        payment_status: "completed",
        amount_paid: totalAmountOriginal,
        payment_currency: paymentCurrency,
        months_paid: monthsPaid,
        subscription_expires_at: subscriptionExpiresAt,
      })
      .eq("id", enrollment_id);

    if (updateError) {
      console.error("Failed to update enrollment:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update enrollment status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record earnings and coupon usage in parallel
    const parallelOps: Promise<any>[] = [];

    if (course?.instructor_id) {
      parallelOps.push(
        supabaseAdmin.from("instructor_earnings").insert({
          instructor_id: course.instructor_id,
          course_id: enrollment.course_id,
          enrollment_id: enrollment_id,
          amount: totalAmountOriginal,
          platform_fee: platformFeeOriginal,
          instructor_share: instructorShareOriginal,
          payment_currency: paymentCurrency,
          amount_usd: totalAmountUSD,
          platform_fee_usd: platformFeeUSD,
          instructor_share_usd: instructorShareUSD,
          status: "pending",
        }).then(({ error }) => {
          if (error) console.error("Failed to record instructor earnings:", error);
        })
      );
    }

    if (coupon_id && enrollment.user_id) {
      parallelOps.push(
        (async () => {
          const { error: couponUsageError } = await supabaseAdmin
            .from("coupon_usages")
            .insert({
              coupon_id,
              user_id: enrollment.user_id,
              enrollment_id,
              discount_applied: discount_applied || 0,
            });
          if (couponUsageError) {
            console.error("Failed to record coupon usage:", couponUsageError);
          } else {
            await supabaseAdmin.rpc('', {}).catch(() => {}); // no-op
            const { data: couponData } = await supabaseAdmin
              .from("coupons")
              .select("current_uses")
              .eq("id", coupon_id)
              .single();
            if (couponData) {
              await supabaseAdmin
                .from("coupons")
                .update({ current_uses: (couponData.current_uses || 0) + 1 })
                .eq("id", coupon_id);
            }
          }
        })()
      );
    }

    await Promise.all(parallelOps);

    console.log("Payment verified and enrollment updated successfully");
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Payment verified and enrollment completed",
        amount: totalAmountOriginal,
        amount_usd: totalAmountUSD,
        currency: paymentCurrency,
        platform_fee: platformFeeOriginal,
        platform_fee_usd: platformFeeUSD,
        instructor_share: instructorShareOriginal,
        instructor_share_usd: instructorShareUSD,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in verify-flutterwave-payment:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});