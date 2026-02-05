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
        // We use service role to fetch it, then check if user has access
        const cantiere = await base44.asServiceRole.entities.Cantiere.get(cantiere_id);

        if (!cantiere) {
            return Response.json({ error: 'Cantiere not found' }, { status: 404 });
        }

        // Permission Check Logic
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

        // Parallel Fetch of related data
        const [subappalti, documenti, imprese, sal, attivita] = await Promise.all([
            base44.asServiceRole.entities.Subappalto.filter({ cantiere_id }),
            base44.asServiceRole.entities.Documento.filter({
                "$or": [
                    { "entita_collegata_id": cantiere_id },
                    { "entita_collegate": { "$elemMatch": { "entita_id": cantiere_id } } }, // safer mongo-like syntax if supported, or try simple path
                    // Fallback to simple path if $elemMatch isn't supported by the specific adapter, but standard base44 usually supports dot notation for simple matches
                    { "entita_collegate.entita_id": cantiere_id }
                ]
            }, "-created_date", 50),
            base44.asServiceRole.entities.Impresa.list("-created_date", 100),
            base44.asServiceRole.entities.SAL.filter({ cantiere_id }, "-data_sal"),
            base44.asServiceRole.entities.Attivita.filter({ cantiere_id }, "-data_fine")
        ]);

        return Response.json({
            cantiere,
            subappalti,
            documenti,
            imprese,
            sal,
            attivita
        });

    } catch (error) {
        console.error("Error in getCantiereDashboardData:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});