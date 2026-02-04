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
            const cantieri = await base44.asServiceRole.entities.Cantiere.list('-created_date', 1000);
            return Response.json({ items: cantieri, role: 'admin' });
        }

        const fullUser = await base44.asServiceRole.entities.User.get(user.id);
        
        // 2. Determine visibility
        // If 'cantieri_view' is used for menu visibility, we shouldn't use it for "See All Data" unless explicitly intended.
        // However, to be safe, if the user has NO assignments, we might want to show nothing.
        // We will prioritize ASSIGNED and TEAM cantieri.
        
        // Note: If you want specific users to see ALL cantieri without being admin, 
        // you should check a specific flag like 'view_all_cantieri' or rely on 'cantieri_view' 
        // IF 'cantieri_view' is NOT given to everyone by default.
        // Given the recent fix gave 'cantieri_view' to everyone, we MUST NOT use it to grant full access here.

        const assignedIds = fullUser.cantieri_assegnati || [];
        const teamIds = fullUser.team_ids || [];
        
        let allCantieri = [];

        // 3. Fetch directly assigned cantieri (Using ServiceRole to bypass RLS)
        if (assignedIds.length > 0) {
            try {
                // Fetch in batches if necessary, but for now assuming < 1000 assigned
                const assigned = await base44.asServiceRole.entities.Cantiere.filter({
                    id: { $in: assignedIds }
                }, '-created_date', 1000);
                allCantieri = [...allCantieri, ...assigned];
            } catch (e) {
                console.error("Error fetching assigned cantieri:", e);
            }
        }

        // 4. Fetch team assigned cantieri (Using ServiceRole to bypass RLS)
        if (teamIds.length > 0) {
            try {
                // Fetch active cantieri to filter in memory 
                // Using ServiceRole ensures we get the data
                const activeCantieri = await base44.asServiceRole.entities.Cantiere.filter({
                    // Optional: filter by status if needed, or get all
                }, '-created_date', 1000);

                const teamCantieri = activeCantieri.filter(c => {
                    if (!c.team_assegnati || !Array.isArray(c.team_assegnati)) return false;
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

        return Response.json({ 
            items: allCantieri, 
            role: 'user', 
            debug: { 
                assignedCount: assignedIds.length, 
                teamsCount: teamIds.length,
                found: allCantieri.length 
            } 
        });

    } catch (error) {
        console.error("Error in getMyCantieri:", error);
        return Response.json({ items: [], error: error.message }, { status: 200 });
    }
});