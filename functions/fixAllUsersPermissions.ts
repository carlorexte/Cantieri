import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Helper function inlined to avoid import errors
async function syncUserAccess(base44) {
    const users = await base44.asServiceRole.entities.User.list();
    const teams = await base44.asServiceRole.entities.Team.list();
    const allCantieri = await base44.asServiceRole.entities.Cantiere.list();
    
    const results = [];

    for (const user of users) {
        // --- 1. Sync Cantieri (PermessoCantiereUtente) ---
        // A) Direct Access via specific permission record
        const perms = await base44.asServiceRole.entities.PermessoCantiereUtente.filter({
            utente_id: user.id
        });
        const directAssignedIds = perms
            .filter(p => p.permessi?.view !== false)
            .map(p => p.cantiere_id);

        // --- 2. Sync Teams ---
        // Find teams where this user is a member
        const userTeams = teams.filter(t => t.membri_ids?.includes(user.id));
        const teamIds = userTeams.map(t => t.id);

        // B) Team Access via Cantiere.team_assegnati
        const teamAssignedIds = allCantieri
            .filter(c => c.team_assegnati?.some(tid => teamIds.includes(tid)))
            .map(c => c.id);

        // Merge unique IDs
        const assignedIds = [...new Set([...directAssignedIds, ...teamAssignedIds])];

        // --- 3. Update User ---
        const updates = {};
        let needsUpdate = false;

        // Check cantieri_assegnati
        const currentAssigned = user.cantieri_assegnati || [];
        const sortedNew = [...assignedIds].sort();
        const sortedOld = [...currentAssigned].sort();
        
        const isDifferent = sortedNew.length !== sortedOld.length || 
                            !sortedNew.every((val, index) => val === sortedOld[index]);

        if (isDifferent) {
            updates.cantieri_assegnati = assignedIds;
            needsUpdate = true;
        }

        // Check team_ids
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
        
        // Fetch all users
        const users = await base44.asServiceRole.entities.User.list("-created_date", 1000);
        
        const updatesLog = [];

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

        for (const user of users) {
            if (user.role === 'admin') continue;

            const updates = {};
            let changed = false;

            viewPerms.forEach(perm => {
                if (user[perm] !== true) {
                    updates[perm] = true;
                    changed = true;
                }
            });

            if (!Array.isArray(user.team_ids)) {
                updates.team_ids = [];
                changed = true;
            }
            if (!Array.isArray(user.cantieri_assegnati)) {
                updates.cantieri_assegnati = [];
                changed = true;
            }

            if (changed) {
                await base44.asServiceRole.entities.User.update(user.id, updates);
                updatesLog.push({ email: user.email, updates: Object.keys(updates) });
            }
        }

        // Run full sync with inlined function
        const syncResults = await syncUserAccess(base44);

        return Response.json({ 
            success: true, 
            message: `Permissions updated for ${updatesLog.length} users. Access sync completed.`,
            users_updated_count: updatesLog.length,
            updates_log: updatesLog,
            sync_summary: {
                total_synced: syncResults.length,
                users_with_access_changes: syncResults.filter(r => r.updated).length
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});