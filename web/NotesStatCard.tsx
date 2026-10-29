import { NotebookPen } from "lucide-react";
import { StatCard } from "@admin/panel";
import { useNotesCount } from "./api";

/** Genel bakış sayfasındaki "Notlar" kartı. */
export function NotesStatCard() {
  const notes = useNotesCount(true);
  return <StatCard label="Notlar" icon={NotebookPen} value={notes.data ?? 0} loading={notes.isPending} />;
}
