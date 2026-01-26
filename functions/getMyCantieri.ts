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
        const assignedIds = fullUser.cantieri_assegnati || [];
        
        console.log("Assigned IDs:", assignedIds);

        if (assignedIds.length === 0) {
            return Response.json({ items: [], role: 'user', message: 'No assignments' });
        }

        const cantieri = await base44.asServiceRole.entities.Cantiere.filter({
            id: { $in: assignedIds }
        }, '-created_date', 100);

        console.log("Found cantieri:", cantieri.length);

        return Response.json({ items: cantieri, role: 'user', debug_ids: assignedIds });

    } catch (error) {
        console.error("Error in getMyCantieri:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});