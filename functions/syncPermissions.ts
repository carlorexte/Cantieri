import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export async function syncUserAccess(base44) {
    const users = await base44.asServiceRole.entities.User.list();
    const teams = await base44.asServiceRole.entities.Team.list();
    
    const results = [];

    for (const user of users) {
        // --- 1. Sync Cantieri (PermessoCantiereUtente) ---
        const perms = await base44.asServiceRole.entities.PermessoCantiereUtente.filter({
            utente_id: user.id
        });
        const assignedIds = perms
            .filter(p => p.permessi?.view !== false)
            .map(p => p.cantiere_id);

        // --- 2. Sync Teams ---
        // Find teams where this user is a member
        const userTeams = teams.filter(t => t.membri_ids?.includes(user.id));
        const teamIds = userTeams.map(t => t.id);

        // --- 3. Update User ---
        const updates = {};
        let needsUpdate = false;

        // Check cantieri_assegnati
        const currentAssigned = user.cantieri_assegnati || [];
        if (assignedIds.length !== currentAssigned.length || !assignedIds.every(id => currentAssigned.includes(id))) {
            updates.cantieri_assegnati = assignedIds;
            needsUpdate = true;
        }

        // Check team_ids
        const currentTeams = user.team_ids || [];
        if (teamIds.length !== currentTeams.length || !teamIds.every(id => currentTeams.includes(id))) {
            updates.team_ids = teamIds;
            needsUpdate = true;
        }

        if (needsUpdate) {
            await base44.asServiceRole.auth.updateUser(user.id, updates);
            results.push({ 
                email: user.email, 
                updated: true, 
                cantieriCount: assignedIds.length,
                teamsCount: teamIds.length
            });
        } else {
            results.push({ 
                email: user.email, 
                updated: false, 
                cantieriCount: currentAssigned.length,
                teamsCount: currentTeams.length
            });
        }
    }

    return results;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const results = await syncUserAccess(base44);

        return Response.json({ 
            success: true, 
            message: "User access (cantieri & teams) synced successfully",
            details: results 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});