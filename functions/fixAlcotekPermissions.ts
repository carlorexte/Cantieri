import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const users = await base44.asServiceRole.entities.User.filter({ email: "alcotek@gmail.com" });
        
        if (users.length === 0) {
            return Response.json({ message: "User not found" });
        }
        
        const targetUser = users[0];
        const updates = {};
        
        // Grant view permissions for all related entities to match cantieri_view=true intent
        // This ensures they can see details of any cantiere they can access
        const viewPerms = [
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

        return Response.json({
            success: true,
            updated_fields: Object.keys(updates),
            user_email: targetUser.email
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});