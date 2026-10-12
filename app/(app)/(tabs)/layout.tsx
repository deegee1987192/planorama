import { CaptureBar } from "@/components/CaptureBar";
import { TabBar } from "@/components/TabBar";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto max-w-2xl px-4 pb-[calc(152px+env(safe-area-inset-bottom))]">{children}</main>
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-cream via-cream/95 to-cream/0">
        <CaptureBar />
        <TabBar />
      </div>
    </>
  );
}
