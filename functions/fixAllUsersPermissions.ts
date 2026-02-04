import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { syncUserAccess } from './syncPermissions.ts';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Fetch all users (limit to 1000 for safety, though pagination would be better for huge datasets)
        const users = await base44.asServiceRole.entities.User.list("-created_date", 1000);
        
        const updatesLog = [];

        // The set of "View" permissions to grant to standard users so they can access the modules
        // RLS often checks these flags.
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
            // Admins generally bypass these checks via role='admin' in RLS, so we skip them 
            // to avoid cluttering their records, unless specifically requested.
            if (user.role === 'admin') continue;

            const updates = {};
            let changed = false;

            viewPerms.forEach(perm => {
                // If permission is missing or false, set it to true
                if (user[perm] !== true) {
                    updates[perm] = true;
                    changed = true;
                }
            });

            // Ensure arrays exist to prevent RLS errors on $in operators
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

        // Run full sync to ensure team access and direct assignments are calculated correctly
        // This will update 'cantieri_assegnati' and 'team_ids' based on PermessoCantiereUtente and Team entities.
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