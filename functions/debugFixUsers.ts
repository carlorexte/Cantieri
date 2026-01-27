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
        
        const roles = await base44.asServiceRole.entities.Ruolo.list(100);
        const roleMap = {};
        roles.forEach(r => roleMap[r.id] = r);
        
        const users = await base44.asServiceRole.entities.User.filter({ email: 'ufficiotecnico@rcsitalia.com' });
        
        if (users.length === 0) return Response.json({ error: "User not found" });
        
        const user = users[0];
        const role = user.ruolo_id ? roleMap[user.ruolo_id] : null;
        
        const updates = {};
        let hasUpdates = false;
        
        const permissions = role ? (role.permessi || {}) : {};
        
        // Force update if user wants to ensure they are true, regardless of role?
        // Let's just sync first.
        
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
        }
        
        return Response.json({ 
            user_email: user.email,
            ruolo_id: user.ruolo_id,
            role_name: role ? role.nome : "No Role",
            role_permessi_imprese_view: permissions.imprese_view,
            user_permessi_imprese_view: user.imprese_view,
            updated: hasUpdates,
            updates: updates
        });
    } catch (e) {
        return Response.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
});