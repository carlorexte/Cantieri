import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Definition of how Role permissions map to User entity boolean fields
const PERMISSION_MAPPING = [
    // Cantieri
    { path: 'cantieri.view', targets: ['cantieri_view'] },
    { path: 'cantieri.edit', targets: ['cantieri_edit', 'cantieri_create'] },
    { path: 'cantieri.admin.delete', targets: ['cantieri_delete'] },
    { path: 'cantieri.admin.archive', targets: ['cantieri_archive'] },

    // SAL
    { path: 'sal.view', targets: ['sal_view'] },
    { path: 'sal.edit', targets: ['sal_edit', 'sal_create'] },
    { path: 'sal.admin.delete', targets: ['sal_delete'] },
    { path: 'sal.admin.approve', targets: ['sal_approve'] },

    // Costi
    { path: 'costi.view', targets: ['costi_view'] },
    { path: 'costi.edit', targets: ['costi_edit', 'costi_create'] },
    { path: 'costi.admin.delete', targets: ['costi_delete'] },

    // Documenti
    { path: 'documenti.view', targets: ['documenti_view'] },
    { path: 'documenti.edit', targets: ['documenti_edit', 'documenti_create'] },
    { path: 'documenti.admin.delete', targets: ['documenti_delete'] },
    { path: 'documenti.admin.archive', targets: ['documenti_archive'] },

    // Imprese
    { path: 'imprese.view', targets: ['imprese_view'] },
    { path: 'imprese.edit', targets: ['imprese_edit', 'imprese_create'] },
    { path: 'imprese.admin.delete', targets: ['imprese_delete'] },

    // Persone (Professionisti)
    { path: 'persone.view', targets: ['persone_view'] },
    { path: 'persone.edit', targets: ['persone_edit', 'persone_create'] },
    { path: 'persone.admin.delete', targets: ['persone_delete'] },

    // Subappalti
    { path: 'subappalti.view', targets: ['subappalti_view'] },
    { path: 'subappalti.edit', targets: ['subappalti_edit', 'subappalti_create'] },
    { path: 'subappalti.admin.delete', targets: ['subappalti_delete'] },

    // Attività (Interne)
    { path: 'attivita_interne.view', targets: ['attivita_view'] },
    { path: 'attivita_interne.edit', targets: ['attivita_edit', 'attivita_create'] },
    { path: 'attivita_interne.admin.delete', targets: ['attivita_delete'] },

    // Ordini Materiale
    { path: 'ordini_materiale.view', targets: ['ordini_view'] },
    { path: 'ordini_materiale.edit', targets: ['ordini_edit', 'ordini_create'] },
    { path: 'ordini_materiale.admin.delete', targets: ['ordini_delete'] },
    { path: 'ordini_materiale.admin.accept', targets: ['ordini_accept'] },

    // Cronoprogramma
    { path: 'cronoprogramma.view', targets: ['cronoprogramma_view'] },
    { path: 'cronoprogramma.edit', targets: ['cronoprogramma_edit'] },

    // Profilo Azienda
    { path: 'profilo_azienda.view', targets: ['profilo_azienda_view'] },
    { path: 'profilo_azienda.edit', targets: ['profilo_azienda_edit'] },

    // User Management
    { path: 'user_management.view', targets: ['utenti_view'] },
    { path: 'user_management.manage_users', targets: ['utenti_manage'] },
    { path: 'user_management.manage_roles', targets: ['utenti_manage_roles'] },
    { path: 'user_management.manage_cantiere_permissions', targets: ['utenti_manage_cantiere_permissions'] },
    
    // Other
    { path: 'dashboard.view', targets: ['dashboard_view'] },
    { path: 'ai_assistant.view', targets: ['ai_assistant_view'] },
    { path: 'teams.view', targets: ['perm_view_teams'] },
    { path: 'teams.edit', targets: ['perm_manage_teams'] }
];

function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function flattenPermissions(nestedPerms) {
    const flat = {};
    PERMISSION_MAPPING.forEach(mapping => {
        const val = !!getNestedValue(nestedPerms, mapping.path);
        mapping.targets.forEach(target => {
            flat[target] = val;
        });
    });
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
            
            const users = await base44.asServiceRole.entities.User.filter({ ruolo_id: roleId });
            const flatPerms = flattenPermissions(roleData.permessi);
            
            await Promise.all(users.map(u => 
                base44.asServiceRole.entities.User.update(u.id, { 
                    ...flatPerms, 
                    updated_date: new Date().toISOString() 
                })
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
            PERMISSION_MAPPING.forEach(m => {
                m.targets.forEach(t => resetPerms[t] = false);
            });
            
            await Promise.all(users.map(u => 
                base44.asServiceRole.entities.User.update(u.id, { 
                    ruolo_id: null,
                    ...resetPerms,
                    updated_date: new Date().toISOString()
                })
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
                const resetPerms = {};
                PERMISSION_MAPPING.forEach(m => {
                    m.targets.forEach(t => resetPerms[t] = false);
                });
                updateData = { ...updateData, ...resetPerms };
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