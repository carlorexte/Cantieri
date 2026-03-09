import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Helper for dates
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString().split('T')[0];
};

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Dataset Generators
const generatePersone = () => [
    { nome: "Mario", cognome: "Rossi", qualifica: "Architetto", email: "mario.rossi@example.com", telefono: "3331112223", note: "Direttore Lavori esperto" },
    { nome: "Luigi", cognome: "Verdi", qualifica: "Ingegnere", email: "luigi.verdi@example.com", telefono: "3334445556", note: "Strutturista" },
    { nome: "Giulia", cognome: "Bianchi", qualifica: "Geometra", email: "giulia.bianchi@example.com", telefono: "3337778889", note: "Contabilità di cantiere" },
    { nome: "Anna", cognome: "Neri", qualifica: "CSP/CSE", email: "anna.neri@example.com", telefono: "3330001112", note: "Responsabile Sicurezza" },
    { nome: "Marco", cognome: "Gialli", qualifica: "Ingegnere", email: "marco.gialli@example.com", telefono: "3339990001", note: "Collaudatore" }
];

const generateImprese = () => [
    { ragione_sociale: "Costruzioni Generali SpA", partita_iva: "12345678901", email: "info@costruzionigenerali.it", telefono: "021234567", citta_legale: "Milano" },
    { ragione_sociale: "Elettrica Veloce Srl", partita_iva: "23456789012", email: "amm@elettricaveloce.it", telefono: "061234567", citta_legale: "Roma" },
    { ragione_sociale: "Idraulica e Affini Snc", partita_iva: "34567890123", email: "contatti@idraulica.com", telefono: "011123456", citta_legale: "Torino" },
    { ragione_sociale: "Finiture di Pregio Sas", partita_iva: "45678901234", email: "info@finiture.it", telefono: "081123456", citta_legale: "Napoli" },
    { ragione_sociale: "Scavi & Movimento Terra Srl", partita_iva: "56789012345", email: "scavi@terra.it", telefono: "051123456", citta_legale: "Bologna" }
];

const generateCantieri = (personeIds, currentUser) => {
    const today = new Date().toISOString().split('T')[0];
    
    return [
        {
            denominazione: "Residenza Green Living",
            numero_cantiere: 2024001,
            indirizzo: "Via dei Pini 15",
            indirizzo_citta: "Milano",
            oggetto_lavori: "Costruzione nuovo complesso residenziale di 20 unità abitative classe A4",
            data_inizio: addDays(today, -60),
            data_fine_prevista: addDays(today, 300),
            importo_contratto: 2500000,
            stato: "attivo",
            tipologia_appalto: "a_corpo",
            committente_ragione_sociale: "Immobiliare Futura Srl",
            direttore_lavori_id: getRandomItem(personeIds),
            responsabile_sicurezza_id: getRandomItem(personeIds),
            created_by: currentUser.email
        },
        {
            denominazione: "Ristrutturazione Scuola Pascoli",
            numero_cantiere: 2024002,
            indirizzo: "Piazza della Repubblica 1",
            indirizzo_citta: "Torino",
            oggetto_lavori: "Adeguamento sismico ed efficientamento energetico scuola primaria",
            data_inizio: addDays(today, -120),
            data_fine_prevista: addDays(today, 60),
            importo_contratto: 850000,
            stato: "attivo",
            tipologia_appalto: "a_misura",
            committente_ragione_sociale: "Comune di Torino",
            codice_cig: "8877665544",
            codice_cup: "B12C34000010001",
            direttore_lavori_id: getRandomItem(personeIds),
            responsabile_sicurezza_id: getRandomItem(personeIds),
            created_by: currentUser.email
        },
        {
            denominazione: "Polo Logistico Amazonia",
            numero_cantiere: 2024003,
            indirizzo: "Zona Industriale Nord",
            indirizzo_citta: "Piacenza",
            oggetto_lavori: "Realizzazione capannone industriale prefabbricato 5000mq",
            data_inizio: addDays(today, -10),
            data_fine_prevista: addDays(today, 180),
            importo_contratto: 1200000,
            stato: "attivo",
            tipologia_appalto: "a_corpo",
            committente_ragione_sociale: "Logistica Italia SpA",
            direttore_lavori_id: getRandomItem(personeIds),
            responsabile_sicurezza_id: getRandomItem(personeIds),
            created_by: currentUser.email
        },
        {
            denominazione: "Palazzo Storico Centro",
            numero_cantiere: 2023045,
            indirizzo: "Corso Vannucci 10",
            indirizzo_citta: "Perugia",
            oggetto_lavori: "Restauro facciate e consolidamento strutturale edificio vincolato",
            data_inizio: addDays(today, -300),
            data_fine_prevista: addDays(today, -10), // In ritardo
            importo_contratto: 450000,
            stato: "sospeso",
            tipologia_appalto: "a_misura",
            committente_ragione_sociale: "Condominio Vannucci",
            direttore_lavori_id: getRandomItem(personeIds),
            responsabile_sicurezza_id: getRandomItem(personeIds),
            created_by: currentUser.email
        }
    ];
};

