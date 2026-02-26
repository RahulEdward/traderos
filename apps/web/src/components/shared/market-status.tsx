"use client";

import { useState, useEffect } from "react";

function isMarketOpen(): boolean {
  const now = new Date();
  // Convert to IST
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + istOffset);

  const day = ist.getDay();
  // Closed on weekends
  if (day === 0 || day === 6) return false;

  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // NSE: 9:15 AM to 3:30 PM IST
  const open = 9 * 60 + 15; // 555
  const close = 15 * 60 + 30; // 930

  return timeInMinutes >= open && timeInMinutes <= close;
}

export function MarketStatus() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(isMarketOpen());
    const interval = setInterval(() => setOpen(isMarketOpen()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={`w-1.5 h-1.5 rounded-full ${open ? "bg-[#10B981] animate-pulse" : "bg-[#475569]"}`} />
      <span className={open ? "text-[#10B981]" : "text-[#475569]"}>
        NSE {open ? "Open" : "Closed"}
      </span>
      <span className="text-[#475569]">9:15 AM – 3:30 PM IST</span>
    </div>
  );
}
