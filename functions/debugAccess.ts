import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Admin check
        const currentUser = await base44.auth.me();
        if (!currentUser || currentUser.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { targetEmail, targetCantiereId } = await req.json();

        // 1. Inspect User
        const users = await base44.asServiceRole.entities.User.filter({ email: targetEmail });
        const targetUser = users[0];

        if (!targetUser) {
            return Response.json({ error: "User not found" });
        }

        // 2. Inspect Cantiere
        let cantiere = null;
        if (targetCantiereId) {
            cantiere = await base44.asServiceRole.entities.Cantiere.get(targetCantiereId);
        }

        // 3. Inspect Permissions
        const permissions = await base44.asServiceRole.entities.PermessoCantiereUtente.filter({
            utente_id: targetUser.id
        });

        return Response.json({
            user: {
                id: targetUser.id,
                email: targetUser.email,
                role: targetUser.role,
                ruolo_id: targetUser.ruolo_id,
                
                // Imprese Permissions
                imprese_view: targetUser.imprese_view,
                imprese_create: targetUser.imprese_create,
                imprese_edit: targetUser.imprese_edit,
                imprese_delete: targetUser.imprese_delete,
                
                // Persone Permissions
                persone_view: targetUser.persone_view,
                persone_create: targetUser.persone_create,
                persone_edit: targetUser.persone_edit,
                persone_delete: targetUser.persone_delete,
                
                // Documenti Permissions
                documenti_view: targetUser.documenti_view,
                documenti_create: targetUser.documenti_create,
                documenti_edit: targetUser.documenti_edit,
                documenti_delete: targetUser.documenti_delete,
                
                cantieri_assegnati: targetUser.cantieri_assegnati
            },
            cantiere_exists: !!cantiere,
            cantiere_data: cantiere ? {
                id: cantiere.id,
                denominazione: cantiere.denominazione
            } : null,
            permissions_records: permissions
        });

    } catch (error) {
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
});