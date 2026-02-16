import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // List of all entities to backup
        const entitiesToBackup = [
            'Cantiere',
            'Impresa',
            'PersonaEsterna',
            'Subappalto',
            'Costo',
            'Attivita',
            'AttivitaInterna',
            'Documento',
            'SAL',
            'SALSubappalto',
            'SocioConsorzio',
            'SALSocio',
            'OrdineMateriale',
            'Team',
            'Ruolo',
            'EmailConfig',
            'Azienda',
            'PermessoCantiereUtente'
        ];

        const backupData = {};
        const timestamp = new Date().toISOString();

        // Fetch data for each entity
        // Note: Using a limit of 10000 to try and get all records. 
        // For very large datasets, pagination would be needed.
        for (const entityName of entitiesToBackup) {
            try {
                // Check if entity exists in SDK before calling
                if (base44.entities[entityName]) {
                    const records = await base44.entities[entityName].list({ limit: 10000 });
                    backupData[entityName] = records;
                }
            } catch (e) {
                console.warn(`Failed to backup entity ${entityName}:`, e.message);
                backupData[entityName] = [];
            }
        }

        return Response.json({
            timestamp,
            version: "1.0",
            data: backupData
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});