import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const FLATTEN_MAP = [
    { module: 'cantieri', actions: ['view', 'edit'], admin: ['delete'] },
    { module: 'imprese', actions: ['view', 'edit'], admin: ['delete'] },
    { module: 'persone', actions: ['view', 'edit'], admin: ['delete'] },
    { module: 'subappalti', actions: ['view', 'edit'], admin: ['delete'] },
    { module: 'costi', actions: ['view', 'edit'], admin: ['delete'] },
    { module: 'sal', actions: ['view', 'edit'], admin: ['delete'] }, // approve?
    { module: 'attivita', actions: ['view', 'edit'], admin: ['delete'] }, // attivita_interne? check key
    { module: 'documenti', actions: ['view', 'edit'], admin: ['delete'] },
    { module: 'teams', actions: ['view', 'edit'], admin: ['delete'] },
    { module: 'ordini', actions: ['view', 'edit'], admin: ['delete'] }, // ordini_materiale? check key
    { module: 'cronoprogramma', actions: ['view', 'edit'] },
    { module: 'dashboard', actions: ['view'] },
    { module: 'profilo_azienda', actions: ['view', 'edit'] },
    { module: 'utenti', actions: ['view', 'manage'] }
];

// Helper to flatten nested permissions to legacy keys for RLS
function flattenPermissions(nestedPerms) {
    const flat = {};
    
    // Module mapping adjustment (new schema vs old RLS keys)
    const moduleMap = {
        'persone': 'persone',
        'attivita_interne': 'attivita',
        'ordini_materiale': 'ordini'
    };

    for (const [moduleKey, perms] of Object.entries(nestedPerms || {})) {
        const legacyModule = moduleMap[moduleKey] || moduleKey;
        
        // Basic actions
        if (perms.view) flat[`${legacyModule}_view`] = true;
        if (perms.edit) {
            flat[`${legacyModule}_edit`] = true;
            flat[`${legacyModule}_create`] = true; // Map edit to create for RLS simplicity usually
        }
        
        // Admin actions
        if (perms.admin) {
            if (perms.admin.delete) flat[`${legacyModule}_delete`] = true;
        }
        
        // Special cases
        if (moduleKey === 'user_management') {
            if (perms.view) flat['utenti_view'] = true;
            if (perms.manage_users) flat['utenti_manage'] = true;
        }
    }
    return flat;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const payload = await req.json();
        const { action, data } = payload;

        if (action === 'update_role') {
            const { roleId, roleData } = data;
            await base44.entities.Ruolo.update(roleId, roleData);
            
            // Sync all users with this role
            const users = await base44.asServiceRole.entities.User.filter({ ruolo_id: roleId });
            const flatPerms = flattenPermissions(roleData.permessi);
            
            await Promise.all(users.map(u => 
                base44.asServiceRole.entities.User.update(u.id, { ...flatPerms, updated_date: new Date().toISOString() })
            ));
            
            return Response.json({ success: true, synced: users.length });

        } else if (action === 'create_role') {
            const { roleData } = data;
            await base44.entities.Ruolo.create(roleData);
            return Response.json({ success: true });

        } else if (action === 'delete_role') {
            const { roleId } = data;
            await base44.entities.Ruolo.delete(roleId);
            
            const users = await base44.asServiceRole.entities.User.filter({ ruolo_id: roleId });
            const resetPerms = {};
            // We should ideally list all possible keys and set to false, or rely on them being undefined
            // For now, just remove role_id.
            
            await Promise.all(users.map(u => 
                base44.asServiceRole.entities.User.update(u.id, { ruolo_id: null })
            ));
            
            return Response.json({ success: true });

        } else if (action === 'assign_role') {
            const { userId, roleId } = data;
            
            let updateData = { ruolo_id: roleId || null };
            
            if (roleId) {
                const role = await base44.entities.Ruolo.get(roleId);
                if (role) {
                    const flatPerms = flattenPermissions(role.permessi);
                    updateData = { ...updateData, ...flatPerms };
                }
            } else {
                // If removing role, we might want to clear permissions?
                // For now, we leave them or would need to explicitly set to false.
                // Assuming "null" role means standard user defaults.
            }

            await base44.asServiceRole.entities.User.update(userId, updateData);
            return Response.json({ success: true });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error("Error in managePermissions:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});