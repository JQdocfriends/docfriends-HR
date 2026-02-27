import { redirect } from "next/navigation";

export default function WorkflowNewPage() {
  redirect("/workflows/submit");
}
