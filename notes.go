// Package notes, örnek modüldür: backend (bu paket) ve panel ekranları (web/)
// aynı repodadır. Sadece admin-sdk/module, huma ve pgx kullanır; çekirdeğin
// internal paketlerine dokunmaz.
package notes

import (
	"context"
	"embed"
	"errors"
	"io/fs"
	"net/http"
	"strconv"
	"time"
	"unicode/utf8"

	"github.com/danielgtaylor/huma/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/daybull-corp/admin-sdk/module"
)

//go:embed migrations/*.sql
var migrations embed.FS

type Module struct {
	db       *pgxpool.Pool
	audit    module.Auditor
	settings module.Settings
}

// maxBody, not metninin şema sınırıdır; body_limit ayarı bunu aşamaz.
const maxBody = 20000

func New() *Module { return &Module{} }

func (m *Module) Manifest() module.Manifest {
	return module.Manifest{
		ID:          "notes",
		Name:        "Notlar",
		Version:     "1.0.0",
		Description: "Örnek modül: basit not ekleme, listeleme, düzenleme ve silme.",
		Requires:    module.ContractVersion,
		Permissions: []module.Permission{
			{Key: "notes.read", Description: "Notları görüntüleme"},
			{Key: "notes.write", Description: "Not ekleme, düzenleme ve silme"},
		},
		Menu: []module.MenuItem{
			{Label: "Notlar", Path: "/notes", Icon: "notebook", Permission: "notes.read"},
		},
		Settings: []module.Setting{{
			Key: "body_limit", Label: "Not metni en fazla (karakter)", Type: module.SettingNumber,
			Description: "Bu sınırı aşan notlar kaydedilmez. Mevcut notlar etkilenmez.",
			Default:     maxBody, Min: module.Ptr(1.0), Max: module.Ptr(float64(maxBody)),
		}},
	}
}

func (m *Module) Migrations() fs.FS {
	sub, _ := fs.Sub(migrations, "migrations")
	return sub
}

type Note struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	CreatedBy *int64    `json:"createdBy"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type noteBody struct {
	Title string `json:"title" minLength:"1" maxLength:"200"`
	Body  string `json:"body,omitempty" maxLength:"20000"`
}

type listInput struct {
	Limit  int `query:"limit" minimum:"1" maximum:"200" default:"50"`
	Offset int `query:"offset" minimum:"0" default:"0"`
}

type NoteList struct {
	Items []Note `json:"items"`
	Total int64  `json:"total"`
}

type listOutput struct{ Body NoteList }

type idInput struct {
	ID int64 `path:"id"`
}

type createInput struct{ Body noteBody }

type updateInput struct {
	ID   int64 `path:"id"`
	Body noteBody
}

type noteOutput struct{ Body Note }

// Register, yolları "/api/v1/notes" altında kaydeder (önek çekirdekten gelir).
func (m *Module) Register(api huma.API, deps module.Deps) error {
	m.db, m.audit, m.settings = deps.DB, deps.Audit, deps.Settings

	huma.Register(api, module.Protect(api, huma.Operation{
		OperationID: "notes-list", Method: http.MethodGet, Path: "",
		Summary: "Notları listele",
	}, "notes.read"), m.list)
	huma.Register(api, module.Protect(api, huma.Operation{
		OperationID: "notes-get", Method: http.MethodGet, Path: "/{id}",
		Summary: "Not detayı",
	}, "notes.read"), m.get)
	huma.Register(api, module.Protect(api, huma.Operation{
		OperationID: "notes-create", Method: http.MethodPost, Path: "",
		Summary: "Not oluştur", DefaultStatus: http.StatusCreated,
	}, "notes.write"), m.create)
	huma.Register(api, module.Protect(api, huma.Operation{
		OperationID: "notes-update", Method: http.MethodPut, Path: "/{id}",
		Summary: "Notu güncelle",
	}, "notes.write"), m.update)
	huma.Register(api, module.Protect(api, huma.Operation{
		OperationID: "notes-delete", Method: http.MethodDelete, Path: "/{id}",
		Summary: "Notu sil", DefaultStatus: http.StatusNoContent,
	}, "notes.write"), m.delete)
	return nil
}

const cols = `id, title, body, created_by, created_at, updated_at`

func (m *Module) list(ctx context.Context, in *listInput) (*listOutput, error) {
	out := &listOutput{}
	if err := m.db.QueryRow(ctx, `SELECT count(*) FROM notes`).Scan(&out.Body.Total); err != nil {
		return nil, err
	}
	rows, err := m.db.Query(ctx, `SELECT `+cols+` FROM notes ORDER BY id DESC LIMIT $1 OFFSET $2`, in.Limit, in.Offset)
	if err != nil {
		return nil, err
	}
	out.Body.Items, err = pgx.CollectRows(rows, pgx.RowToStructByPos[Note])
	return out, err
}

func (m *Module) get(ctx context.Context, in *idInput) (*noteOutput, error) {
	return m.one(ctx, `SELECT `+cols+` FROM notes WHERE id = $1`, in.ID)
}

// checkBody, not metnini body_limit ayarına göre kontrol eder.
func (m *Module) checkBody(ctx context.Context, body string) error {
	vals, err := m.settings.Values(ctx)
	if err != nil {
		return err
	}
	if limit := int(vals.Number("body_limit")); utf8.RuneCountInString(body) > limit {
		return huma.Error422UnprocessableEntity("not metni en fazla " + strconv.Itoa(limit) + " karakter olabilir")
	}
	return nil
}

func (m *Module) create(ctx context.Context, in *createInput) (*noteOutput, error) {
	if err := m.checkBody(ctx, in.Body.Body); err != nil {
		return nil, err
	}
	p := module.PrincipalFrom(ctx)
	out, err := m.one(ctx, `INSERT INTO notes (title, body, created_by) VALUES ($1, $2, $3) RETURNING `+cols,
		in.Body.Title, in.Body.Body, p.UserID)
	if err != nil {
		return nil, err
	}
	m.audit.Log(ctx, module.AuditEntry{Action: "notes.create", Entity: "note", EntityID: strconv.FormatInt(out.Body.ID, 10)})
	return out, nil
}

func (m *Module) update(ctx context.Context, in *updateInput) (*noteOutput, error) {
	if err := m.checkBody(ctx, in.Body.Body); err != nil {
		return nil, err
	}
	out, err := m.one(ctx, `UPDATE notes SET title = $2, body = $3, updated_at = now() WHERE id = $1 RETURNING `+cols,
		in.ID, in.Body.Title, in.Body.Body)
	if err != nil {
		return nil, err
	}
	m.audit.Log(ctx, module.AuditEntry{Action: "notes.update", Entity: "note", EntityID: strconv.FormatInt(in.ID, 10)})
	return out, nil
}

func (m *Module) delete(ctx context.Context, in *idInput) (*struct{}, error) {
	tag, err := m.db.Exec(ctx, `DELETE FROM notes WHERE id = $1`, in.ID)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, huma.Error404NotFound("not bulunamadı")
	}
	m.audit.Log(ctx, module.AuditEntry{Action: "notes.delete", Entity: "note", EntityID: strconv.FormatInt(in.ID, 10)})
	return nil, nil
}

func (m *Module) one(ctx context.Context, sql string, args ...any) (*noteOutput, error) {
	rows, err := m.db.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	n, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByPos[Note])
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, huma.Error404NotFound("not bulunamadı")
	}
	if err != nil {
		return nil, err
	}
	return &noteOutput{Body: n}, nil
}
