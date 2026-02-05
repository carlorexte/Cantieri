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

        // --- DASHBOARD ACCESS CHECK ---
        let hasDashboardAccess = false;

        if (fullUser.role === 'admin') hasDashboardAccess = true;
        else if (fullUser.force_all_cantieri_view || fullUser.cantieri_view === true) hasDashboardAccess = true;
        else if (fullUser.cantieri_assegnati && fullUser.cantieri_assegnati.includes(cantiere_id)) hasDashboardAccess = true;
        else if (fullUser.team_ids && fullUser.team_ids.length > 0 && cantiere.team_assegnati && cantiere.team_assegnati.length > 0) {
            const userTeams = fullUser.team_ids;
            const cantiereTeams = cantiere.team_assegnati;
            if (userTeams.some(tid => cantiereTeams.includes(tid))) hasDashboardAccess = true;
        }
        else if (cantiere.created_by === fullUser.email) hasDashboardAccess = true;

        if (!hasDashboardAccess) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        // --- MODULE SPECIFIC PERMISSIONS (Override Logic) ---
        // Fetch overrides
        const overrides = await base44.asServiceRole.entities.PermessoCantiereUtente.filter({ 
            utente_id: authUser.id, 
            cantiere_id: cantiere_id 
        });

        const getEffectivePermission = (moduleName, action) => {
            if (fullUser.role === 'admin') return true;

            // Check specific override for this cantiere
            if (overrides && overrides.length > 0) {
                const override = overrides[0];
                
                // CRITICAL FIX: Strict Override Precedence
                // If the module object exists in the override (e.g. permessi.sal exists),
                // we treat it as the authoritative source.
                // If the specific action is NOT true, it is DENIED.
                if (override.permessi && override.permessi[moduleName]) {
                    return override.permessi[moduleName][action] === true;
                }
            }

            // Fallback to global user permission ONLY if no module override exists
            const userField = `${moduleName}_${action}`;
            if (fullUser[userField] !== undefined) {
                return fullUser[userField];
            }

            return false; // Default deny
        };

        const permissions = {
            sal: { view: getEffectivePermission('sal', 'view') },
            costi: { view: getEffectivePermission('costi', 'view') },
            subappalti: { view: getEffectivePermission('subappalti', 'view') },
            documenti: { view: getEffectivePermission('documenti', 'view') },
            ordini: { view: getEffectivePermission('ordini_materiale', 'view') },
            attivita: { view: getEffectivePermission('attivita', 'view') || true }
        };

        // Parallel Fetch of related data based on permissions
        const promises = [];
        
        // Always fetch these
        promises.push(base44.asServiceRole.entities.Impresa.list("-created_date", 100));
        promises.push(base44.asServiceRole.entities.Attivita.filter({ cantiere_id }, "-data_fine"));

        // Conditional fetches
        if (permissions.subappalti.view) {
            promises.push(base44.asServiceRole.entities.Subappalto.filter({ cantiere_id }));
        } else {
            promises.push(Promise.resolve([]));
        }

        if (permissions.documenti.view) {
            promises.push(base44.asServiceRole.entities.Documento.filter({
                "$or": [
                    { "entita_collegata_id": cantiere_id },
                    { "entita_collegate.entita_id": cantiere_id }
                ]
            }, "-created_date", 50));
        } else {
            promises.push(Promise.resolve([]));
        }

        if (permissions.sal.view) {
            promises.push(base44.asServiceRole.entities.SAL.filter({ cantiere_id }, "-data_sal"));
        } else {
            promises.push(Promise.resolve([]));
        }

        const [imprese, attivita, subappalti, documenti, sal] = await Promise.all(promises);

        return Response.json({
            cantiere,
            subappalti,
            documenti,
            imprese,
            sal,
            attivita,
            permissions
        });

    } catch (error) {
        console.error("Error in getCantiereDashboardData:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});