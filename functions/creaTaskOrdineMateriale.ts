import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Parsing del payload dell'evento (automazione)
        const payload = await req.json();
        const { event, data } = payload;

        // Gestiamo solo creazione o update se lo stato è "in_attesa_approvazione"
        if (!data || data.stato !== 'in_attesa_approvazione') {
            return Response.json({ message: "Nessuna azione richiesta (stato non in attesa)" });
        }

        // Se c'è già un'attività collegata, non ne creiamo un'altra
        if (data.attivita_collegata_id) {
             return Response.json({ message: "Task già esistente" });
        }

        // 2. Recuperiamo info aggiuntive se necessario (es. nome cantiere)
        let cantiereNome = "Cantiere";
        if (data.cantiere_id) {
            const cantieri = await base44.asServiceRole.entities.Cantiere.filter({ id: data.cantiere_id });
            if (cantieri.length > 0) cantiereNome = cantieri[0].denominazione;
        }

        // 3. Creazione del Task (AttivitaInterna) per il Responsabile
        // Se non c'è un responsabile_id specificato, assegnamo a chi ha creato l'ordine o fallback su admin/default
        // Per ora usiamo responsabile_id se presente, altrimenti logghiamo warning
        const assigneeId = data.responsabile_id;
        
        if (!assigneeId) {
            return Response.json({ error: "Responsabile non specificato nell'ordine" }, { status: 400 });
        }

        const taskData = {
            descrizione: `Approvazione Ordine #${data.numero_ordine || 'N/D'} - ${cantiereNome}`,
            dettagli: `Richiesta approvazione per ordine materiali.\nFornitore: ${data.fornitore_ragione_sociale}\nDescrizione: ${data.descrizione}\n\nVai alla sezione Ordini Materiali per gestire.`,
            cantiere_id: data.cantiere_id,
            assegnatario_id: assigneeId,
            data_assegnazione: new Date().toISOString().split('T')[0],
            priorita: 'alta',
            stato: 'da_fare',
            tipo_attivita: 'amministrativa',
            note: `Ordine ID: ${data.id}`
        };

        const task = await base44.asServiceRole.entities.AttivitaInterna.create(taskData);

        // 4. Aggiorniamo l'ordine con l'ID del task creato
        await base44.asServiceRole.entities.OrdineMateriale.update(data.id, {
            attivita_collegata_id: task.id
        });

        return Response.json({ success: true, task_id: task.id });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});