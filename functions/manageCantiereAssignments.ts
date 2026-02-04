import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Check authentication
        const currentUser = await base44.auth.me();
        if (!currentUser || currentUser.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { action, userId, cantiereId, userIds, permessi } = await req.json();

        if (action === 'assign_single') {
            // 1. Update User (RLS/Visibility)
            const user = await base44.asServiceRole.entities.User.get(userId);
            const current = user.cantieri_assegnati || [];
            if (!current.includes(cantiereId)) {
                await base44.asServiceRole.entities.User.update(userId, {
                    cantieri_assegnati: [...current, cantiereId]
                });
            }

            // 2. Update PermessoCantiereUtente (Specific Permissions)
            if (permessi) {
                const permessiList = await base44.asServiceRole.entities.PermessoCantiereUtente.filter({
                    utente_id: userId,
                    cantiere_id: cantiereId
                });

                if (permessiList.length > 0) {
                    await base44.asServiceRole.entities.PermessoCantiereUtente.update(permessiList[0].id, {
                        permessi
                    });
                } else {
                    await base44.asServiceRole.entities.PermessoCantiereUtente.create({
                        utente_id: userId,
                        cantiere_id: cantiereId,
                        permessi
                    });
                }
            }

            return Response.json({ success: true });
        }

        if (action === 'assign_bulk') {
            const promises = userIds.map(async (uid) => {
                // 1. Update User (RLS) - Immediate access
                const user = await base44.asServiceRole.entities.User.get(uid);
                const current = user.cantieri_assegnati || [];
                if (!current.includes(cantiereId)) {
                    await base44.asServiceRole.entities.User.update(uid, {
                        cantieri_assegnati: [...current, cantiereId]
                    });
                }

                // 2. Create Persistent Permission Record
                // Check if exists first to avoid duplicates
                const existingPerms = await base44.asServiceRole.entities.PermessoCantiereUtente.filter({
                    utente_id: uid,
                    cantiere_id: cantiereId
                });

                if (existingPerms.length === 0) {
                    await base44.asServiceRole.entities.PermessoCantiereUtente.create({
                        utente_id: uid,
                        cantiere_id: cantiereId,
                        permessi: { cantieri_view: true } // Default permission
                    });
                }
            });
            await Promise.all(promises);
            return Response.json({ success: true });
        }

        if (action === 'remove') {
            // 1. Remove from User (RLS)
            const user = await base44.asServiceRole.entities.User.get(userId);
            const current = user.cantieri_assegnati || [];
            const newAssignments = current.filter(id => id !== cantiereId);
            if (newAssignments.length !== current.length) {
                await base44.asServiceRole.entities.User.update(userId, {
                    cantieri_assegnati: newAssignments
                });
            }

            // 2. Remove PermessoCantiereUtente
            const permessiList = await base44.asServiceRole.entities.PermessoCantiereUtente.filter({
                utente_id: userId,
                cantiere_id: cantiereId
            });

            for (const p of permessiList) {
                await base44.asServiceRole.entities.PermessoCantiereUtente.delete(p.id);
            }

            return Response.json({ success: true });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});