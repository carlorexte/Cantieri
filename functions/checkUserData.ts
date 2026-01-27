import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Use service role to inspect data without restrictions
        const payload = await req.json().catch(() => ({}));
        const email = payload.email || "info@btcwheel.io";
        
        const users = await base44.asServiceRole.entities.User.filter({
            email: email
        });

        if (users.length === 0) {
            return Response.json({ error: "User not found" });
        }

        const user = users[0];
        const assignedIds = user.cantieri_assegnati || [];

        const permissions = await base44.asServiceRole.entities.PermessoCantiereUtente.filter({
            utente_id: user.id
        });

        // Check if the assigned cantieri actually exist
        const cantieriDetails = [];
        for (const cId of assignedIds) {
            try {
                const c = await base44.asServiceRole.entities.Cantiere.get(cId);
                cantieriDetails.push({ id: cId, found: !!c, denominazione: c?.denominazione });
            } catch (e) {
                cantieriDetails.push({ id: cId, found: false, error: e.message });
            }
        }

        // Also check if there are cantieri that SHOULD be visible via PermessoCantiereUtente but are not in assignedIds
        const permIds = permissions.map(p => p.cantiere_id);
        const missingAssignments = permIds.filter(id => !assignedIds.includes(id));

        return Response.json({
            user_summary: {
                ...user
            },
            cantieri_status: cantieriDetails,
            permissions_cantieri_ids: permIds,
            missing_in_user_array: missingAssignments
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});