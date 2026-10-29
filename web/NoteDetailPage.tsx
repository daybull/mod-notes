import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { useDeleteNote, useNote } from "./api";
import { NoteEditor } from "./NotesPage";
import { Button, Card, ConfirmDialog, ErrorAlert, formatDate, PageHeader, Skeleton, useCan } from "@admin/panel";

export function NoteDetailPage() {
  const id = Number(useParams().id);
  const note = useNote(id);
  const can = useCan();
  const del = useDeleteNote();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);

  return (
    <>
      <Link to="/notes" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Notlar
      </Link>
      {note.isPending ? (
        <Skeleton className="h-64" />
      ) : note.isError ? (
        <ErrorAlert error={note.error} />
      ) : (
        <>
          <PageHeader
            title={note.data.title}
            description={`Oluşturulma ${formatDate(note.data.createdAt)} · Güncellenme ${formatDate(note.data.updatedAt)}`}
            actions={
              can("notes.write") && (
                <>
                  <Button variant="danger-ghost" onClick={() => setConfirm(true)}>
                    <Trash2 /> Sil
                  </Button>
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    <Pencil /> Düzenle
                  </Button>
                </>
              )
            }
          />
          <Card className="p-6">
            {note.data.body ? (
              <p className="leading-relaxed whitespace-pre-wrap">{note.data.body}</p>
            ) : (
              <p className="text-muted">İçerik yok.</p>
            )}
          </Card>
          <NoteEditor note={note.data} open={editing} onOpenChange={setEditing} />
          <ConfirmDialog
            open={confirm}
            onOpenChange={setConfirm}
            title="Not silinsin mi?"
            description="Bu işlem geri alınamaz."
            loading={del.isPending}
            onConfirm={() =>
              del.mutate(id, {
                onSuccess: () => {
                  toast.success("Not silindi");
                  navigate("/notes", { replace: true });
                },
              })
            }
          />
        </>
      )}
    </>
  );
}
