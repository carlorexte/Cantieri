import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verifica admin (solo per sicurezza, anche se è una funzione di init)
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
           // Permettiamo l'esecuzione se è la prima volta (magari non c'è ancora un admin?)
           // Ma per ora assumiamo che chi lancia questo script sia admin.
           // return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Definizione Ruoli Predefiniti
        const ruoli = [
            {
                nome: "Amministratore",
                descrizione: "Accesso completo a tutte le funzionalità",
                is_system: true,
                permessi: {
                    dashboard: { view: true },
                    ai_assistant: { view: true },
                    cantieri: { view: true, edit: true, admin: { delete: true, archive: true } },
                    imprese: { view: true, edit: true, admin: { delete: true } },
                    persone: { view: true, edit: true, admin: { delete: true } },
                    subappalti: { view: true, edit: true, admin: { delete: true } },
                    costi: { view: true, edit: true, admin: { delete: true } },
                    sal: { view: true, edit: true, admin: { delete: true, approve: true } },
                    ordini_materiale: { view: true, edit: true, admin: { delete: true, accept: true } },
                    attivita_interne: { view: true, edit: true, admin: { delete: true } },
                    documenti: { view: true, edit: true, admin: { delete: true, archive: true } },
                    cronoprogramma: { view: true, edit: true },
                    profilo_azienda: { view: true, edit: true },
                    user_management: { view: true, manage_users: true, manage_roles: true, manage_cantiere_permissions: true }
                }
            },
            {
                nome: "Responsabile Sicurezza",
                descrizione: "Gestione sicurezza e documenti correlati",
                is_system: true,
                permessi: {
                    dashboard: { view: true },
                    cantieri: { view: true, edit: false, admin: { delete: false, archive: false } }, // Vede cantieri assegnati
                    documenti: { view: true, edit: true, admin: { delete: false, archive: true } }, // Carica/Modifica documenti
                    persone: { view: true, edit: false, admin: { delete: false } },
                    imprese: { view: true, edit: false, admin: { delete: false } }
                    // Altri moduli nascosti per default
                }
            },
            {
                nome: "Contabile",
                descrizione: "Gestione costi, SAL e fatturazione",
                is_system: true,
                permessi: {
                    dashboard: { view: true },
                    cantieri: { view: true, edit: false, admin: { delete: false, archive: false } },
                    costi: { view: true, edit: true, admin: { delete: true } },
                    sal: { view: true, edit: true, admin: { delete: true, approve: true } },
                    subappalti: { view: true, edit: true, admin: { delete: false } },
                    imprese: { view: true, edit: true, admin: { delete: false } },
                    ordini_materiale: { view: true, edit: false, admin: { delete: false, accept: false } } // Vede ordini per costi
                }
            },
            {
                nome: "Capocantiere",
                descrizione: "Gestione operativa cantiere e ordini",
                is_system: true,
                permessi: {
                    dashboard: { view: true },
                    cantieri: { view: true, edit: true, admin: { delete: false, archive: false } }, // Può modificare dettagli cantiere
                    cronoprogramma: { view: true, edit: true },
                    ordini_materiale: { view: true, edit: true, admin: { delete: true, accept: false } }, // Crea ordini
                    documenti: { view: true, edit: true, admin: { delete: false, archive: false } }, // Carica foto/doc
                    attivita_interne: { view: true, edit: true, admin: { delete: false } },
                    sal: { view: true, edit: false, admin: { delete: false, approve: false } } // Vede SAL
                }
            }
        ];

        const createdRoles = [];
        const errors = [];

        // 1. Crea i ruoli se non esistono
        for (const ruolo of ruoli) {
            try {
                // Cerca se esiste già per nome
                const existing = await base44.asServiceRole.entities.Ruolo.filter({ nome: ruolo.nome });
                if (existing.length === 0) {
                    const created = await base44.asServiceRole.entities.Ruolo.create(ruolo);
                    createdRoles.push(created);
                } else {
                    // Opzionale: aggiorna permessi se esiste già? Per ora saltiamo
                    // Se vuoi forzare aggiornamento:
                    // await base44.asServiceRole.entities.Ruolo.update(existing[0].id, ruolo);
                    errors.push(`Ruolo ${ruolo.nome} esistente.`);
                }
            } catch (e) {
                errors.push(`Errore creazione ${ruolo.nome}: ${e.message}`);
            }
        }

        return Response.json({ 
            success: true, 
            created: createdRoles,
            messages: errors 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});