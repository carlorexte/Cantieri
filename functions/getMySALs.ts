import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const fullUser = await base44.asServiceRole.entities.User.get(user.id);
        
        // 1. Admin or Global View
        if (fullUser.role === 'admin' || fullUser.sal_view === true) {
            const items = await base44.asServiceRole.entities.SAL.list('-data_sal', 100);
            return Response.json({ items });
        }

        // 2. Check Overrides
        const overrides = await base44.asServiceRole.entities.PermessoCantiereUtente.filter({ 
            utente_id: user.id 
        });
        
        // Filter overrides where sal.view is strictly true
        const allowedCantiereIds = overrides
            .filter(o => o.permessi && o.permessi.sal && o.permessi.sal.view === true)
            .map(o => o.cantiere_id);

        if (allowedCantiereIds.length === 0) {
            return Response.json({ items: [] });
        }

        // Fetch SALs for allowed cantieri
        const items = await base44.asServiceRole.entities.SAL.filter({
            cantiere_id: { $in: allowedCantiereIds }
        }, '-data_sal', 100);

        return Response.json({ items });

    } catch (e) {
        console.error("Error in getMySALs:", e);
        return Response.json({ error: e.message }, { status: 500 });
    }
});