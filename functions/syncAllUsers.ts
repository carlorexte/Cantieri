import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PERMISSION_MAPPING = [
    { path: 'cantieri.view', targets: ['cantieri_view'] },
    { path: 'cantieri.edit', targets: ['cantieri_edit', 'cantieri_create'] },
    { path: 'cantieri.admin.delete', targets: ['cantieri_delete'] },
    { path: 'cantieri.admin.archive', targets: ['cantieri_archive'] },
    { path: 'sal.view', targets: ['sal_view'] },
    { path: 'sal.edit', targets: ['sal_edit', 'sal_create'] },
    { path: 'sal.admin.delete', targets: ['sal_delete'] },
    { path: 'sal.admin.approve', targets: ['sal_approve'] },
    { path: 'costi.view', targets: ['costi_view'] },
    { path: 'costi.edit', targets: ['costi_edit', 'costi_create'] },
    { path: 'costi.admin.delete', targets: ['costi_delete'] },
    { path: 'documenti.view', targets: ['documenti_view'] },
    { path: 'documenti.edit', targets: ['documenti_edit', 'documenti_create'] },
    { path: 'documenti.admin.delete', targets: ['documenti_delete'] },
    { path: 'documenti.admin.archive', targets: ['documenti_archive'] },
    { path: 'imprese.view', targets: ['imprese_view'] },
    { path: 'imprese.edit', targets: ['imprese_edit', 'imprese_create'] },
    { path: 'imprese.admin.delete', targets: ['imprese_delete'] },
    { path: 'persone.view', targets: ['persone_view'] },
    { path: 'persone.edit', targets: ['persone_edit', 'persone_create'] },
    { path: 'persone.admin.delete', targets: ['persone_delete'] },
    { path: 'subappalti.view', targets: ['subappalti_view'] },
    { path: 'subappalti.edit', targets: ['subappalti_edit', 'subappalti_create'] },
    { path: 'subappalti.admin.delete', targets: ['subappalti_delete'] },
    { path: 'attivita_interne.view', targets: ['attivita_view'] },
    { path: 'attivita_interne.edit', targets: ['attivita_edit', 'attivita_create'] },
    { path: 'attivita_interne.admin.delete', targets: ['attivita_delete'] },
    { path: 'ordini_materiale.view', targets: ['ordini_view'] },
    { path: 'ordini_materiale.edit', targets: ['ordini_edit', 'ordini_create'] },
    { path: 'ordini_materiale.admin.delete', targets: ['ordini_delete'] },
    { path: 'ordini_materiale.admin.accept', targets: ['ordini_accept'] },
    { path: 'cronoprogramma.view', targets: ['cronoprogramma_view'] },
    { path: 'cronoprogramma.edit', targets: ['cronoprogramma_edit'] },
    { path: 'profilo_azienda.view', targets: ['profilo_azienda_view'] },
    { path: 'profilo_azienda.edit', targets: ['profilo_azienda_edit'] },
    { path: 'user_management.view', targets: ['utenti_view'] },
    { path: 'user_management.manage_users', targets: ['utenti_manage'] },
    { path: 'user_management.manage_roles', targets: ['utenti_manage_roles'] },
    { path: 'user_management.manage_cantiere_permissions', targets: ['utenti_manage_cantiere_permissions'] },
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
        const caller = await base44.auth.me();
        if (!caller || caller.role !== 'admin') {
             return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const users = await base44.asServiceRole.entities.User.list('-created_date', 1000);
        let count = 0;

        for (const user of users) {
            if (user.ruolo_id) {
                try {
                    const role = await base44.asServiceRole.entities.Ruolo.get(user.ruolo_id);
                    if (role) {
                        const flatPerms = flattenPermissions(role.permessi);
                        await base44.asServiceRole.entities.User.update(user.id, {
                            ...flatPerms,
                            updated_date: new Date().toISOString()
                        });
                        count++;
                    }
                } catch (e) {
                    console.error(`Skipping user ${user.id} due to role error:`, e);
                }
            }
        }

        return Response.json({ success: true, synced: count });
    } catch (error) {
        console.error("Sync error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});