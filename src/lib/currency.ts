import { supabase } from "@/integrations/supabase/client";

// Fallback exchange rate: 1 USD = 1450 RWF
const FALLBACK_USD_TO_RWF_RATE = 1450;

// Cached rate with timestamp
let cachedRate: { rate: number; fetchedAt: number } | null = null;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export let USD_TO_RWF_RATE = FALLBACK_USD_TO_RWF_RATE;

export const fetchBNRRate = async (): Promise<number> => {
  // Return cached rate if still valid
  if (cachedRate && Date.now() - cachedRate.fetchedAt < CACHE_DURATION_MS) {
    USD_TO_RWF_RATE = cachedRate.rate;
    return cachedRate.rate;
  }

  try {
    const { data, error } = await supabase.functions.invoke("fetch-bnr-exchange-rate");

    if (error) {
      console.error("Error fetching BNR rate:", error);
      return USD_TO_RWF_RATE;
    }

    if (data?.success && data?.rate) {
      const rate = data.rate;
      cachedRate = { rate, fetchedAt: Date.now() };
      USD_TO_RWF_RATE = rate;
      console.log("BNR exchange rate updated:", rate);
      return rate;
    }

    if (data?.fallback_rate) {
      return data.fallback_rate;
    }
  } catch (err) {
    console.error("Failed to fetch BNR rate:", err);
  }

  return USD_TO_RWF_RATE;
};

export const formatCurrency = (amountUSD: number, currency: 'USD' | 'RWF' = 'USD'): string => {
  if (currency === 'RWF') {
    const rwfAmount = amountUSD * USD_TO_RWF_RATE;
    return `RWF ${rwfAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return `$${amountUSD.toFixed(2)}`;
};

export const formatDualCurrency = (amountUSD: number): { usd: string; rwf: string } => {
  return {
    usd: formatCurrency(amountUSD, 'USD'),
    rwf: formatCurrency(amountUSD, 'RWF'),
  };
};
