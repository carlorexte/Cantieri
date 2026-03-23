# CantierePro — CLAUDE.md

Guida per Claude Code su questo progetto. Leggila integralmente prima di fare qualsiasi modifica.

---

## 1. Panoramica del progetto

**CantierePro** è una web app SaaS per la gestione di cantieri edili. Funzionalità principali:
- Gestione cantieri, imprese, subappalti
- Cronoprogramma con diagramma di Gantt e algoritmo CPM
- SAL (Stato Avanzamento Lavori) con avanzamento percentuale
- Gestione documenti, costi, ordini materiali, attività interne
- RBAC (Role-Based Access Control) granulare per modulo
- AI Assistant integrato
- Import Cronoprogramma da Excel con parsing intelligente

**Stack:**

| Layer | Tech |
|-------|------|
| Build | Vite 6 |
| Frontend | React 18 + React Router 7 |
| Styling | Tailwind CSS 3.4 + Radix UI |
| State | TanStack React Query v5 |
| Auth | Supabase Auth (OAuth + email) |
| Database | Supabase (PostgreSQL) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Export | xlsx, jsPDF, html2canvas |
| Deploy | Vercel (frontend) + Supabase (backend) |

---

## 2. Struttura directory

```
cantierepro/
├── api/                    # Vercel serverless functions (ESM)
│   ├── analyze-gantt.js
│   └── invite-user.js
├── functions/              # Utility TypeScript per import/analisi
├── supabase/functions/     # Supabase Edge Functions
│   └── analyze-gantt/index.ts
├── src/
│   ├── main.jsx            # Entry point React
│   ├── App.jsx             # Router principale + AuthProvider
│   ├── Layout.jsx          # Sidebar navigation wrapper
│   ├── pages/              # 27 pagine (una per route)
│   ├── components/
│   │   ├── ui/             # Componenti Radix UI (NON modificare direttamente)
│   │   ├── shared/         # PermissionGuard, DataContext
│   │   └── [feature]/      # Componenti per feature (cronoprogramma, sal, ecc.)
│   ├── lib/
│   │   ├── supabaseClient.js  # Client Supabase + tutte le query CRUD
│   │   ├── AuthContext.jsx    # Stato autenticazione
│   │   └── query-client.js    # Config React Query
│   └── utils/              # Business logic (CPM, parser Excel, AI agent)
├── vite.config.js
├── vercel.json
├── tailwind.config.js
└── jsconfig.json           # Path alias: @ → ./src
```

---

## 3. Comandi principali

```bash
npm run dev          # Dev server Vite (porta 5173)
npm run dev:api      # Express API locale (porta 3000, per testare /api/*)
npm run build        # Build produzione
npm run lint         # ESLint
npm run typecheck    # TypeScript check
```

Dev proxy: `/api/*` viene proxato a `http://localhost:3000` in sviluppo.

---

## 4. Variabili d'ambiente

