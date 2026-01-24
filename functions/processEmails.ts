import { createClientFromRequest } from 'npm:@base44/sdk@0.8.11';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Auth check
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Get Config
        const configs = await base44.entities.EmailConfig.list(1);
        const config = configs[0];

        if (!config || !config.is_active) {
            return Response.json({ message: 'Email processing disabled' });
        }

        // 3. Get Gmail Token
        const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");
        if (!accessToken) {
            return Response.json({ error: 'Gmail not connected' }, { status: 400 });
        }

        // 4. Fetch Unread Emails
        const listRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=label:${config.watch_label} is:unread&maxResults=5`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const listData = await listRes.json();
        
        if (!listData.messages || listData.messages.length === 0) {
            return Response.json({ message: 'No new emails' });
        }

        const processed = [];

        // 5. Process each email
        for (const msg of listData.messages) {
            // Fetch full message
            const msgRes = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const msgData = await msgRes.json();

            // Extract headers
            const headers = msgData.payload.headers;
            const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
            const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
            const date = headers.find(h => h.name === 'Date')?.value;
            
            // Extract body (simplified)
            let body = "No content";
            if (msgData.snippet) body = msgData.snippet;
            
            // 6. Analyze with LLM
            const prompt = `
                Analizza questa email per creare un task operativo.
                
                Mittente: ${from}
                Oggetto: ${subject}
                Corpo: ${body}
                Data: ${date}
                
                Determina:
                1. Priorità (bassa, media, alta, critica) basata sull'urgenza e tono.
                2. Categoria (amministrativa, tecnica, documentale, contabile, generale).
                3. Una descrizione sintetica per il titolo del task.
                4. Dettagli completi per il corpo del task.
                5. Data scadenza suggerita (in formato YYYY-MM-DD) considerando la priorità (critica=1gg, alta=3gg, media=7gg, bassa=14gg).
                
                Rispondi SOLO con un JSON valido:
                {
                    "priorita": "string",
                    "categoria": "string",
                    "descrizione": "string",
                    "dettagli": "string",
                    "data_scadenza": "string"
                }
            `;

            const aiRes = await base44.integrations.Core.InvokeLLM({
                prompt: prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        priorita: { type: "string", enum: ["bassa", "media", "alta", "critica"] },
                        categoria: { type: "string", enum: ["amministrativa", "tecnica", "documentale", "contabile", "generale"] },
                        descrizione: { type: "string" },
                        dettagli: { type: "string" },
                        data_scadenza: { type: "string" }
                    },
                    required: ["priorita", "categoria", "descrizione", "dettagli", "data_scadenza"]
                }
            });

            // 7. Create Task
            const assignee = config.default_assignee_id || user.id;
            
            await base44.entities.AttivitaInterna.create({
                descrizione: `[EMAIL] ${aiRes.descrizione}`,
                dettagli: `Da: ${from}\nOggetto: ${subject}\n\n${aiRes.dettagli}`,
                assegnatario_id: assignee,
                data_assegnazione: new Date().toISOString().split('T')[0],
                data_scadenza: aiRes.data_scadenza,
                priorita: aiRes.priorita,
                tipo_attivita: aiRes.categoria,
                stato: "da_fare",
                note: `Generato automaticamente da AI Assistant`
            });

            // 8. Mark as read (remove UNREAD label)
            await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        removeLabelIds: ['UNREAD']
                    })
                }
            );

            processed.push({ id: msg.id, subject });
        }

        // Update last check
        await base44.entities.EmailConfig.update(config.id, {
            last_check: new Date().toISOString()
        });

        return Response.json({ processed, count: processed.length });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});