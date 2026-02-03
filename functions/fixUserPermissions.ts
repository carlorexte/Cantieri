import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Use service role to bypass RLS/admin checks on User entity
        // Note: Using 'contains' just in case, but email match is better
        const users = await base44.asServiceRole.entities.User.filter({ email: 'info@btcwheel.io' });
        
        if (users.length === 0) {
            return Response.json({ error: 'User not found' });
        }
        
        const user = users[0];
        
        await base44.asServiceRole.entities.User.update(user.id, {
            cantieri_create: true,
            cantieri_edit: true,
            cantieri_delete: true,
            cantieri_view: true,
            perm_edit_cantieri: true, // Legacy compatibility just in case
            updated_date: new Date().toISOString()
        });
        
        return Response.json({ success: true, userId: user.id });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});