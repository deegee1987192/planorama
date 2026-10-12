import { CaptureBar } from "@/components/CaptureBar";
import { MainContainer } from "@/components/MainContainer";
import { TabBar } from "@/components/TabBar";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MainContainer>{children}</MainContainer>
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-cream via-cream/95 to-cream/0">
        <CaptureBar />
        <TabBar />
      </div>
    </>
  );
}
