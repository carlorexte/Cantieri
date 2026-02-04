import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const authUser = await base44.auth.me();
        
        if (!authUser) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Admin gets everything
        if (authUser.role === 'admin') {
            const cantieri = await base44.asServiceRole.entities.Cantiere.list('-created_date', 1000);
            return Response.json({ items: cantieri, role: 'admin' });
        }

        // 2. Get full user details for RBAC
        const fullUser = await base44.asServiceRole.entities.User.get(authUser.id);
        
        // 3. Check 'force_all_cantieri_view' (Responsabile Azienda use case)
        if (fullUser.force_all_cantieri_view) {
             const cantieri = await base44.asServiceRole.entities.Cantiere.list('-created_date', 1000);
             return Response.json({ items: cantieri, role: 'user', scope: 'all' });
        }

        // 4. Collect assigned IDs
        const assignedIds = fullUser.cantieri_assegnati || [];
        const teamIds = fullUser.team_ids || [];
        
        let targetIds = new Set(assignedIds);

        // 5. If has teams, find cantieri assigned to those teams
        if (teamIds.length > 0) {
            try {
                // We need to find cantieri where 'team_assegnati' contains any of 'teamIds'
                // SDK filter support for array contains might be limited, so we might need to fetch all or use specific query
                // Using a wider search or iterative search. 
                // For efficiency, let's fetch cantieri that HAVE teams assigned, then filter in memory if needed
                // OR better: use the 'team_assegnati' field.
                // Assuming we can't do complex OR queries easily for array intersection in one go without a specific operator.
                
                // Workaround: fetch all active cantieri and filter (efficient enough for <1000 items)
                // OR rely on a specific lookup table if we had one.
                // Let's fetch all (since we did it for force_all_cantieri_view anyway) and filter.
                // It's safer for consistency.
                
                const allCantieri = await base44.asServiceRole.entities.Cantiere.list('-created_date', 1000);
                
                const accessibleCantieri = allCantieri.filter(c => {
                    // Direct assignment
                    if (targetIds.has(c.id)) return true;
                    
                    // Team assignment
                    if (c.team_assegnati && Array.isArray(c.team_assegnati)) {
                        return c.team_assegnati.some(tid => teamIds.includes(tid));
                    }
                    return false;
                });

                return Response.json({ items: accessibleCantieri, role: 'user', scope: 'assigned' });

            } catch (e) {
                console.error("Error fetching team cantieri:", e);
            }
        } else {
             // Only direct assignments
             if (assignedIds.length > 0) {
                 const assigned = await base44.asServiceRole.entities.Cantiere.filter({
                    id: { $in: assignedIds }
                 }, '-created_date', 1000);
                 return Response.json({ items: assigned, role: 'user', scope: 'assigned' });
             }
        }

        return Response.json({ items: [], role: 'user', scope: 'none' });

    } catch (error) {
        console.error("Error in getMyCantieri:", error);
        return Response.json({ items: [], error: error.message }, { status: 200 });
    }
});