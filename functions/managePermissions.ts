import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Security Check: Only admin can manage permissions
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const payload = await req.json();
        const { action, data } = payload;

        if (action === 'update_role') {
            const { roleId, roleData } = data;
            // Simply update the Role entity. 
            // We NO LONGER copy permissions to the user entity.
            await base44.entities.Ruolo.update(roleId, roleData);
            return Response.json({ success: true });

        } else if (action === 'create_role') {
            const { roleData } = data;
            await base44.entities.Ruolo.create(roleData);
            return Response.json({ success: true });

        } else if (action === 'delete_role') {
            const { roleId } = data;
            // 1. Delete Role
            await base44.entities.Ruolo.delete(roleId);
            
            // 2. Find users with this role and remove reference
            const usersWithRole = await base44.asServiceRole.entities.User.filter({ ruolo_id: roleId });
            
            const promises = usersWithRole.map(u => 
                base44.asServiceRole.entities.User.update(u.id, { ruolo_id: null })
            );
            await Promise.all(promises);
            
            return Response.json({ success: true, updatedUsers: usersWithRole.length });

        } else if (action === 'assign_role') {
            const { userId, roleId } = data;
            
            // Simply update ruolo_id on User
            await base44.asServiceRole.entities.User.update(userId, { ruolo_id: roleId || null });
            
            return Response.json({ success: true });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error("Error in managePermissions:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});