// Gantt / WBS Generator
const generateWBS = (cantiere) => {
    const cId = cantiere.id;
    const start = new Date(cantiere.data_inizio);
    const wbs = [];

    // Phase 1: Preliminari
    const fase1Start = start;
    const fase1End = new Date(start); fase1End.setDate(fase1End.getDate() + 15);
    wbs.push({
        cantiere_id: cId, descrizione: "ALLESTIMENTO CANTIERE", tipo_attivita: "raggruppamento",
        data_inizio: fase1Start.toISOString().split('T')[0], data_fine: fase1End.toISOString().split('T')[0],
        livello: 0, wbs_code: "1", categoria: "preparazione", importo_previsto: 15000
    });
    wbs.push({
        cantiere_id: cId, descrizione: "Recinzione e baraccamenti", tipo_attivita: "task",
        data_inizio: addDays(fase1Start, 0), data_fine: addDays(fase1Start, 5),
        livello: 1, wbs_code: "1.1", categoria: "preparazione", importo_previsto: 5000, parent_index: 0
    });
    wbs.push({
        cantiere_id: cId, descrizione: "Allacciamenti provvisori", tipo_attivita: "task",
        data_inizio: addDays(fase1Start, 5), data_fine: addDays(fase1Start, 10),
        livello: 1, wbs_code: "1.2", categoria: "preparazione", importo_previsto: 3000, parent_index: 0
    });
     wbs.push({
        cantiere_id: cId, descrizione: "Montaggio Gru", tipo_attivita: "milestone",
        data_inizio: addDays(fase1Start, 15), data_fine: addDays(fase1Start, 15),
        livello: 1, wbs_code: "1.3", categoria: "preparazione", importo_previsto: 7000, parent_index: 0
    });

    // Phase 2: Strutture
    const fase2Start = new Date(fase1End);
    const fase2End = new Date(fase2Start); fase2End.setDate(fase2End.getDate() + 60);
    wbs.push({
        cantiere_id: cId, descrizione: "OPERE STRUTTURALI", tipo_attivita: "raggruppamento",
        data_inizio: fase2Start.toISOString().split('T')[0], data_fine: fase2End.toISOString().split('T')[0],
        livello: 0, wbs_code: "2", categoria: "strutture", importo_previsto: 120000
    });
    wbs.push({
        cantiere_id: cId, descrizione: "Scavi di fondazione", tipo_attivita: "task",
        data_inizio: addDays(fase2Start, 0), data_fine: addDays(fase2Start, 10),
        livello: 1, wbs_code: "2.1", categoria: "strutture", importo_previsto: 20000, parent_index: 4, percentuale_completamento: 100
    });
    wbs.push({
        cantiere_id: cId, descrizione: "Getto fondazioni", tipo_attivita: "task",
        data_inizio: addDays(fase2Start, 10), data_fine: addDays(fase2Start, 20),
        livello: 1, wbs_code: "2.2", categoria: "strutture", importo_previsto: 40000, parent_index: 4, percentuale_completamento: 80
    });
    wbs.push({
        cantiere_id: cId, descrizione: "Elevazioni p.t.", tipo_attivita: "task",
        data_inizio: addDays(fase2Start, 20), data_fine: addDays(fase2Start, 40),
        livello: 1, wbs_code: "2.3", categoria: "strutture", importo_previsto: 30000, parent_index: 4, percentuale_completamento: 30
    });
    wbs.push({
        cantiere_id: cId, descrizione: "Solaio primo piano", tipo_attivita: "task",
        data_inizio: addDays(fase2Start, 40), data_fine: addDays(fase2Start, 60),
        livello: 1, wbs_code: "2.4", categoria: "strutture", importo_previsto: 30000, parent_index: 4, percentuale_completamento: 0
    });

    // Phase 3: Impianti (Parallel to Structures partially)
    const fase3Start = new Date(fase2Start); fase3Start.setDate(fase3Start.getDate() + 30);
    const fase3End = new Date(fase3Start); fase3End.setDate(fase3End.getDate() + 40);
    wbs.push({
        cantiere_id: cId, descrizione: "IMPIANTI", tipo_attivita: "raggruppamento",
        data_inizio: fase3Start.toISOString().split('T')[0], data_fine: fase3End.toISOString().split('T')[0],
        livello: 0, wbs_code: "3", categoria: "impianti", importo_previsto: 80000
    });
    wbs.push({
        cantiere_id: cId, descrizione: "Predisposizioni elettriche", tipo_attivita: "task",
        data_inizio: addDays(fase3Start, 0), data_fine: addDays(fase3Start, 15),
        livello: 1, wbs_code: "3.1", categoria: "impianti", importo_previsto: 15000, parent_index: 9
    });
    wbs.push({
        cantiere_id: cId, descrizione: "Predisposizioni idrauliche", tipo_attivita: "task",
        data_inizio: addDays(fase3Start, 10), data_fine: addDays(fase3Start, 25),
        livello: 1, wbs_code: "3.2", categoria: "impianti", importo_previsto: 18000, parent_index: 9
    });

    return wbs;
};

