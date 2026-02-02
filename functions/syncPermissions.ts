import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export async function syncUserPermissions(base44) {
    const users = await base44.asServiceRole.entities.User.list();
    const results = [];

    for (const user of users) {
        // 1. Fetch PermessoCantiereUtente for this user
        const perms = await base44.asServiceRole.entities.PermessoCantiereUtente.filter({
            utente_id: user.id
        });

        // 2. Extract cantiere IDs where view is true
        // Assuming existence of record implies visibility, or check perm.permessi.view
        const assignedIds = perms
            .filter(p => p.permessi?.view !== false)
            .map(p => p.cantiere_id);

        // 3. Update user.cantieri_assegnati
        // Only update if different to avoid unnecessary writes
        const currentAssigned = user.cantieri_assegnati || [];
        const isDifferent = 
            assignedIds.length !== currentAssigned.length || 
            !assignedIds.every(id => currentAssigned.includes(id));

        if (isDifferent) {
            await base44.asServiceRole.auth.updateUser(user.id, {
                cantieri_assegnati: assignedIds
            });
            results.push({ email: user.email, updated: true, count: assignedIds.length });
        } else {
            results.push({ email: user.email, updated: false, count: currentAssigned.length });
        }
    }

    return results;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Ensure admin
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const results = await syncUserPermissions(base44);

        return Response.json({ 
            success: true, 
            message: "Permissions synced successfully",
            details: results 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});