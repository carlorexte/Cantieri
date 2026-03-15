# CantierePro - Gestione Cantieri Edili

Applicazione per la gestione di cantieri edili con database **Supabase** e deploy su **Vercel**.

## 🚀 Quick Start

### 1. Installazione

```bash
npm install
```

### 2. Configurazione

Crea un file `.env.local` nella root del progetto:

```bash
cp .env.example .env.local
```

Modifica `.env.local` con le tue credenziali Supabase:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Setup Database

Connettiti al tuo database Supabase ed esegui lo script SQL:

```bash
# Apri la dashboard Supabase
https://your-project.supabase.co/dashboard/sql/new

# Copia e incolla il contenuto di supabase-schema.sql
```

### 4. Sviluppo

```bash
npm run dev
```

L'app sarà disponibile su http://localhost:5173

## 📦 Deploy su Vercel

### 1. Prepara le variabili d'ambiente

Su Vercel, aggiungi queste variabili d'ambiente:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Deploy

```bash
# Installa Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel
```

Oppure collega il repository GitHub a Vercel:
1. Vai su https://vercel.com/new
2. Importa il repository
3. Aggiungi le variabili d'ambiente
4. Deploy!

## 🗄️ Database Schema

Le tabelle principali sono:

- **cantieri**: I cantieri edili
- **attivita**: Attività del cronoprogramma
- **imprese**: Imprese e fornitori
- **documenti**: Documenti allegati
- **sal**: Stato Avanzamento Lavori
- **utenti**: Utenti del sistema

## 📊 Funzionalità

- ✅ Gestione cantieri
- ✅ Cronoprogramma con importazione Excel
- ✅ Diagramma di Gantt
- ✅ Gestione imprese e subappalti
- ✅ Documenti e allegati
- ✅ SAL (Stato Avanzamento Lavori)
- ✅ Dashboard e report

## 🛠️ Stack Tecnologico

- **Frontend**: React 18 + Vite
- **UI**: Radix UI + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Deploy**: Vercel
- **Gantt**: Custom con supporto CPM

## 📝 Note

- Non è richiesto backend separato, tutto il database è su Supabase
- Le API sono gestite direttamente dal frontend tramite Supabase Client
- L'autenticazione può essere implementata con Supabase Auth

## 🔗 Link Utili

- [Dashboard Supabase](https://hcxcflnokutxvxiritgf.supabase.co)
- [Documentazione Supabase](https://supabase.com/docs)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Documentazione Vercel](https://vercel.com/docs)
