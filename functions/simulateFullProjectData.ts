import { createClientFromRequest } from 'npm:@base44/sdk@0.8.3';
import { addDays, subDays, format } from 'npm:date-fns@3.6.0';

export const handler = async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
        }

        const logs = [];
        const today = new Date();
        
        // 1. Get or Create Imprese (need at least 2)
        let imprese = await base44.entities.Impresa.list();
        if (imprese.length < 2) {
            const newImpresa1 = await base44.entities.Impresa.create({
                ragione_sociale: "Edilizia Rapida SRL",
                partita_iva: "IT" + Math.floor(Math.random() * 10000000000),
                email: "info@ediliziarapida.test",
                telefono: "0212345678"
            });
            const newImpresa2 = await base44.entities.Impresa.create({
                ragione_sociale: "Impianti Sicuri SpA",
                partita_iva: "IT" + Math.floor(Math.random() * 10000000000),
                email: "info@impiantisicuri.test",
                telefono: "0612345678"
            });
            imprese = [...imprese, newImpresa1, newImpresa2];
            logs.push("Create 2 imprese simulate.");
        }

        // 2. Create Cantiere
        const cantiere = await base44.entities.Cantiere.create({
            denominazione: `Cantiere Residenziale "Parco Verde" - Simulazione ${format(today, 'dd/MM')}`,
            indirizzo: "Via delle Querce 45",
            indirizzo_citta: "Milano",
            indirizzo_cap: "20100",
            stato: "attivo",
            data_inizio: format(subDays(today, 60), 'yyyy-MM-dd'),
            data_fine_prevista: format(addDays(today, 120), 'yyyy-MM-dd'),
            importo_contratto: 850000,
            codice_cig: "SIM" + Math.floor(Math.random() * 10000),
            descrizione: "Costruzione complesso residenziale simulato per test flussi.",
            committente_ragione_sociale: "Immobiliare Futura SRL"
        });
        logs.push(`Creato Cantiere: ${cantiere.denominazione}`);

        // 3. Create Subappalti (linked to Imprese)
        const subappalto = await base44.entities.Subappalto.create({
            cantiere_id: cantiere.id,
            impresa_id: imprese[0].id, // Link to first impresa
            ragione_sociale: imprese[0].ragione_sociale,
            importo_contratto: 150000,
            categoria_lavori: "impianti_elettrici",
            stato: "attivo",
            data_inizio: format(subDays(today, 10), 'yyyy-MM-dd'),
            data_fine_prevista: format(addDays(today, 40), 'yyyy-MM-dd')
        });
        logs.push("Creato Subappalto collegato.");

        // 4. Create Cronoprogramma (WBS structure with Delays for Alerts)
        
        // Phase 1: Foundations (Completed)
        const phase1 = await base44.entities.Attivita.create({
            cantiere_id: cantiere.id,
            descrizione: "Fase 1: Scavi e Fondamenta",
            tipo_attivita: "raggruppamento",
            wbs_code: "1",
            data_inizio: format(subDays(today, 60), 'yyyy-MM-dd'),
            data_fine: format(subDays(today, 30), 'yyyy-MM-dd'),
            importo_previsto: 100000,
            stato: "completata"
        });

        await base44.entities.Attivita.create({
            cantiere_id: cantiere.id,
            parent_id: phase1.id,
            descrizione: "Scavo sbancamento",
            tipo_attivita: "task",
            wbs_code: "1.1",
            data_inizio: format(subDays(today, 60), 'yyyy-MM-dd'),
            data_fine: format(subDays(today, 50), 'yyyy-MM-dd'),
            durata_giorni: 10,
            percentuale_completamento: 100,
            stato: "completata",
            importo_previsto: 40000,
            categoria: "preparazione"
        });

        // Phase 2: Structures (In Progress & DELAYED)
        const phase2 = await base44.entities.Attivita.create({
            cantiere_id: cantiere.id,
            descrizione: "Fase 2: Strutture in Elevazione",
            tipo_attivita: "raggruppamento",
            wbs_code: "2",
            data_inizio: format(subDays(today, 20), 'yyyy-MM-dd'),
            data_fine: format(addDays(today, 40), 'yyyy-MM-dd'),
            importo_previsto: 300000,
            stato: "in_corso"
        });

        // Delayed Task (Should trigger alert)
        await base44.entities.Attivita.create({
            cantiere_id: cantiere.id,
            parent_id: phase2.id,
            descrizione: "Getto pilastri P.T.",
            tipo_attivita: "task",
            wbs_code: "2.1",
            data_inizio: format(subDays(today, 20), 'yyyy-MM-dd'),
            data_fine: format(subDays(today, 5), 'yyyy-MM-dd'), // Ended 5 days ago!
            durata_giorni: 15,
            percentuale_completamento: 60, // Not finished
            stato: "in_ritardo", // Explicitly delayed
            importo_previsto: 50000,
            categoria: "strutture",
            note: "ALERT: Ritardo dovuto a maltempo, da recuperare."
        });

        // Future Task
        await base44.entities.Attivita.create({
            cantiere_id: cantiere.id,
            parent_id: phase2.id,
            descrizione: "Solaio primo piano",
            tipo_attivita: "task",
            wbs_code: "2.2",
            data_inizio: format(today, 'yyyy-MM-dd'),
            data_fine: format(addDays(today, 15), 'yyyy-MM-dd'),
            durata_giorni: 15,
            percentuale_completamento: 0,
            stato: "pianificata",
            importo_previsto: 80000,
            categoria: "strutture"
        });

        // Milestone
        await base44.entities.Attivita.create({
            cantiere_id: cantiere.id,
            parent_id: phase2.id,
            descrizione: "Fine Strutture Grezze",
            tipo_attivita: "milestone",
            wbs_code: "2.M",
            data_inizio: format(addDays(today, 40), 'yyyy-MM-dd'),
            data_fine: format(addDays(today, 40), 'yyyy-MM-dd'),
            durata_giorni: 0,
            stato: "pianificata"
        });
        
        logs.push("Generato Cronoprogramma WBS con ritardi simulati.");

        // 5. Create Ordini Materiale (Random)
        const materials = ["Cemento 32.5", "Ferro 12mm", "Mattoni forati", "Sabbia"];
        
        // Pending Order (Alert potential)
        await base44.entities.OrdineMateriale.create({
            cantiere_id: cantiere.id,
            numero_ordine: "ORD-" + Math.floor(Math.random() * 1000),
            descrizione: "Fornitura Ferro urgente",
            fornitore_ragione_sociale: "Ferramenta Pro SRL",
            data_ordine: format(subDays(today, 5), 'yyyy-MM-dd'), // 5 days ago
            stato: "in_attesa_approvazione", // Still pending
            priorita: "urgente",
            importo_totale: 12500,
            dettagli_materiali: [{ descrizione: "Tondini ferro 12mm", quantita: 500, unita_misura: "kg" }]
        });

        // Approved Order
        await base44.entities.OrdineMateriale.create({
            cantiere_id: cantiere.id,
            numero_ordine: "ORD-" + Math.floor(Math.random() * 1000),
            descrizione: "Fornitura Cemento",
            fornitore_ragione_sociale: "Edilizia Rapida SRL",
            data_ordine: format(subDays(today, 15), 'yyyy-MM-dd'),
            stato: "approvato",
            priorita: "media",
            importo_totale: 4500
        });
        logs.push("Generati Ordini Materiale (alcuni urgenti/in attesa).");

        // 6. Create SAL (Progress Payments)
        
        // SAL 1 (Paid)
        await base44.entities.SAL.create({
            cantiere_id: cantiere.id,
            tipo_prestazione: "lavori",
            tipo_sal_dettaglio: "sal_progressivo",
            numero_sal: 1,
            data_sal: format(subDays(today, 30), 'yyyy-MM-dd'),
            descrizione: "SAL 1 - Scavi e Fondamenta",
            importo_pagato: 90000,
            imponibile: 90000,
            stato_pagamento: "incassato",
            data_pagamento: format(subDays(today, 10), 'yyyy-MM-dd')
        });

        // SAL 2 (To be billed - Alert potential if old)
        await base44.entities.SAL.create({
            cantiere_id: cantiere.id,
            tipo_prestazione: "lavori",
            tipo_sal_dettaglio: "sal_progressivo",
            numero_sal: 2,
            data_sal: format(today, 'yyyy-MM-dd'), // Today
            descrizione: "SAL 2 - Strutture parziali",
            imponibile: 120000,
            stato_pagamento: "da_fatturare" // Action needed
        });
        logs.push("Generati SAL (Incassati e Da Fatturare).");

        // 7. Create Attivita Interne (Tasks for Office/Admin)
        const internalTasks = [
            {
                descrizione: "Controllo mail e PEC non lette",
                dettagli: "Verificare la casella PEC per comunicazioni ufficiali dal comune o enti.",
                priorita: "alta",
                stato: "da_fare",
                tipo_attivita: "amministrativa",
                data_scadenza: format(today, 'yyyy-MM-dd') // Due today
            },
            {
                descrizione: "Verifica DURC subappaltatori",
                dettagli: "Controllare validità DURC per Edilizia Rapida e Impianti Sicuri.",
                priorita: "critica",
                stato: "in_corso",
                tipo_attivita: "documentale",
                data_scadenza: format(subDays(today, 2), 'yyyy-MM-dd') // Overdue!
            },
            {
                descrizione: "Aggiornamento SAL gestionale",
                dettagli: "Inserire i dati del SAL 2 nel sistema di contabilità generale.",
                priorita: "media",
                stato: "da_fare",
                tipo_attivita: "contabile",
                data_scadenza: format(addDays(today, 2), 'yyyy-MM-dd')
            },
            {
                descrizione: "Archiviazione foto cantiere",
                dettagli: "Scaricare e catalogare le foto dello stato avanzamento lavori settimana scorsa.",
                priorita: "bassa",
                stato: "da_fare",
                tipo_attivita: "tecnica",
                data_scadenza: format(addDays(today, 5), 'yyyy-MM-dd')
            },
            {
                descrizione: "Verifica presenze operai",
                dettagli: "Controllare i report giornalieri di presenza inviati dal capocantiere.",
                priorita: "media",
                stato: "completato",
                tipo_attivita: "tecnica",
                data_scadenza: format(subDays(today, 1), 'yyyy-MM-dd'),
                data_completamento: format(subDays(today, 1), 'yyyy-MM-dd')
            }
        ];

        for (const task of internalTasks) {
            await base44.entities.AttivitaInterna.create({
                ...task,
                cantiere_id: cantiere.id,
                assegnatario_id: user.id, // Assign to current user (admin)
                data_assegnazione: format(today, 'yyyy-MM-dd')
            });
        }
        logs.push("Generate Attività Interne (PEC, DURC, SAL, Foto, ecc.).");

        return new Response(JSON.stringify({ 
            success: true, 
            logs,
            cantiere_id: cantiere.id 
        }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};