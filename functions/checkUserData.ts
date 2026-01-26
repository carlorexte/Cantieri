import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Use service role to inspect data without restrictions
        const users = await base44.asServiceRole.entities.User.filter({
            email: "info@btcwheel.io"
        });

        if (users.length === 0) {
            return Response.json({ error: "User not found" });
        }

        const user = users[0];

        const permissions = await base44.asServiceRole.entities.PermessoCantiereUtente.filter({
            utente_id: user.id
        });

        return Response.json({
            user_summary: {
                id: user.id,
                email: user.email,
                role: user.role,
                cantieri_assegnati: user.cantieri_assegnati,
                team_ids: user.team_ids
            },
            permissions_count: permissions.length,
            permissions_cantieri_ids: permissions.map(p => p.cantiere_id)
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});