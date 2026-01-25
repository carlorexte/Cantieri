import { createClientFromRequest } from 'npm:@base44/sdk@0.8.11';
import { ImapFlow } from 'npm:imapflow@1.0.161';
import { simpleParser } from 'npm:mailparser@3.7.2';

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

        if (!config.imap_host || !config.email_user) {
             return Response.json({ error: 'IMAP configuration missing' }, { status: 400 });
        }

        const emailPassword = Deno.env.get("EMAIL_PASSWORD");
        if (!emailPassword) {
            return Response.json({ error: 'EMAIL_PASSWORD secret not set' }, { status: 400 });
        }

        // 3. Connect to IMAP
        const client = new ImapFlow({
            host: config.imap_host,
            port: config.imap_port || 993,
            secure: true,
            auth: {
                user: config.email_user,
                pass: emailPassword
            },
            logger: false
        });

        await client.connect();

        // 4. Select and Fetch Emails
        const lock = await client.getMailboxLock(config.watch_folder || 'INBOX');
        const processed = [];

        try {
            // Fetch up to 5 unread messages
            // Using search criteria to find unseen messages
            const generator = client.fetch({ seen: false }, { 
                source: true, 
                envelope: true,
                uid: true 
            }, { limit: 5 });

            for await (const message of generator) {
                // Parse email
                const parsed = await simpleParser(message.source);
                
                const subject = parsed.subject || 'No Subject';
                const from = parsed.from?.text || 'Unknown';
                const date = parsed.date ? parsed.date.toISOString() : new Date().toISOString();
                const body = parsed.text || parsed.html || "No content";
                
                // 5. Analyze with LLM
                const prompt = `
                    Analizza questa email per creare un task operativo.
                    
                    Mittente: ${from}
                    Oggetto: ${subject}
                    Corpo: ${body.substring(0, 1000)} ... (troncato)
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

                // 6. Create Task
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

                // 7. Mark as seen
                await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });
                
                // Optional: Move to processed folder if configured and folder exists
                if (config.processed_folder && config.processed_folder !== 'INBOX') {
                    try {
                        await client.messageMove(message.uid, config.processed_folder, { uid: true });
                    } catch (e) {
                        console.warn(`Could not move message to ${config.processed_folder}`, e);
                    }
                }

                processed.push({ subject, from });
            }
        } finally {
            lock.release();
        }

        await client.logout();

        // Update last check
        await base44.entities.EmailConfig.update(config.id, {
            last_check: new Date().toISOString()
        });

        return Response.json({ processed, count: processed.length });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});