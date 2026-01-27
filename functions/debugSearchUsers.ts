import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Use service role to list users
        const users = await base44.asServiceRole.entities.User.list(100);
        
        const matches = users.filter(u => 
            (u.email && u.email.toLowerCase().includes('ufficiotecnico')) ||
            (u.full_name && u.full_name.toLowerCase().includes('ufficiotecnico'))
        );
        
        const mapped = matches.map(u => ({
            id: u.id,
            email: u.email,
            full_name: u.full_name,
            role: u.role,
            ruolo_id: u.ruolo_id,
            imprese_view: u.imprese_view,
            persone_view: u.persone_view
        }));
        
        return Response.json({ count: matches.length, users: mapped });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
});