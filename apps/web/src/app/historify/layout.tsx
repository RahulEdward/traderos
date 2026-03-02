import { AppLayout } from "@/components/layouts/app-layout";

export default function HistorifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
