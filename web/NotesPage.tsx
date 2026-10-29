import { NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { useDeleteNote, useNotes, useSaveNote, type Note } from "./api";
import { ApiError, Button, Card, ConfirmDialog, Dialog, EmptyState, ErrorAlert, errorMessage, Field, Input, PageHeader, Pagination, SkeletonRows, Table, Td, Textarea, Th, timeAgo, Tr, useCan, useDisclosure } from "@admin/panel";

const LIMIT = 20;

/** notes.read: liste · notes.write: oluştur/düzenle/sil */
export function NotesPage() {
  const can = useCan();
  const writable = can("notes.write");
  const [params, setParams] = useSearchParams();
  const offset = Number(params.get("offset")) || 0;
  const notes = useNotes({ limit: LIMIT, offset });
  const editor = useDisclosure<Note | "new">();
  const remove = useDisclosure<Note>();
  const del = useDeleteNote();
  const items = notes.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Notlar"
        description="Örnek modül: yeni modül ekranları bu klasörü kopyalayarak başlar."
        actions={
          writable && (
            <Button onClick={() => editor.show("new")}>
              <Plus /> Yeni not
            </Button>
          )
        }
      />

      <Card>
        {notes.isError ? (
          <div className="p-4">
            <ErrorAlert error={notes.error} />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Başlık</Th>
                <Th className="hidden md:table-cell">Güncellenme</Th>
                {writable && <Th className="w-24" />}
              </tr>
            </thead>
            <tbody>
              {notes.isPending ? (
                <SkeletonRows cols={writable ? 3 : 2} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    <EmptyState
                      icon={NotebookPen}
                      title="Henüz not yok"
                      action={writable && <Button onClick={() => editor.show("new")}>İlk notu yaz</Button>}
                    />
                  </td>
                </tr>
              ) : (
                items.map((n) => (
                  <Tr key={n.id}>
                    <Td>
                      <Link to={`/notes/${n.id}`} className="font-medium hover:underline">
                        {n.title}
                      </Link>
                      {n.body && <p className="line-clamp-1 max-w-xl text-xs text-muted">{n.body}</p>}
                    </Td>
                    <Td className="hidden text-muted md:table-cell">{timeAgo(n.updatedAt)}</Td>
                    {writable && (
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" aria-label="Düzenle" onClick={() => editor.show(n)}>
                            <Pencil />
                          </Button>
                          <Button variant="danger-ghost" size="icon-sm" aria-label="Sil" onClick={() => remove.show(n)}>
                            <Trash2 />
                          </Button>
                        </div>
                      </Td>
                    )}
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        )}
        {notes.data && (
          <Pagination total={notes.data.total} limit={LIMIT} offset={offset} onChange={(o) => setParams({ offset: String(o) })} />
        )}
      </Card>

      <NoteEditor note={editor.value === "new" ? null : editor.value} open={editor.open} onOpenChange={editor.onOpenChange} />
      <ConfirmDialog
        open={remove.open}
        onOpenChange={remove.onOpenChange}
        title="Not silinsin mi?"
        description={remove.value && <>“{remove.value.title}” kalıcı olarak silinir.</>}
        loading={del.isPending}
        onConfirm={() =>
          remove.value &&
          del.mutate(remove.value.id, {
            onSuccess: () => {
              toast.success("Not silindi");
              remove.close();
            },
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      />
    </>
  );
}

export function NoteEditor({ note, open, onOpenChange }: { note: Note | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSaveNote();
  const [form, setForm] = useState({ title: "", body: "" });
  const fe = save.error instanceof ApiError ? save.error.fieldErrors : {};

  useEffect(() => {
    if (open) setForm({ title: note?.title ?? "", body: note?.body ?? "" });
    else save.reset();
  }, [open, note]);

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate(
      { id: note?.id, body: { title: form.title.trim(), body: form.body } },
      {
        onSuccess: () => {
          toast.success(note ? "Not güncellendi" : "Not oluşturuldu");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={note ? "Notu düzenle" : "Yeni not"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button type="submit" form="note-form" loading={save.isPending} disabled={!form.title.trim()}>
            Kaydet
          </Button>
        </>
      }
    >
      <form id="note-form" onSubmit={submit} className="space-y-4 pb-2" noValidate>
        {save.isError && !Object.keys(fe).length && <ErrorAlert error={save.error} />}
        <Field label="Başlık" htmlFor="n-title" error={fe.title}>
          <Input id="n-title" autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="İçerik" htmlFor="n-body" error={fe.body}>
          <Textarea id="n-body" rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </Field>
      </form>
    </Dialog>
  );
}
