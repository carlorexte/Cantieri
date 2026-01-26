import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Admin: fetch all (limit 100 for performance, consistent with previous code)
        if (user.role === 'admin') {
            const cantieri = await base44.entities.Cantiere.list('-created_date', 100);
            return Response.json(cantieri);
        }

        // Non-admin: fetch assigned
        // Use service role to ensure we get the full user record with 'cantieri_assegnati'
        const fullUser = await base44.asServiceRole.entities.User.get(user.id);
        
        const assignedIds = fullUser.cantieri_assegnati || [];
        
        if (assignedIds.length === 0) {
            return Response.json([]);
        }

        // Use service role to fetch the cantieri, bypassing any potential RLS issues
        // We trust 'cantieri_assegnati' as the source of truth for visibility
        const cantieri = await base44.asServiceRole.entities.Cantiere.filter({
            id: { $in: assignedIds }
        }, '-created_date', 100);

        return Response.json(cantieri);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});