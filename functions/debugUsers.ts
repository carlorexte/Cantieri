import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Target Users
        const targetIds = ['68c2def064ba7461d03eb819', '693c121a7efe4593497f667c'];
        // Target Cantiere (Santobono or similar)
        const cantiereId = '6915ffa01ab94ab5e8998504'; 

        const results = [];

        for (const userId of targetIds) {
            // Get user
            const user = await base44.asServiceRole.entities.User.get(userId);
            if (!user) {
                results.push({ userId, status: 'not found' });
                continue;
            }

            const current = user.cantieri_assegnati || [];
            if (!current.includes(cantiereId)) {
                // UPDATE
                const newAssignments = [...current, cantiereId];
                await base44.asServiceRole.entities.User.update(userId, {
                    cantieri_assegnati: newAssignments
                });
                results.push({ userId, status: 'updated', prev: current, new: newAssignments });
            } else {
                results.push({ userId, status: 'already assigned', assignments: current });
            }
        }
        
        // List all users again to verify
        const users = await base44.asServiceRole.entities.User.list();
        const debugData = users.map(u => ({
            id: u.id,
            email: u.email,
            cantieri_assegnati: u.cantieri_assegnati
        }));

        return Response.json({ results, all_users: debugData });
    } catch (error) {
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
});