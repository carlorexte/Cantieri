import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PERMISSION_KEYS = [
    "cantieri_view", "cantieri_create", "cantieri_edit", "cantieri_delete",
    "imprese_view", "imprese_create", "imprese_edit", "imprese_delete",
    "persone_view", "persone_create", "persone_edit", "persone_delete",
    "subappalti_view", "subappalti_create", "subappalti_edit", "subappalti_delete",
    "costi_view", "costi_create", "costi_edit", "costi_delete",
    "sal_view", "sal_create", "sal_edit", "sal_delete",
    "attivita_view", "attivita_create", "attivita_edit", "attivita_delete",
    "documenti_view", "documenti_create", "documenti_edit", "documenti_delete",
    "teams_view", "teams_create", "teams_edit", "teams_delete",
    "cronoprogramma_view", "cronoprogramma_edit",
    "dashboard_view", "profilo_azienda_view", "profilo_azienda_edit",
    "utenti_view", "utenti_manage"
];

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
            
            // 1. Update the Role Entity
            await base44.entities.Ruolo.update(roleId, roleData);
            
            // 2. Find all users with this role
            const usersWithRole = await base44.asServiceRole.entities.User.filter({ ruolo_id: roleId });
            
            // 3. Sync permissions to all these users
            const permissions = roleData.permessi || {};
            const updatePayload = {};
            
            // Flatten permissions for User entity
            PERMISSION_KEYS.forEach(key => {
                updatePayload[key] = permissions[key] || false;
            });
            updatePayload.updated_date = new Date().toISOString(); // Force update

            // Update users in parallel (batching could be added for large sets)
            const promises = usersWithRole.map(u => 
                base44.asServiceRole.entities.User.update(u.id, updatePayload)
            );
            await Promise.all(promises);

            return Response.json({ success: true, updatedUsers: usersWithRole.length });

        } else if (action === 'create_role') {
            const { roleData } = data;
            await base44.entities.Ruolo.create(roleData);
            return Response.json({ success: true });

        } else if (action === 'delete_role') {
            const { roleId } = data;
            // 1. Delete Role
            await base44.entities.Ruolo.delete(roleId);
            
            // 2. Find users with this role and strip permissions
            const usersWithRole = await base44.asServiceRole.entities.User.filter({ ruolo_id: roleId });
            
            const updatePayload = { ruolo_id: null };
            PERMISSION_KEYS.forEach(key => { updatePayload[key] = false; });
            updatePayload.updated_date = new Date().toISOString();

            const promises = usersWithRole.map(u => 
                base44.asServiceRole.entities.User.update(u.id, updatePayload)
            );
            await Promise.all(promises);
            
            return Response.json({ success: true, updatedUsers: usersWithRole.length });

        } else if (action === 'assign_role') {
            const { userId, roleId } = data;
            
            // 1. Fetch the Role to get permissions
            let permissions = {};
            if (roleId) {
                const role = await base44.entities.Ruolo.get(roleId);
                permissions = role.permessi || {};
            }

            // 2. Prepare User Update Payload
            const updatePayload = { ruolo_id: roleId || null };
            
            // Apply permissions (or clear them if roleId is null)
            PERMISSION_KEYS.forEach(key => {
                updatePayload[key] = permissions[key] || false;
            });
            updatePayload.updated_date = new Date().toISOString();

            // 3. Update User
            await base44.asServiceRole.entities.User.update(userId, updatePayload);
            
            return Response.json({ success: true });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error("Error in managePermissions:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});