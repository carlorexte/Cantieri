/**
 * Funzione per attivare permessi Admin per l'utente corrente
 * 
 * Esecuzione:
 * 1. Vai su Dashboard → Code → Functions
 * 2. Crea nuova funzione con questo codice
 * 3. Esegui la funzione
 * 4. Ricarica la pagina
 * 
 * @platform Base44 + Deno
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log("🔐 Attivazione permessi Admin...");
    
    // 1. Ottieni utente corrente
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ 
        success: false, 
        error: 'Utente non autenticato' 
      }, { status: 401 });
    }
    
    console.log(`✓ Utente: ${user.email} (ID: ${user.id})`);
    
    // 2. Cerca o crea ruolo Admin
    let adminRole = await base44.asServiceRole.entities.Ruolo.filter({ nome: "Amministratore" });
    
    if (!adminRole || adminRole.length === 0) {
      console.log("📋 Creazione ruolo Amministratore...");
      
      // Crea ruolo admin con tutti i permessi
      adminRole = await base44.asServiceRole.entities.Ruolo.create({
        nome: "Amministratore",
        descrizione: "Accesso completo a tutte le funzionalità",
        is_system: true,
        permessi: {
          dashboard: { view: true },
          ai_assistant: { view: true },
          cantieri: { 
            view: true, 
            edit: true, 
            admin: { delete: true, archive: true } 
          },
          imprese: { 
            view: true, 
            edit: true, 
            admin: { delete: true } 
          },
          persone: { 
            view: true, 
            edit: true, 
            admin: { delete: true } 
          },
          subappalti: { 
            view: true, 
            edit: true, 
            admin: { delete: true } 
          },
          costi: { 
            view: true, 
            edit: true, 
            admin: { delete: true } 
          },
          sal: { 
            view: true, 
            edit: true, 
            admin: { delete: true, approve: true } 
          },
          ordini_materiale: { 
            view: true, 
            edit: true, 
            admin: { delete: true, accept: true } 
          },
          attivita_interne: { 
            view: true, 
            edit: true, 
            admin: { delete: true } 
          },
          documenti: { 
            view: true, 
            edit: true, 
            admin: { delete: true, archive: true } 
          },
          cronoprogramma: { 
            view: true, 
            edit: true 
          },
          profilo_azienda: { 
            view: true, 
            edit: true 
          },
          user_management: { 
            view: true, 
            manage_users: true, 
            manage_roles: true, 
            manage_cantiere_permissions: true 
          }
        }
      });
      
      console.log("✓ Ruolo Amministratore creato");
    } else {
      adminRole = adminRole[0];
      console.log("✓ Ruolo Amministratore trovato");
    }
    
    // 3. Assegna ruolo all'utente
    console.log("📝 Assegnazione ruolo all'utente...");
    
    // Cerca se esiste già un'assegnazione
    const existingAssignment = await base44.asServiceRole.entities.UtenteRuolo.filter({ 
      utente_id: user.id,
      ruolo_id: adminRole.id 
    });
    
    if (!existingAssignment || existingAssignment.length === 0) {
      await base44.asServiceRole.entities.UtenteRuolo.create({
        utente_id: user.id,
        ruolo_id: adminRole.id,
        attivo: true
      });
      console.log("✓ Ruolo assegnato con successo");
    } else {
      console.log("✓ Ruolo già assegnato");
    }
    
    // 4. Aggiorna anche il ruolo diretto dell'utente (se necessario)
    try {
      await base44.asServiceRole.entities.Utente.update(user.id, {
        role: 'admin'
      });
      console.log("✓ Ruolo utente aggiornato a 'admin'");
    } catch (e) {
      console.log("⚠️ Aggiornamento ruolo utente non necessario");
    }
    
    console.log("\n✅ =================================================");
    console.log("✅ PERMESSI ADMIN ATTIVATI CON SUCCESSO");
    console.log("✅ =================================================\n");
    
    return Response.json({
      success: true,
      message: "Permessi admin attivati con successo!",
      details: {
        user: user.email,
        role: adminRole.nome,
        cronoprogramma: {
          view: true,
          edit: true
        }
      },
      next_steps: [
        "1. Ricarica la pagina (F5 o Ctrl+R)",
        "2. Vai su Cronoprogramma dal menu",
        "3. Dovresti ora avere accesso completo"
      ]
    });
    
  } catch (error) {
    console.error("❌ Errore:", error);
    console.error("Stack:", error.stack);
    
    return Response.json({
      success: false,
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
});
