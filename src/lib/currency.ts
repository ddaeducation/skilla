// Currency exchange rate: 1 USD = 1450 RWF
export const USD_TO_RWF_RATE = 1450;

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
