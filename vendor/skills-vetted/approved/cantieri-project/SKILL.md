---
name: cantieri-project
description: Skill interna per lavorare su CantierePro con focus su cronoprogramma, Gantt professionale, CPM, import cronoprogrammi, dashboard e integrazione Supabase.
---

# Cantieri Project

Usa questa skill quando il lavoro riguarda direttamente `CantierePro` e serve allinearsi alle convenzioni locali prima di progettare o modificare codice.

## Obiettivi

- Preservare il dominio del progetto: cantieri, cronoprogramma, SAL, imprese, documenti.
- Evitare refactor generici che rompano la logica di pianificazione già presente.
- Riutilizzare il Gantt custom e il motore CPM esistenti prima di introdurre librerie esterne.

## File chiave da leggere prima di intervenire

- `README.md`
- `src/pages/Cronoprogramma.jsx`
- `src/components/cronoprogramma/GanttAvanzato.jsx`
- `src/components/cronoprogramma/PrimusGantt.jsx`
- `src/hooks/useCPM.js`
- `src/utils/cpmEngine.js`
- `src/utils/planningModel.js`
- `src/utils/parseXLSXCronoprogramma.js`
- `supabase/migrate_cronoprogramma_planning.sql`

## Regole di lavoro

1. Tratta il Gantt custom come asset strategico del progetto.
2. Prima di proporre una nuova libreria, verifica se la stessa esigenza puo essere coperta estendendo:
   - il motore CPM;
   - il planning model;
   - i componenti `GanttAvanzato` o `PrimusGantt`.
3. Mantieni separati:
   - dominio planning;
   - rendering timeline;
   - import/parsing;
   - persistenza Supabase.
4. Non introdurre dipendenze di scheduling esterne senza motivazione tecnica forte su performance o UX.
5. Quando lavori sull'import, proteggi sempre:
   - date;
   - dipendenze;
   - coverage del parsing;
   - mapping del modello planning.

## Quando usare altre skill vendorizzate

- Usa `frontend-skill` o `ui-ux-pro-max` per migliorare UI e gerarchia visiva.
- Usa `security-best-practices` per audit e fix mirati di sicurezza.
- Usa `figma-implement-design` se arriva un link o nodo Figma.
- Usa `openai-docs` solo per parti AI/OpenAI.
- Usa `playwright` solo se serve browser automation reale e dopo review del rischio runtime.

## Output attesi

- Modifiche aderenti al dominio edile e al modello planning attuale.
- Nessuna perdita di dati su dipendenze, lag, percorso critico e import Excel.
- Nessun degrado di usabilita del cronoprogramma.
