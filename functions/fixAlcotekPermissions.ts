import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Helper function inlined to avoid import errors
async function syncUserAccess(base44) {
    const users = await base44.asServiceRole.entities.User.list();
    const teams = await base44.asServiceRole.entities.Team.list();
    const allCantieri = await base44.asServiceRole.entities.Cantiere.list();
    
    const results = [];

    for (const user of users) {
        // --- 1. Sync Cantieri (PermessoCantiereUtente) ---
        const perms = await base44.asServiceRole.entities.PermessoCantiereUtente.filter({
            utente_id: user.id
        });
        const directAssignedIds = perms
            .filter(p => p.permessi?.view !== false)
            .map(p => p.cantiere_id);

        // --- 2. Sync Teams ---
        const userTeams = teams.filter(t => t.membri_ids?.includes(user.id));
        const teamIds = userTeams.map(t => t.id);

        const teamAssignedIds = allCantieri
            .filter(c => c.team_assegnati?.some(tid => teamIds.includes(tid)))
            .map(c => c.id);

        const assignedIds = [...new Set([...directAssignedIds, ...teamAssignedIds])];

        // --- 3. Update User ---
        const updates = {};
        let needsUpdate = false;

        const currentAssigned = user.cantieri_assegnati || [];
        const sortedNew = [...assignedIds].sort();
        const sortedOld = [...currentAssigned].sort();
        
        const isDifferent = sortedNew.length !== sortedOld.length || 
                            !sortedNew.every((val, index) => val === sortedOld[index]);

        if (isDifferent) {
            updates.cantieri_assegnati = assignedIds;
            needsUpdate = true;
        }

        const currentTeams = user.team_ids || [];
        const sortedNewTeams = [...teamIds].sort();
        const sortedOldTeams = [...currentTeams].sort();
        
        const isTeamsDifferent = sortedNewTeams.length !== sortedOldTeams.length ||
                                 !sortedNewTeams.every((val, index) => val === sortedOldTeams[index]);

        if (isTeamsDifferent) {
            updates.team_ids = teamIds;
            needsUpdate = true;
        }

        if (needsUpdate) {
            await base44.asServiceRole.entities.User.update(user.id, updates);
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
        
        const users = await base44.asServiceRole.entities.User.filter({ email: "alcotek@gmail.com" });
        if (users.length === 0) {
            return Response.json({ message: "User not found" });
        }
        
        const targetUser = users[0];
        const updates = {};
        
        const viewPerms = [
            "dashboard_view",
            "cantieri_view",
            "imprese_view",
            "persone_view",
            "subappalti_view",
            "costi_view",
            "sal_view",
            "attivita_view",
            "documenti_view",
            "teams_view",
            "cronoprogramma_view",
            "ordini_view"
        ];

        viewPerms.forEach(perm => {
            if (targetUser[perm] !== true) {
                updates[perm] = true;
            }
        });

        if (!Array.isArray(targetUser.team_ids)) updates.team_ids = [];
        if (!Array.isArray(targetUser.cantieri_assegnati)) updates.cantieri_assegnati = [];

        if (Object.keys(updates).length > 0) {
            await base44.asServiceRole.entities.User.update(targetUser.id, updates);
        }

        const syncResults = await syncUserAccess(base44);
        const mySync = syncResults.find(r => r.email === targetUser.email);

        return Response.json({ 
            success: true, 
            updated_fields: Object.keys(updates),
            user_email: targetUser.email,
            sync_result: mySync || "User not found in sync results"
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});