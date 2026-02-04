import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Admin gets everything
        if (user.role === 'admin') {
            const cantieri = await base44.entities.Cantiere.list('-created_date', 100);
            return Response.json({ items: cantieri, role: 'admin' });
        }

        const fullUser = await base44.asServiceRole.entities.User.get(user.id);
        
        // 2. Global View Permission gets everything
        if (fullUser.cantieri_view) {
             const cantieri = await base44.entities.Cantiere.list('-created_date', 100);
             return Response.json({ items: cantieri, role: 'user_full_view' });
        }

        const assignedIds = fullUser.cantieri_assegnati || [];
        const teamIds = fullUser.team_ids || [];
        
        let allCantieri = [];

        // 3. Fetch directly assigned cantieri
        if (assignedIds.length > 0) {
            try {
                const assigned = await base44.asServiceRole.entities.Cantiere.filter({
                    id: { $in: assignedIds }
                }, '-created_date', 100);
                allCantieri = [...allCantieri, ...assigned];
            } catch (e) {
                console.error("Error fetching assigned cantieri:", e);
            }
        }

        // 4. Fetch team assigned cantieri (Manual robust filtering)
        if (teamIds.length > 0) {
            try {
                // Fetch active cantieri to filter in memory - SAFER than complex queries
                // We limit to 200 most recent active ones to avoid performance issues but ensure visibility
                const activeCantieri = await base44.asServiceRole.entities.Cantiere.filter({
                    stato: { $ne: 'archiviato' } // Get everything not archived
                }, '-created_date', 200);

                const teamCantieri = activeCantieri.filter(c => {
                    if (!c.team_assegnati || !Array.isArray(c.team_assegnati)) return false;
                    // Check intersection
                    return c.team_assegnati.some(tid => teamIds.includes(tid));
                });

                // Merge avoiding duplicates
                const existingIds = new Set(allCantieri.map(c => c.id));
                teamCantieri.forEach(c => {
                    if (!existingIds.has(c.id)) {
                        allCantieri.push(c);
                        existingIds.add(c.id);
                    }
                });
            } catch (e) {
                console.error("Error fetching team cantieri:", e);
            }
        }

        return Response.json({ items: allCantieri, role: 'user', debug: { assigned: assignedIds.length, teams: teamIds.length } });

    } catch (error) {
        console.error("Error in getMyCantieri:", error);
        // Fallback: return empty array instead of 500 so app doesn't crash
        return Response.json({ items: [], error: error.message }, { status: 200 });
    }
});