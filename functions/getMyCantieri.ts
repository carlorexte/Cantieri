import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        console.log("getMyCantieri called by:", user?.email);

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (user.role === 'admin') {
            const cantieri = await base44.entities.Cantiere.list('-created_date', 100);
            return Response.json({ items: cantieri, role: 'admin' });
        }

        const fullUser = await base44.asServiceRole.entities.User.get(user.id);
        
        // 1. Global View Permission gets everything
        if (fullUser.cantieri_view) {
             const cantieri = await base44.entities.Cantiere.list('-created_date', 100);
             return Response.json({ items: cantieri, role: 'user_full_view' });
        }

        // 2. Direct Assignments
        const assignedIds = fullUser.cantieri_assegnati || [];
        
        // 3. Team Assignments
        const teamIds = fullUser.team_ids || [];
        let teamCantieriIds = [];
        
        if (teamIds.length > 0) {
            // Find cantieri where team_assegnati contains any of my teams
            // We use filter with $containsAny if supported, or fetch all and filter in memory if needed.
            // Assuming $containsAny works as it's used in RLS.
            try {
                const teamCantieri = await base44.asServiceRole.entities.Cantiere.filter({
                    team_assegnati: { $containsAny: teamIds }
                });
                if (teamCantieri && teamCantieri.length > 0) {
                    teamCantieriIds = teamCantieri.map(c => c.id);
                }
            } catch (e) {
                console.warn("Error filtering by teams, falling back:", e);
                // Fallback: list active cantieri and check team_assegnati manually
                const allCantieri = await base44.asServiceRole.entities.Cantiere.filter({
                    stato: 'attivo'
                }, '-created_date', 200);
                
                teamCantieriIds = allCantieri
                    .filter(c => c.team_assegnati && c.team_assegnati.some(tid => teamIds.includes(tid)))
                    .map(c => c.id);
            }
        }

        const allIds = [...new Set([...assignedIds, ...teamCantieriIds])];
        
        console.log("Assigned IDs:", assignedIds);
        console.log("Team IDs:", teamIds);
        console.log("Team Cantieri IDs:", teamCantieriIds);
        console.log("Total IDs:", allIds);

        if (allIds.length === 0) {
            return Response.json({ items: [], role: 'user', message: 'No assignments' });
        }

        const cantieri = await base44.asServiceRole.entities.Cantiere.filter({
            id: { $in: allIds }
        }, '-created_date', 100);

        return Response.json({ items: cantieri, role: 'user', debug_ids: allIds });

    } catch (error) {
        console.error("Error in getMyCantieri:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});