// Main function
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized. Admin required.' }, { status: 403 });
        }

        // 1. Create People
        const personeCreated = await base44.asServiceRole.entities.PersonaEsterna.bulkCreate(generatePersone());
        const personeIds = personeCreated.map(p => p.id);
        
        // 2. Create Companies
        const impreseCreated = await base44.asServiceRole.entities.Impresa.bulkCreate(generateImprese());
        const impreseIds = impreseCreated.map(i => i.id);

        // 3. Create Cantieri
        const cantieriData = generateCantieri(personeIds, user);
        const cantieriCreated = await base44.asServiceRole.entities.Cantiere.bulkCreate(cantieriData);

        // 4. Populate details for each Cantiere
        let totalAttivita = 0;
        let totalCosti = 0;
        let totalDocs = 0;

        for (const cantiere of cantieriCreated) {
            // A. Gantt Activities
            const wbsData = generateWBS(cantiere);
            // Need to handle parent IDs. First insert roots (level 0), then children.
            // Simplified: insert all, then fix relationships? Or insert sequentially.
            // Better: Insert array. For parent linkage, we'll do a trick or just simple list for now.
            // Actually, let's insert Level 0 first, capture IDs, then Level 1.
            
            const level0 = wbsData.filter(w => w.livello === 0);
            const level0Created = await base44.asServiceRole.entities.Attivita.bulkCreate(level0);
            
            // Map index from wbsData to real DB ID
            // We need to match created items back to wbsData to assign parent_ids for children.
            // Simplified approach: Create parent, use its ID for children.
            
            // Let's iterate the 'parent_index' logic:
            // wbsData items have 'parent_index' pointing to index in wbsData array.
            // We can't bulk create easily with dependencies. Let's do loops (slower but correct).
            // Optimization: Filter by root, create, then filter by children of that root.
            
            const realIds = new Map(); // index in wbsData -> dbId
            
            for (let i = 0; i < wbsData.length; i++) {
                const item = wbsData[i];
                if (item.livello === 0) {
                    const res = await base44.asServiceRole.entities.Attivita.create(item);
                    realIds.set(i, res.id);
                } else {
                    // It's a child
                    const parentRealId = realIds.get(item.parent_index);
                    if (parentRealId) {
                        item.parent_id = parentRealId;
                        delete item.parent_index; // cleanup
                        await base44.asServiceRole.entities.Attivita.create(item);
                    }
                }
            }
            totalAttivita += wbsData.length;

            // B. Subcontracts
            const subImpresa = impreseCreated[getRandomInt(0, impreseCreated.length - 1)];
            await base44.asServiceRole.entities.Subappalto.create({
                cantiere_id: cantiere.id,
                impresa_id: subImpresa.id,
                ragione_sociale: subImpresa.ragione_sociale,
                importo_contratto: Math.round(cantiere.importo_contratto * 0.15),
                categoria_lavori: "impianti_elettrici",
                stato: "attivo",
                data_firma_contratto: cantiere.data_inizio
            });

            // C. Costs
            const costi = [
                { cantiere_id: cantiere.id, categoria: "materiali", descrizione: "Fornitura Calcestruzzo", importo: 12000, data_sostenimento: cantiere.data_inizio, fornitore: "Beton Srl", stato_pagamento: "pagato" },
                { cantiere_id: cantiere.id, categoria: "manodopera", descrizione: "Stipendi mese 1", importo: 25000, data_sostenimento: addDays(cantiere.data_inizio, 30), stato_pagamento: "pagato" },
                { cantiere_id: cantiere.id, categoria: "noli", descrizione: "Noleggio Gru", importo: 3500, data_sostenimento: addDays(cantiere.data_inizio, 15), fornitore: "NoloPoint", stato_pagamento: "da_pagare" }
            ];
            await base44.asServiceRole.entities.Costo.bulkCreate(costi);
            totalCosti += costi.length;

            // D. SAL
            await base44.asServiceRole.entities.SAL.create({
                cantiere_id: cantiere.id,
                tipo_prestazione: "lavori",
                tipo_sal_dettaglio: "sal_progressivo",
                numero_sal: 1,
                data_sal: addDays(cantiere.data_inizio, 30),
                descrizione: "SAL 1 - Scavi e Fondazioni",
                imponibile: 45000,
                iva_percentuale: 10,
                iva_importo: 4500,
                totale_fattura: 49500,
                stato_pagamento: "fatturato"
            });

            // E. Material Orders
            await base44.asServiceRole.entities.OrdineMateriale.create({
                cantiere_id: cantiere.id,
                descrizione: "Ferro per armatura",
                fornitore_ragione_sociale: "Siderurgica Nord",
                data_ordine: addDays(cantiere.data_inizio, 5),
                stato: "approvato",
                importo_totale: 8500,
                priorita: "alta",
                responsabile_id: user.id
            });
            
             // F. Internal Activities
            await base44.asServiceRole.entities.AttivitaInterna.create({
                cantiere_id: cantiere.id,
                descrizione: "Verifica DURC imprese",
                assegnatario_id: user.id,
                data_assegnazione: cantiere.data_inizio,
                priorita: "media",
                stato: "completato"
            });
            
            // G. Documents
            await base44.asServiceRole.entities.Documento.create({
                nome_documento: "Contratto d'Appalto",
                tipo_documento: "contratto_appalto",
                categoria_principale: "contratti",
                entita_collegate: [{ entita_id: cantiere.id, entita_tipo: "cantiere" }],
                percorso_nas: "/contratti/2024/001.pdf",
                data_emissione: addDays(cantiere.data_inizio, -10),
                descrizione: "Contratto firmato con committenza"
            });
             totalDocs++;

        }

        return Response.json({
            success: true,
            message: `DB Populated Successfully!`,
            stats: {
                cantieri: cantieriCreated.length,
                persone: personeCreated.length,
                imprese: impreseCreated.length,
                attivita: totalAttivita,
                costi: totalCosti,
                documenti: totalDocs
            }
        });

    } catch (error) {
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
});