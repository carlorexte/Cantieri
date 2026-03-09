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

        // Prepare bulk arrays
        const allAttivitaL0 = [];
        const allAttivitaL1 = []; // Will process after L0 creation
        const allSubappalti = [];
        const allCosti = [];
        const allSAL = [];
        const allOrdini = [];
        const allAttivitaInterne = [];
        const allDocumenti = [];

        // Data Generation Loop (Prepare objects)
        for (const cantiere of cantieriCreated) {
            const cId = cantiere.id;
            const start = new Date(cantiere.data_inizio);

            // A. Prepare Level 0 Activities (Phases)
            const fase1Start = start;
            const fase1End = new Date(start); fase1End.setDate(fase1End.getDate() + 15);
            
            const fase2Start = new Date(fase1End);
            const fase2End = new Date(fase2Start); fase2End.setDate(fase2End.getDate() + 60);
            
            const fase3Start = new Date(fase2Start); fase3Start.setDate(fase3Start.getDate() + 30);
            const fase3End = new Date(fase3Start); fase3End.setDate(fase3End.getDate() + 40);

            // Create objects with a temporary ID property to link children later
            // We use 'wbs_code' as the unique key per cantiere
            
            allAttivitaL0.push(
                { cantiere_id: cId, description: "ALLESTIMENTO", wbs: "1", start: fase1Start, end: fase1End, cat: "preparazione", imp: 15000 },
                { cantiere_id: cId, description: "STRUTTURE", wbs: "2", start: fase2Start, end: fase2End, cat: "strutture", imp: 120000 },
                { cantiere_id: cId, description: "IMPIANTI", wbs: "3", start: fase3Start, end: fase3End, cat: "impianti", imp: 80000 }
            );

            // B. Subcontracts
            const subImpresa = impreseCreated[getRandomInt(0, impreseCreated.length - 1)];
            allSubappalti.push({
                cantiere_id: cId,
                impresa_id: subImpresa.id,
                ragione_sociale: subImpresa.ragione_sociale,
                importo_contratto: Math.round(cantiere.importo_contratto * 0.15),
                categoria_lavori: "impianti_elettrici",
                stato: "attivo",
                data_firma_contratto: cantiere.data_inizio
            });

            // C. Costs
            allCosti.push(
                { cantiere_id: cId, categoria: "materiali", descrizione: "Fornitura Calcestruzzo", importo: 12000, data_sostenimento: cantiere.data_inizio, fornitore: "Beton Srl", stato_pagamento: "pagato" },
                { cantiere_id: cId, categoria: "manodopera", descrizione: "Stipendi mese 1", importo: 25000, data_sostenimento: addDays(cantiere.data_inizio, 30), stato_pagamento: "pagato" },
                { cantiere_id: cId, categoria: "noli", descrizione: "Noleggio Gru", importo: 3500, data_sostenimento: addDays(cantiere.data_inizio, 15), fornitore: "NoloPoint", stato_pagamento: "da_pagare" }
            );

            // D. SAL
            allSAL.push({
                cantiere_id: cId,
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

            // E. Orders
            allOrdini.push({
                cantiere_id: cId,
                descrizione: "Ferro per armatura",
                fornitore_ragione_sociale: "Siderurgica Nord",
                data_ordine: addDays(cantiere.data_inizio, 5),
                stato: "approvato",
                importo_totale: 8500,
                priorita: "alta",
                responsabile_id: user.id
            });

            // F. Internal Tasks
            allAttivitaInterne.push({
                cantiere_id: cId,
                descrizione: "Verifica DURC imprese",
                assegnatario_id: user.id,
                data_assegnazione: cantiere.data_inizio,
                priorita: "media",
                stato: "completato"
            });

            // G. Documents
            allDocumenti.push({
                nome_documento: "Contratto d'Appalto",
                tipo_documento: "contratto_appalto",
                categoria_principale: "contratti",
                entita_collegate: [{ entita_id: cId, entita_tipo: "cantiere" }],
                percorso_nas: "/contratti/2024/001.pdf",
                data_emissione: addDays(cantiere.data_inizio, -10),
                descrizione: "Contratto firmato con committenza"
            });
        }

        // 4. Bulk Insert Level 0 Activities
        const l0ToInsert = allAttivitaL0.map(item => ({
            cantiere_id: item.cantiere_id,
            descrizione: item.description,
            tipo_attivita: "raggruppamento",
            data_inizio: item.start.toISOString().split('T')[0],
            data_fine: item.end.toISOString().split('T')[0],
            livello: 0,
            wbs_code: item.wbs,
            categoria: item.cat,
            importo_previsto: item.imp
        }));

        const l0Created = await base44.asServiceRole.entities.Attivita.bulkCreate(l0ToInsert);

        // 5. Create Map for Parent IDs (CantiereID + WBS -> DB_ID)
        const parentMap = {};
        for (const act of l0Created) {
            const key = `${act.cantiere_id}_${act.wbs_code}`;
            parentMap[key] = act.id;
        }

        // 6. Prepare Level 1 Activities
        for (const item of allAttivitaL0) { // Iterate configs to generate children
            const pId = parentMap[`${item.cantiere_id}_${item.wbs}`];
            if (!pId) continue;

            const start = item.start;
            const cId = item.cantiere_id;
            const wbsPrefix = item.wbs;

            if (wbsPrefix === "1") { // Allestimento
                allAttivitaL1.push(
                    { cantiere_id: cId, parent_id: pId, descrizione: "Recinzione", tipo_attivita: "task", data_inizio: addDays(start, 0), data_fine: addDays(start, 5), livello: 1, wbs_code: "1.1", categoria: "preparazione", importo_previsto: 5000 },
                    { cantiere_id: cId, parent_id: pId, descrizione: "Baraccamenti", tipo_attivita: "task", data_inizio: addDays(start, 5), data_fine: addDays(start, 10), livello: 1, wbs_code: "1.2", categoria: "preparazione", importo_previsto: 3000 }
                );
            } else if (wbsPrefix === "2") { // Strutture
                allAttivitaL1.push(
                    { cantiere_id: cId, parent_id: pId, descrizione: "Scavi", tipo_attivita: "task", data_inizio: addDays(start, 0), data_fine: addDays(start, 10), livello: 1, wbs_code: "2.1", categoria: "strutture", importo_previsto: 20000, percentuale_completamento: 100 },
                    { cantiere_id: cId, parent_id: pId, descrizione: "Fondazioni", tipo_attivita: "task", data_inizio: addDays(start, 10), data_fine: addDays(start, 30), livello: 1, wbs_code: "2.2", categoria: "strutture", importo_previsto: 40000, percentuale_completamento: 50 }
                );
            } else if (wbsPrefix === "3") { // Impianti
                allAttivitaL1.push(
                    { cantiere_id: cId, parent_id: pId, descrizione: "Elettrico", tipo_attivita: "task", data_inizio: addDays(start, 0), data_fine: addDays(start, 15), livello: 1, wbs_code: "3.1", categoria: "impianti", importo_previsto: 15000 },
                    { cantiere_id: cId, parent_id: pId, descrizione: "Idraulico", tipo_attivita: "task", data_inizio: addDays(start, 10), data_fine: addDays(start, 25), livello: 1, wbs_code: "3.2", categoria: "impianti", importo_previsto: 18000 }
                );
            }
        }

        // 7. Bulk Insert Everything Else in Parallel
        await Promise.all([
            base44.asServiceRole.entities.Attivita.bulkCreate(allAttivitaL1),
            base44.asServiceRole.entities.Subappalto.bulkCreate(allSubappalti),
            base44.asServiceRole.entities.Costo.bulkCreate(allCosti),
            base44.asServiceRole.entities.SAL.bulkCreate(allSAL),
            base44.asServiceRole.entities.OrdineMateriale.bulkCreate(allOrdini),
            base44.asServiceRole.entities.AttivitaInterna.bulkCreate(allAttivitaInterne),
            base44.asServiceRole.entities.Documento.bulkCreate(allDocumenti)
        ]);

        return Response.json({
            success: true,
            message: `DB Populated Successfully!`,
            stats: {
                cantieri: cantieriCreated.length,
                attivita: l0Created.length + allAttivitaL1.length,
                subappalti: allSubappalti.length,
                costi: allCosti.length
            }
        });

    } catch (error) {
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
});