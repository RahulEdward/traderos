export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center">
      {children}
    </div>
  );
}
