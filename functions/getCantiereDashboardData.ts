import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { cantiere_id } = await req.json();

        if (!cantiere_id) {
            return Response.json({ error: 'Missing cantiere_id' }, { status: 400 });
        }

        const authUser = await base44.auth.me();
        if (!authUser) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch full user to get custom permission fields
        const fullUser = await base44.asServiceRole.entities.User.get(authUser.id);

        // Fetch the cantiere first to check permissions
        const cantiere = await base44.asServiceRole.entities.Cantiere.get(cantiere_id);

        if (!cantiere) {
            return Response.json({ error: 'Cantiere not found' }, { status: 404 });
        }

        // Permission Check Logic for Cantiere (Dashboard Access)
        let hasAccess = false;

        // 1. Admin
        if (fullUser.role === 'admin') hasAccess = true;

        // 2. Global View Permissions
        else if (fullUser.force_all_cantieri_view || fullUser.cantieri_view === true) hasAccess = true;

        // 3. Direct Assignment
        else if (fullUser.cantieri_assegnati && fullUser.cantieri_assegnati.includes(cantiere_id)) hasAccess = true;

        // 4. Team Assignment
        else if (fullUser.team_ids && fullUser.team_ids.length > 0 && cantiere.team_assegnati && cantiere.team_assegnati.length > 0) {
            const userTeams = fullUser.team_ids;
            const cantiereTeams = cantiere.team_assegnati;
            // Check intersection
            const hasTeam = userTeams.some(tid => cantiereTeams.includes(tid));
            if (hasTeam) hasAccess = true;
        }

        // 5. Creator check
        else if (cantiere.created_by === fullUser.email) hasAccess = true;

        if (!hasAccess) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        // --- SPECIFIC MODULE PERMISSIONS ---
        
        // SAL Permission Check
        let canViewSAL = false;
        if (fullUser.role === 'admin' || fullUser.sal_view === true) {
            canViewSAL = true;
        } else {
            // Check override
            const overrides = await base44.asServiceRole.entities.PermessoCantiereUtente.filter({ 
                utente_id: authUser.id, 
                cantiere_id: cantiere_id 
            });
            // Check if specific permission exists and is true
            // Also need to handle complex object path if filter doesn't support deep query well here, 
            // but we fetch the object so we can check in JS.
            if (overrides.length > 0) {
                const override = overrides[0];
                if (override.permessi && override.permessi.sal && override.permessi.sal.view === true) {
                    canViewSAL = true;
                }
            }
        }

        // Parallel Fetch of related data
        const promises = [
            base44.asServiceRole.entities.Subappalto.filter({ cantiere_id }),
            base44.asServiceRole.entities.Documento.filter({
                "$or": [
                    { "entita_collegata_id": cantiere_id },
                    { "entita_collegate.entita_id": cantiere_id }
                ]
            }, "-created_date", 50),
            base44.asServiceRole.entities.Impresa.list("-created_date", 100),
            base44.asServiceRole.entities.Attivita.filter({ cantiere_id }, "-data_fine")
        ];

        // Only fetch SAL if allowed
        let salPromise;
        if (canViewSAL) {
            salPromise = base44.asServiceRole.entities.SAL.filter({ cantiere_id }, "-data_sal");
        } else {
            salPromise = Promise.resolve([]);
        }

        const [subappalti, documenti, imprese, attivita] = await Promise.all(promises);
        const sal = await salPromise;

        return Response.json({
            cantiere,
            subappalti,
            documenti,
            imprese,
            sal, // Will be empty if no permission
            attivita
        });

    } catch (error) {
        console.error("Error in getCantiereDashboardData:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});