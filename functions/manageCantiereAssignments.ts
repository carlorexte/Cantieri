import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Check authentication
        const currentUser = await base44.auth.me();
        if (!currentUser || currentUser.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { action, userId, cantiereId, userIds } = await req.json();

        if (action === 'assign_single') {
            const user = await base44.asServiceRole.entities.User.get(userId);
            const current = user.cantieri_assegnati || [];
            if (!current.includes(cantiereId)) {
                await base44.asServiceRole.entities.User.update(userId, {
                    cantieri_assegnati: [...current, cantiereId]
                });
            }
            return Response.json({ success: true });
        }

        if (action === 'assign_bulk') {
            const promises = userIds.map(async (uid) => {
                const user = await base44.asServiceRole.entities.User.get(uid);
                const current = user.cantieri_assegnati || [];
                if (!current.includes(cantiereId)) {
                    await base44.asServiceRole.entities.User.update(uid, {
                        cantieri_assegnati: [...current, cantiereId]
                    });
                }
            });
            await Promise.all(promises);
            return Response.json({ success: true });
        }

        if (action === 'remove') {
            const user = await base44.asServiceRole.entities.User.get(userId);
            const current = user.cantieri_assegnati || [];
            const newAssignments = current.filter(id => id !== cantiereId);
            if (newAssignments.length !== current.length) {
                await base44.asServiceRole.entities.User.update(userId, {
                    cantieri_assegnati: newAssignments
                });
            }
            return Response.json({ success: true });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});