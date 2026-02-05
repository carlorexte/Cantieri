import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const fullUser = await base44.asServiceRole.entities.User.get(user.id);
        const overrides = await base44.asServiceRole.entities.PermessoCantiereUtente.filter({ 
            utente_id: user.id 
        });

        // 1. Admin - Sees everything
        if (fullUser.role === 'admin') {
            const items = await base44.asServiceRole.entities.SAL.list('-data_sal', 100);
            return Response.json({ items });
        }

        // 2. Global View User (e.g. sal_view = true)
        // Checks for Deny overrides
        if (fullUser.sal_view === true) {
            // Determine forbidden IDs: Cantieri where override exists AND sal.view is NOT true
            const forbiddenCantiereIds = overrides
                .filter(o => {
                    // If override object for 'sal' exists, it takes precedence.
                    // If view is not explicitly true, it is forbidden.
                    if (o.permessi && o.permessi.sal) {
                        return o.permessi.sal.view !== true;
                    }
                    return false; // No override for SAL, global permission stands
                })
                .map(o => o.cantiere_id);

            let items = await base44.asServiceRole.entities.SAL.list('-data_sal', 100);
            
            if (forbiddenCantiereIds.length > 0) {
                items = items.filter(item => !forbiddenCantiereIds.includes(item.cantiere_id));
            }
            return Response.json({ items });
        }

        // 3. No Global View User
        // Only explicit allows via overrides
        const allowedCantiereIds = overrides
            .filter(o => o.permessi && o.permessi.sal && o.permessi.sal.view === true)
            .map(o => o.cantiere_id);

        if (allowedCantiereIds.length === 0) {
            return Response.json({ items: [] });
        }

        // Fetch only allowed SALs
        const items = await base44.asServiceRole.entities.SAL.filter({
            cantiere_id: { $in: allowedCantiereIds }
        }, '-data_sal', 100);

        return Response.json({ items });

    } catch (e) {
        console.error("Error in getMySALs:", e);
        return Response.json({ error: e.message }, { status: 500 });
    }
});