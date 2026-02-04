import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function flattenPermissions(nestedPerms) {
    const flat = {};
    const moduleMap = {
        'persone': 'persone',
        'attivita_interne': 'attivita',
        'ordini_materiale': 'ordini'
    };

    for (const [moduleKey, perms] of Object.entries(nestedPerms || {})) {
        const legacyModule = moduleMap[moduleKey] || moduleKey;
        if (perms.view) flat[`${legacyModule}_view`] = true;
        if (perms.edit) {
            flat[`${legacyModule}_edit`] = true;
            flat[`${legacyModule}_create`] = true;
        }
        if (perms.admin && perms.admin.delete) flat[`${legacyModule}_delete`] = true;
        
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
        const users = await base44.asServiceRole.entities.User.list('-created_date', 1000);
        let count = 0;

        for (const user of users) {
            if (user.ruolo_id) {
                const role = await base44.asServiceRole.entities.Ruolo.get(user.ruolo_id);
                if (role) {
                    const flatPerms = flattenPermissions(role.permessi);
                    await base44.asServiceRole.entities.User.update(user.id, flatPerms);
                    count++;
                }
            }
        }

        return Response.json({ success: true, synced: count });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});