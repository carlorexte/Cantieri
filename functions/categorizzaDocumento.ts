import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_uri, nome_documento, descrizione } = await req.json();

    if (!file_uri) {
      return Response.json({ error: 'file_uri è richiesto' }, { status: 400 });
    }

    // Genera URL firmato per accedere al file
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri,
      expires_in: 300
    });

    // Scarica il file
    const fileResponse = await fetch(signed_url);
    if (!fileResponse.ok) {
      throw new Error('Impossibile scaricare il file');
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

    // Usa l'LLM per analizzare e categorizzare il documento
    const prompt = `Analizza questo documento e fornisci:
1. La categoria_principale più appropriata tra: permessi, contratti, polizze, certificazioni, fatture, sal, sicurezza, tecnici, foto, corrispondenza, legale, altro
2. Il tipo_documento più specifico tra le seguenti opzioni in base al contenuto:
   - amministrativa_documentazione_gara
   - amministrativa_inviti_bandi
   - amministrativa_offerta
   - amministrativa_delibere_aggiudicazione
   - durc
   - visure
   - visure_cciaa
   - certificazioni_soa
   - denuncia_inail
   - contratto_appalto
   - contratto_esecutrice
   - contratto_subappaltatori
   - consortile
   - polizze_car
   - polizze_decennale
   - polizze_rct
   - tecnica_capitolati
   - tecnica_computo_metrico
   - tecnica_elaborati_grafici
   - cantiere_verbale_consegna
   - cantiere_ultimazione_collaudi
   - sicurezza_pos_esecutrice
   - sicurezza_pos_subappaltatrice
   - economica_sal
   - economica_fatture
   - altro

Nome documento: ${nome_documento || 'Non specificato'}
Descrizione: ${descrizione || 'Non specificata'}

Analizza il contenuto del documento e fornisci la categorizzazione più accurata.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [signed_url],
      response_json_schema: {
        type: "object",
        properties: {
          categoria_principale: {
            type: "string",
            enum: ["permessi", "contratti", "polizze", "certificazioni", "fatture", "sal", "sicurezza", "tecnici", "foto", "corrispondenza", "legale", "altro"]
          },
          tipo_documento: {
            type: "string",
            enum: [
              "amministrativa_documentazione_gara",
              "amministrativa_inviti_bandi",
              "amministrativa_offerta",
              "amministrativa_delibere_aggiudicazione",
              "durc",
              "visure",
              "visure_cciaa",
              "certificazioni_soa",
              "denuncia_inail",
              "contratto_appalto",
              "contratto_esecutrice",
              "contratto_subappaltatori",
              "consortile",
              "polizze_car",
              "polizze_decennale",
              "polizze_rct",
              "tecnica_capitolati",
              "tecnica_computo_metrico",
              "tecnica_elaborati_grafici",
              "cantiere_verbale_consegna",
              "cantiere_ultimazione_collaudi",
              "sicurezza_pos_esecutrice",
              "sicurezza_pos_subappaltatrice",
              "economica_sal",
              "economica_fatture",
              "altro"
            ]
          },
          spiegazione: {
            type: "string",
            description: "Breve spiegazione della scelta"
          }
        },
        required: ["categoria_principale", "tipo_documento"]
      }
    });

    return Response.json({
      categoria_principale: result.categoria_principale,
      tipo_documento: result.tipo_documento,
      spiegazione: result.spiegazione || ''
    });

  } catch (error) {
    console.error('Errore categorizzazione:', error);
    return Response.json({ 
      error: error.message || 'Errore durante la categorizzazione'
    }, { status: 500 });
  }
});