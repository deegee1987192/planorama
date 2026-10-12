import { AppProviders } from "@/components/providers/AppProviders";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
