import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch aggregated data for analysis
        // We fetch a subset of data to avoid context limit issues
        const [cantieri, costi, sals] = await Promise.all([
            base44.entities.Cantiere.filter({ stato: 'attivo' }),
            base44.entities.Costo.list('-data_sostenimento', 100), // Last 100 costs
            base44.entities.SAL.list('-data_sal', 20) // Last 20 SALs
        ]);

        // 2. Prepare context for the LLM
        const dataContext = {
            cantieri_summary: cantieri.map(c => ({
                nome: c.denominazione,
                budget: c.importo_contratto,
                data_fine: c.data_fine_prevista,
                stato: c.stato
            })),
            costi_recenti_summary: costi.map(c => ({
                categoria: c.categoria,
                importo: c.importo,
                data: c.data_sostenimento
            })),
            sals_summary: sals.map(s => ({
                totale: s.totale_fattura,
                data: s.data_sal
            }))
        };

        const prompt = `
            Analizza i seguenti dati di un'azienda edile e fornisci insights.
            
            Dati: ${JSON.stringify(dataContext)}
            
            Compiti:
            1. Identifica anomalie (es. costi alti recenti, cantieri vicini alla scadenza).
            2. Suggerisci aree di miglioramento.
            3. Fai una previsione semplice dei costi per il prossimo mese basata sui dati recenti.
            
            Rispondi ESCLUSIVAMENTE in formato JSON secondo questo schema:
            {
                "anomalies": [{"title": "string", "description": "string", "severity": "high|medium|low"}],
                "suggestions": [{"text": "string"}],
                "forecast": {"next_month_cost_projection": number, "confidence": "string"}
            }
        `;

        // 3. Call LLM
        const result = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    anomalies: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                description: { type: "string" },
                                severity: { type: "string", enum: ["high", "medium", "low"] }
                            },
                            required: ["title", "description", "severity"]
                        }
                    },
                    suggestions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                text: { type: "string" }
                            },
                            required: ["text"]
                        }
                    },
                    forecast: {
                        type: "object",
                        properties: {
                            next_month_cost_projection: { type: "number" },
                            confidence: { type: "string" }
                        },
                        required: ["next_month_cost_projection"]
                    }
                },
                required: ["anomalies", "suggestions", "forecast"]
            }
        });

        return Response.json(result);

    } catch (error) {
        console.error("Error in analyzeProjectData:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});