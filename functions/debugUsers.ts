import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Use service role to ensure we can see everything
        const users = await base44.asServiceRole.entities.User.list();
        
        const debugData = users.map(u => ({
            id: u.id,
            email: u.email,
            full_name: u.full_name,
            role: u.role,
            cantieri_assegnati: u.cantieri_assegnati,
            team_ids: u.team_ids
        }));

        return Response.json({ count: users.length, users: debugData });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});