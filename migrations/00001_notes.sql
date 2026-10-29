-- +goose Up
-- Modül tabloları modül kimliğiyle başlar; başka modüllerle çakışmaz.
CREATE TABLE notes (
    id         BIGSERIAL PRIMARY KEY,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL DEFAULT '',
    created_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE notes;
