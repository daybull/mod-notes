import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Schemas, unwrap } from "@admin/panel";

/** notes modülünün uç noktaları (backend: bu reponun kökü). */
export type Note = Schemas["NotesNote"];
export type NoteBody = Schemas["NotesNoteBody"];

const all = ["notes"] as const;

export function useNotes(query: { limit: number; offset: number }) {
  return useQuery({
    queryKey: [...all, query],
    queryFn: () => unwrap(api.GET("/api/v1/notes", { params: { query } })),
    placeholderData: keepPreviousData,
  });
}

/** Genel bakış kartı için toplam sayı. */
export function useNotesCount(enabled: boolean) {
  return useQuery({
    queryKey: [...all, "count"],
    queryFn: async () => (await unwrap(api.GET("/api/v1/notes", { params: { query: { limit: 1 } } }))).total,
    enabled,
  });
}

export function useNote(id: number) {
  return useQuery({
    queryKey: [...all, "detail", id],
    queryFn: () => unwrap(api.GET("/api/v1/notes/{id}", { params: { path: { id } } })),
  });
}

export function useSaveNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: NoteBody }) =>
      id
        ? unwrap(api.PUT("/api/v1/notes/{id}", { params: { path: { id } }, body }))
        : unwrap(api.POST("/api/v1/notes", { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: all }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(api.DELETE("/api/v1/notes/{id}", { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: all }),
  });
}