File: `.env.local` (non committato)

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_REMOTE_LOGGER_URL=           # opzionale
```

Le variabili client usano prefisso `VITE_` e si accedono con `import.meta.env.VITE_*`.

Le funzioni serverless (`api/`) usano `process.env.*` senza prefisso VITE (configurate in Vercel Dashboard).

---

## 5. Database — tabelle principali Supabase

| Tabella | Descrizione |
|---------|-------------|
| `cantieri` | Cantieri/progetti |
| `attivita` | Attività con gerarchia WBS |
| `imprese` | Imprese e subappaltatori |
| `documenti` | Documenti allegati |
| `sal` | Stato Avanzamento Lavori |
| `costi` | Tracking costi |
| `ordini_materiale` | Ordini materiali |
| `attivita_interne` | Attività interne |
| `persone_esterne` | Professionisti esterni |
| `subappalto` | Subappalti |
| `profiles` | Profili utente + RBAC |
| `ruoli` | Ruoli (sistema e custom) |
| `teams` | Team |
| `team_members` | Appartenenza team |
| `team_cantieri` | Assegnazione cantieri ai team |

Tutte le query al DB passano per `src/lib/supabaseClient.js`. **Non scrivere query Supabase direttamente nei componenti** — aggiungile sempre in supabaseClient.js.

---

## 6. Autenticazione e RBAC

- `src/lib/AuthContext.jsx` — provider con `useAuth()` hook
- Login via Supabase Auth (OAuth Google + email/password)
- `src/components/shared/PermissionGuard.jsx` — wrappa feature per permessi
- Hook `usePermissions()` — controlla ruolo/modulo/azione

Permessi strutturati per modulo (`cantieri`, `sal`, `documenti`, ecc.) e azione (`view`, `edit`, `delete`, `approve`, `accept`, `archive`).

---

## 7. Pattern e convenzioni

### Componenti
- Funzionali con hooks, nessuna class component
- JSX non TypeScript (eccetto in `functions/` e `supabase/functions/`)
- Importa UI da `@/components/ui/*` (alias configurato in jsconfig.json)
- **Non modificare i file in `src/components/ui/`** — sono la libreria Radix generata

### Stile
- Tailwind CSS utility-first
- Variabili CSS custom per colori (`--primary`, `--sidebar-*`, ecc. in index.css)
- Dark mode via classe `.dark`
- `cn()` utility da `src/lib/utils.js` per classi condizionali

### Data fetching
- React Query per tutte le chiamate async
- Query key convention: `['entità', filtri]`
- Mutations con `useMutation` + invalidazione cache dopo successo

### Routing
- React Router v7
- Route dinamica `/:pagename` → matching da `pages.config.js`
- Pagine protette: redirect a `/login` se non autenticato

### Internazionalizzazione
- L'app è in **italiano** — label, messaggi, commenti nel codice devono essere in italiano

---

## 8. Cronoprogramma e CPM

Modulo critico e complesso. File chiave:
- `src/utils/cpmEngine.js` — algoritmo CPM (Critical Path Method)
- `src/utils/parseXLSXCronoprogramma.js` — parser Excel Gantt
- `src/utils/cronoprogrammaAIAgent.js` — interpretazione AI
- `src/components/cronoprogramma/GanttAvanzato.jsx` — Gantt principale
- `src/components/cronoprogramma/PrimusGantt.jsx` — Gantt alternativo
- `src/components/cronoprogramma/ImportCronoprogrammaForm.jsx` — form import

Colonne Excel supportate (alcune opzionali): `parent_id`, `vincolo_tipo`, date baseline.

---

## 9. Deploy

**Frontend:** Vercel
- Build: `npm run build` → `dist/`
- SPA rewrite: tutte le route non-API → `index.html`
- Cache lunga per `/assets/*`

**Backend API:** Vercel Serverless Functions (`api/`)
- Formato ESM (`export default`)
- Variabili env configurate in Vercel Dashboard (non nel repo)

**Edge Functions:** Supabase (`supabase/functions/`)
- Deploy con Supabase CLI

---

## 10. Regole operative per Claude

1. **Leggi sempre il file prima di modificarlo.** Non proporre cambiamenti senza aver letto il codice.
2. **Non creare file inutili.** Preferisci sempre modificare un file esistente.
3. **Non toccare `src/components/ui/`** — è la libreria Radix generata, non custom.
4. **Tutte le query DB in supabaseClient.js** — mai query Supabase inline nei componenti.
5. **L'interfaccia è in italiano** — testi, label, messaggi toast devono essere in italiano.
6. **Non aggiungere feature non richieste** — zero over-engineering.
7. **Non aggiungere commenti ovvi** — commenta solo logica non evidente.
8. **Le funzioni serverless in `api/` devono restare in formato ESM** (`export default handler`).
9. **Non committare mai** senza esplicita richiesta dell'utente.
10. **Le variabili d'ambiente `VITE_*`** sono client-side; quelle in `api/` usano `process.env` senza prefisso.
