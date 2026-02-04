import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Use service role to inspect/fix users
        const users = await base44.asServiceRole.entities.User.filter({ email: "alcotek@gmail.com" });
        
        if (users.length === 0) {
            return Response.json({ message: "User alcotek@gmail.com not found" });
        }
        
        const targetUser = users[0];
        const updates = {};
        let needsUpdate = false;

        // Ensure array fields are arrays
        if (!Array.isArray(targetUser.team_ids)) {
            updates.team_ids = [];
            needsUpdate = true;
        }
        if (!Array.isArray(targetUser.cantieri_assegnati)) {
            updates.cantieri_assegnati = [];
            needsUpdate = true;
        }

        if (needsUpdate) {
            await base44.asServiceRole.entities.User.update(targetUser.id, updates);
        }

        const fixedUser = needsUpdate ? { ...targetUser, ...updates } : targetUser;

        // Check visibility
        // Mimic RLS check for Cantiere
        // 1. cantieri_view
        const canViewAll = fixedUser.cantieri_view === true;
        
        // 2. Assigned
        const assignedIds = fixedUser.cantieri_assegnati || [];
        
        // 3. Teams
        const teamIds = fixedUser.team_ids || [];
        let teamCantieriIds = [];
        if (teamIds.length > 0) {
            const teamCantieri = await base44.asServiceRole.entities.Cantiere.filter({
                team_assegnati: { $containsAny: teamIds }
            });
            teamCantieriIds = teamCantieri.map(c => c.id);
        }

        const visibleCantieriIds = [...new Set([...assignedIds, ...teamCantieriIds])];

        return Response.json({
            user: {
                id: fixedUser.id,
                email: fixedUser.email,
                role: fixedUser.role,
                cantieri_view: fixedUser.cantieri_view,
                cantieri_assegnati: fixedUser.cantieri_assegnati,
                team_ids: fixedUser.team_ids
            },
            was_fixed: needsUpdate,
            visibility_analysis: {
                can_view_all: canViewAll,
                directly_assigned_count: assignedIds.length,
                team_assigned_count: teamCantieriIds.length,
                total_visible_via_assignment: visibleCantieriIds.length,
                visible_ids: visibleCantieriIds
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});