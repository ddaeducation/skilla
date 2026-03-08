import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { USD_TO_RWF_RATE, fetchBNRRate } from "@/lib/currency";

interface CoursePriceDisplayProps {
  monthlyPrice: number | null;
  price: number;
  defaultCurrency?: string;
  pricingType?: string;
  fullPrice?: number | null;
}

const CoursePriceDisplay = ({ monthlyPrice, price, defaultCurrency = "USD", pricingType = "monthly", fullPrice }: CoursePriceDisplayProps) => {
  const [currency, setCurrency] = useState<"USD" | "RWF">(defaultCurrency === "RWF" ? "RWF" : "USD");

  useEffect(() => {
    fetchBNRRate();
  }, []);

  const isFullPrice = pricingType === "full";
  
  const displayPrice = isFullPrice 
    ? (fullPrice && fullPrice > 0 ? fullPrice : 5)
    : (monthlyPrice ?? price) > 0 ? (monthlyPrice ?? price) : 5;

  const formatPrice = (cur: "USD" | "RWF") => {
    if (cur === "RWF") {
      const rwfAmount = displayPrice * USD_TO_RWF_RATE;
      const formattedRwf = rwfAmount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      return isFullPrice ? `RWF ${formattedRwf}` : `RWF ${formattedRwf}/mo`;
    }
    return isFullPrice ? `$${displayPrice}` : `$${displayPrice}/mo`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors focus:outline-none">
        {formatPrice(currency)}
        <ChevronDown className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[140px]">
        <DropdownMenuItem
          onClick={() => setCurrency("USD")}
          className={currency === "USD" ? "bg-accent" : ""}
        >
          {`$${displayPrice}${isFullPrice ? '' : '/mo'}`}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setCurrency("RWF")}
          className={currency === "RWF" ? "bg-accent" : ""}
        >
          {`RWF ${(displayPrice * USD_TO_RWF_RATE).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}${isFullPrice ? '' : '/mo'}`}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CoursePriceDisplay;
