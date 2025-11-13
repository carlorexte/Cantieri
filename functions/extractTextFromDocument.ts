import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_uri, documento_id } = await req.json();

        if (!file_uri) {
            return Response.json({ error: 'file_uri è obbligatorio' }, { status: 400 });
        }

        // Genera signed URL per accedere al file
        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
            file_uri: file_uri,
            expires_in: 600
        });

        // Scarica il file
        const fileResponse = await fetch(signed_url);
        if (!fileResponse.ok) {
            return Response.json({ error: 'Impossibile scaricare il file' }, { status: 500 });
        }

        const fileBlob = await fileResponse.blob();
        const fileBuffer = await fileBlob.arrayBuffer();
        const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

        // Usa l'LLM di Base44 per estrarre il testo
        const extractionResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Estrai tutto il testo leggibile da questo documento. 
            Ritorna SOLO il testo estratto, senza commenti o descrizioni aggiuntive.
            Se il documento contiene tabelle, mantieni la struttura.
            Se il documento è un'immagine o PDF scansionato, usa OCR per estrarre il testo.
            Se non c'è testo estraibile, ritorna "NESSUN_TESTO_TROVATO".`,
            file_urls: [signed_url],
            response_json_schema: {
                type: "object",
                properties: {
                    testo: { type: "string" },
                    numero_pagine: { type: "number" },
                    qualita: { 
                        type: "string",
                        enum: ["alta", "media", "bassa"]
                    }
                }
            }
        });

        const testoEstratto = extractionResult.testo || "";
        
        // Aggiorna il documento con il testo estratto
        if (documento_id) {
            await base44.asServiceRole.entities.Documento.update(documento_id, {
                testo_estratto: testoEstratto,
                ocr_completato: true
            });
        }

        return Response.json({ 
            success: true,
            testo_estratto: testoEstratto,
            numero_pagine: extractionResult.numero_pagine || 1,
            qualita: extractionResult.qualita || "media"
        });

    } catch (error) {
        console.error("Errore estrazione testo:", error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});