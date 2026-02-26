export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center gap-2 mb-4 animate-pulse">
          <span className="text-3xl font-bold text-[#3B82F6]">TradeOS</span>
          <span className="text-lg text-[#06B6D4]">India</span>
        </div>
        <div className="flex items-center justify-center gap-1">
          <div className="w-2 h-2 bg-[#3B82F6] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-[#3B82F6] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-[#3B82F6] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
