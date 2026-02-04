import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { syncUserAccess } from './syncPermissions.ts';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const users = await base44.asServiceRole.entities.User.filter({ email: "alcotek@gmail.com" });
        if (users.length === 0) {
            return Response.json({ message: "User not found" });
        }
        
        const targetUser = users[0];
        const updates = {};
        
        // Grant view permissions for all related entities
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

        // Also ensure arrays
        if (!Array.isArray(targetUser.team_ids)) updates.team_ids = [];
        if (!Array.isArray(targetUser.cantieri_assegnati)) updates.cantieri_assegnati = [];

        if (Object.keys(updates).length > 0) {
            await base44.asServiceRole.entities.User.update(targetUser.id, updates);
        }

        // Run full sync to ensure team access is calculated
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