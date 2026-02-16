import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const payload = await req.json();
        const { data, mode = 'append' } = payload; 
        // mode: 'append' (just create), 'replace' (delete all then create - DANGEROUS)
        
        if (!data || typeof data !== 'object') {
            return Response.json({ error: 'Invalid backup data' }, { status: 400 });
        }

        const results = {};

        for (const [entityName, records] of Object.entries(data)) {
            if (Array.isArray(records) && records.length > 0 && base44.entities[entityName]) {
                try {
                    // Remove system fields that shouldn't be written directly if they exist
                    // usually id is preserved if we want to keep relationships
                    // created_date, updated_date, created_by might be overwritten by system or preserved depending on configuration
                    // ideally we clean them up or let the system handle them.
                    // For a true restore, keeping IDs is crucial for relationships.
                    
                    const cleanRecords = records.map(r => {
                        // We keep the ID to preserve relationships!
                        // We remove timestamps to let the system set them new, OR keep them if supported.
                        // Base44 usually allows setting ID on create if it's a uuid.
                        return r;
                    });

                    // Batch create
                    // Base44 bulkCreate might have a limit, so we chunk it
                    const chunkSize = 50;
                    let createdCount = 0;
                    
                    for (let i = 0; i < cleanRecords.length; i += chunkSize) {
                        const chunk = cleanRecords.slice(i, i + chunkSize);
                        await base44.entities[entityName].bulkCreate(chunk);
                        createdCount += chunk.length;
                    }

                    results[entityName] = { status: 'success', count: createdCount };
                } catch (e) {
                    console.error(`Error restoring ${entityName}:`, e);
                    results[entityName] = { status: 'error', message: e.message };
                }
            } else {
                results[entityName] = { status: 'skipped', reason: 'No records or invalid entity' };
            }
        }

        return Response.json({ results });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});