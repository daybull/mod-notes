# mod-notes

[admin-core](https://github.com/daybull-corp/admin-core) için örnek modül: not ekleme, listeleme, düzenleme, silme.
Yeni modüller bu reponun yapısını izler.

## Yapı

```
mod-notes/
├── notes.go          backend: manifest, uç noktalar (/api/v1/notes)
├── migrations/       modülün tabloları (goose)
├── web/              panel ekranları (admin-panel bu klasörü kurar)
│   ├── index.tsx     PanelModule: rotalar + genel bakış kartı
│   └── api.ts        React Query kancaları
├── go.mod            Go modülü: github.com/daybull-corp/mod-notes
└── package.json      npm paketi: @daybull/mod-notes (sadece web/)
```

- Backend sadece `admin-sdk/module`, huma ve pgx kullanır.
- Panel ekranları sadece `@admin/panel` (panelin modüllere açık arayüzü), react, react-router, React Query, lucide-react ve sonner kullanır.

## Kurulum

| Taraf | Nasıl |
|---|---|
| Çekirdek | `go get github.com/daybull-corp/mod-notes@v0.1.0` → `cmd/server/modules.go` listesine `notes.New()` |
| Panel | `npm install "@daybull/mod-notes@https://codeload.github.com/daybull-corp/mod-notes/tar.gz/refs/tags/v0.1.0"` → `src/modules/index.ts` listesine `notesModule` |

## Yetkiler

| Yetki | Ne açar |
|---|---|
| `notes.read` | Not listesi ve detayı, genel bakış kartı |
| `notes.write` | Not ekleme, düzenleme, silme |

## Ayarlar

Panelde Modüller → Notlar → Ayarlar (`modules.settings` yetkisi). Örnek ayar nasıl tanımlanır ve okunur: `notes.go` → `Settings` ve `checkBody`.

| Ayar | Tip | Varsayılan | Ne yapar |
|---|---|---|---|
| `body_limit` | sayı (1–20000) | 20000 | Not metninin en fazla karakter sayısı |

## Sürüm

Backend ve panel ekranları **aynı git etiketiyle** sürümlenir (`v0.x.y`). Uç nokta değişince ikisi birlikte güncellenir.
