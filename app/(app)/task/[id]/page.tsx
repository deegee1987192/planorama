import { TaskDetail } from "@/components/todo/TaskDetail";

export default function TaskPage({ params }: { params: { id: string } }) {
  return <TaskDetail id={params.id} />;
}
