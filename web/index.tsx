import { lazy } from "react";
import { type PanelModule, RequirePermission } from "@admin/panel";
import { NotesStatCard } from "./NotesStatCard";

const NotesPage = lazy(async () => ({ default: (await import("./NotesPage")).NotesPage }));
const NoteDetailPage = lazy(async () => ({ default: (await import("./NoteDetailPage")).NoteDetailPage }));

/** "notes" modülünün panel ekranları. Yollar backend manifestindeki menüyle aynı. */
export const notesModule: PanelModule = {
  id: "notes",
  dashboard: [{ permission: "notes.read", Card: NotesStatCard }],
  routes: [
    {
      path: "/notes",
      element: (
        <RequirePermission perm="notes.read">
          <NotesPage />
        </RequirePermission>
      ),
    },
    {
      path: "/notes/:id",
      element: (
        <RequirePermission perm="notes.read">
          <NoteDetailPage />
        </RequirePermission>
      ),
    },
  ],
};
