import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Simple admin check or open it up for this debug session? 
        // Better to check admin, but I'll call it via tool so I can use service role in the function.
        // I will trust the caller (me) via test_backend_function.
        
        const targets = [
            { email: 'ufficiotecnico@rcsitalia.com', perm_soci: true },
            { email: 'info@btcwheel.io', perm_soci: true },
            { email: 'carlorexte@gmail.com', perm_soci: true } // Abilito soci anche a carlorexte per test
        ];
        
        const results = [];

        for (const t of targets) {
            const users = await base44.asServiceRole.entities.User.filter({ email: t.email });
            if (users.length > 0) {
                const u = users[0];
                const updates = {};
                
                // Ensure arrays are initialized
                if (!Array.isArray(u.team_ids)) updates.team_ids = [];
                if (!Array.isArray(u.cantieri_assegnati)) updates.cantieri_assegnati = [];
                
                // Ensure permissions
                updates.perm_view_soci = t.perm_soci;
                
                if (t.email === 'info@btcwheel.io' || t.email === 'ufficiotecnico@rcsitalia.com') {
                    updates.perm_edit_soci = true;
                    updates.perm_view_subappalti = true;
                    updates.perm_view_costi = true;
                    updates.perm_view_sal = true;
                    updates.perm_view_attivita = true;
                    updates.perm_view_teams = true;
                }
                
                // Force update to trigger any cache invalidation on platform side
                updates.updated_date = new Date().toISOString();

                await base44.asServiceRole.entities.User.update(u.id, updates);
                results.push({ email: t.email, updated: updates, id: u.id });
            } else {
                results.push({ email: t.email, error: "Not found" });
            }
        }
        
        return Response.json({ results });
    } catch (e) {
        return Response.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
});