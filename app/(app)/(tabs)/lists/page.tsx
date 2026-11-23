"use client";

import { Segmented } from "@/components/ui";
import { useStoredBoolean } from "@/lib/use-local-storage";
import BuyPage from "../buy/page";
import ResearchPage from "../research/page";

type View = "buy" | "research";

/** Lists tab: To Buy and To Research. Session 6 combines them into one list with filter chips. */
export default function ListsPage() {
  const [research, setResearch] = useStoredBoolean("planorama.listsResearch", false);
  const view: View = research ? "research" : "buy";

  return (
    <>
      <Segmented<View>
        label="List"
        options={[
          { value: "buy", label: "To Buy" },
          { value: "research", label: "To Research" },
        ]}
        value={view}
        onChange={(v) => setResearch(v === "research")}
        activeClass={view === "buy" ? "bg-buy text-white shadow-card" : "bg-research text-white shadow-card"}
        className="mt-5"
      />
      {view === "buy" ? <BuyPage /> : <ResearchPage />}
    </>
  );
}
