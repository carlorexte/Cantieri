import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { fakerIT as faker } from 'npm:@faker-js/faker@8.4.1';

// Helper per date
const randomDate = (start, end) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
};

export const seedData = async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // Usa service role per bypassare RLS durante il seeding
        const client = base44.asServiceRole;

        const results = {
            cantieri: [],
            imprese: [],
            persone: []
        };

        // Generiamo 5 flussi completi
        for (let i = 0; i < 5; i++) {
            console.log(`Generazione set dati ${i + 1}...`);

            // 1. CREA IMPRESA
            const impresa = await client.entities.Impresa.create({
                ragione_sociale: faker.company.name(),
                partita_iva: faker.finance.accountNumber(11), // Fake P.IVA 11 cifre
                codice_fiscale: faker.finance.accountNumber(11),
                email: faker.internet.email(),
                telefono: faker.phone.number(),
                indirizzo_legale: faker.location.streetAddress(),
                citta_legale: faker.location.city(),
                cap_legale: faker.location.zipCode(),
                provincia_legale: faker.location.state({ abbreviated: true }).substring(0, 2).toUpperCase()
            });
            results.imprese.push(impresa.ragione_sociale);

            // 2. CREA PERSONA ESTERNA (Direttore Lavori o RUP)
            const persona = await client.entities.PersonaEsterna.create({
                nome: faker.person.firstName(),
                cognome: faker.person.lastName(),
                qualifica: faker.helpers.arrayElement(['Architetto', 'Ingegnere', 'Geometra', 'Perito']),
                email: faker.internet.email(),
                telefono: faker.phone.number(),
                codice_fiscale: faker.finance.accountNumber(16) // Semplificato
            });
            results.persone.push(`${persona.nome} ${persona.cognome}`);

            // 3. CREA CANTIERE
            const dataInizio = randomDate(new Date(2024, 0, 1), new Date(2024, 5, 1));
            const dataFine = randomDate(new Date(2025, 0, 1), new Date(2025, 11, 31));
            
            const cantiere = await client.entities.Cantiere.create({
                denominazione: `${faker.helpers.arrayElement(['Ristrutturazione', 'Costruzione', 'Manutenzione', 'Riqualificazione'])} ${faker.location.street()}`,
                codice_cig: faker.string.alphanumeric(10).toUpperCase(),
                codice_cup: faker.string.alphanumeric(15).toUpperCase(),
                indirizzo: faker.location.streetAddress(),
                indirizzo_citta: faker.location.city(),
                data_inizio: dataInizio,
                data_fine_prevista: dataFine,
                importo_contratto: parseFloat(faker.finance.amount(50000, 2000000, 2)),
                stato: 'attivo',
                direttore_lavori_id: persona.id,
                committente_ragione_sociale: faker.company.name()
            });
            results.cantieri.push(cantiere.denominazione);

            // 4. CREA SUBAPPALTO
            await client.entities.Subappalto.create({
                cantiere_id: cantiere.id,
                impresa_id: impresa.id,
                ragione_sociale: impresa.ragione_sociale,
                importo_contratto: parseFloat(faker.finance.amount(10000, 100000, 2)),
                categoria_lavori: faker.helpers.arrayElement(['impianti_elettrici', 'impianti_idraulici', 'finiture', 'serramenti']),
                stato: 'attivo',
                data_inizio: randomDate(new Date(cantiere.data_inizio), new Date()),
                tipo_relazione: 'subappalto'
            });

            // 5. CREA ATTIVITA (Cronoprogramma)
            await client.entities.Attivita.create({
                cantiere_id: cantiere.id,
                descrizione: "Allestimento cantiere e demolizioni",
                data_inizio: cantiere.data_inizio,
                data_fine: randomDate(new Date(cantiere.data_inizio), new Date(new Date(cantiere.data_inizio).getTime() + 30*24*60*60*1000)),
                stato: "completata",
                percentuale_completamento: 100,
                categoria: "preparazione"
            });
            
            await client.entities.Attivita.create({
                cantiere_id: cantiere.id,
                descrizione: "Realizzazione impianti",
                data_inizio: randomDate(new Date(cantiere.data_inizio), new Date()),
                data_fine: dataFine,
                stato: "in_corso",
                percentuale_completamento: 45,
                categoria: "impianti"
            });

            // 6. CREA ORDINE MATERIALE
            await client.entities.OrdineMateriale.create({
                cantiere_id: cantiere.id,
                descrizione: `Fornitura ${faker.commerce.productMaterial()}`,
                numero_ordine: `ORD-${faker.string.numeric(5)}`,
                data_ordine: randomDate(new Date(2024, 0, 1), new Date()),
                stato: faker.helpers.arrayElement(['bozza', 'in_attesa_approvazione', 'approvato', 'inviato_fornitore']),
                fornitore_ragione_sociale: faker.company.name(),
                priorita: 'media',
                importo_totale: parseFloat(faker.finance.amount(500, 5000, 2)),
                tipo_operazione: 'acquisto',
                dettagli_materiali: [
                    { descrizione: faker.commerce.productName(), quantita: 10, unita_misura: 'pz', note: '' },
                    { descrizione: faker.commerce.productName(), quantita: 50, unita_misura: 'mq', note: '' }
                ]
            });

            // 7. CREA COSTO
            await client.entities.Costo.create({
                cantiere_id: cantiere.id,
                categoria: faker.helpers.arrayElement(['materiali', 'manodopera', 'noli']),
                descrizione: "Acquisto materiale edile vario",
                importo: parseFloat(faker.finance.amount(100, 2000, 2)),
                data_sostenimento: randomDate(new Date(2024, 0, 1), new Date()),
                fornitore: faker.company.name(),
                stato_pagamento: 'pagato'
            });

            // 8. CREA SAL
            await client.entities.SAL.create({
                cantiere_id: cantiere.id,
                tipo_prestazione: 'lavori',
                tipo_sal_dettaglio: 'sal_progressivo',
                numero_sal: 1,
                data_sal: randomDate(new Date(cantiere.data_inizio), new Date()),
                descrizione: "SAL N.1 - Lavori al 30%",
                imponibile: parseFloat(faker.finance.amount(10000, 50000, 2)),
                stato_pagamento: 'fatturato'
            });

            // 9. CREA ATTIVITA INTERNA
            await client.entities.AttivitaInterna.create({
                cantiere_id: cantiere.id,
                descrizione: "Verifica conformità DURC imprese",
                dettagli: "Controllare scadenze e richiedere rinnovi",
                data_assegnazione: new Date().toISOString().split('T')[0],
                priorita: "alta",
                stato: "da_fare",
                tipo_attivita: "amministrativa"
            });

            // 10. CREA DOCUMENTO
            await client.entities.Documento.create({
                nome_documento: "Contratto di Appalto.pdf",
                tipo_documento: "contratto_appalto",
                categoria_principale: "contratti",
                percorso_nas: "/documenti/contratti/contratto_firmato.pdf", // Fake path
                data_emissione: cantiere.data_inizio,
                entita_collegate: [{ entita_id: cantiere.id, entita_tipo: 'cantiere' }]
            });

        }

        return Response.json({ 
            success: true, 
            message: "Dati generati con successo",
            generated: results 
        });

    } catch (error) {
        console.error("Seed error:", error);
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
});