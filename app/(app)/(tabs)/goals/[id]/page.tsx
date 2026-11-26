import { GoalDetail } from "@/components/goals/GoalDetail";

export default function GoalPage({ params }: { params: { id: string } }) {
  return <GoalDetail id={params.id} />;
}
