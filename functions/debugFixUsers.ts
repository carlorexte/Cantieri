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
        
        // 1. Get all roles to have a map
        const roles = await base44.asServiceRole.entities.Ruolo.list(100);
        const roleMap = {};
        roles.forEach(r => roleMap[r.id] = r);
        
        // 2. Get all users
        const users = await base44.asServiceRole.entities.User.list(1000);
        const results = [];
        
        for (const user of users) {
            if (user.ruolo_id && roleMap[user.ruolo_id]) {
                const role = roleMap[user.ruolo_id];
                const permissions = role.permessi || {};
                const updates = {};
                let hasUpdates = false;
                
                PERMISSION_KEYS.forEach(key => {
                    const expected = permissions[key] || false;
                    const actual = user[key];
                    
                    if (actual !== expected) {
                        updates[key] = expected;
                        hasUpdates = true;
                    }
                });
                
                if (hasUpdates) {
                    updates.updated_date = new Date().toISOString();
                    await base44.asServiceRole.entities.User.update(user.id, updates);
                    results.push({ email: user.email, updatedKeys: Object.keys(updates) });
                }
            } else if (user.email === 'ufficiotecnico@rcsitalia.com') {
                // If user has no role, verify if they should have permissions enabled manually
                 results.push({ email: user.email, status: "No role assigned" });
            }
        }
        
        return Response.json({ synced_count: results.length, details: results });
    } catch (e) {
        return Response.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
});