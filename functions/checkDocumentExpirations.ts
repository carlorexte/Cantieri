import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { addDays, format, parseISO, startOfDay } from 'npm:date-fns@3.3.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch all admins to notify
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const adminEmails = admins.map(u => u.email).filter(Boolean);

    if (adminEmails.length === 0) {
        console.log("No admins found to notify.");
        return Response.json({ success: true, message: "No admins to notify" });
    }

    const today = startOfDay(new Date());

    // Get all active documents with expiry dates
    const docs = await base44.asServiceRole.entities.Documento.filter({
      is_archived: false,
      data_scadenza: { $ne: null }
    });

    const expiringDocs = docs.filter(doc => {
        if (!doc.data_scadenza) return false;
        const expiry = parseISO(doc.data_scadenza);
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        // Notify on days: 30, 7, 3, 1, 0 (today), and -1 (expired yesterday)
        return [30, 7, 3, 1, 0, -1].includes(diffDays);
    });

    const notifications = [];

    for (const doc of expiringDocs) {
        const expiryDate = format(parseISO(doc.data_scadenza), 'dd/MM/yyyy');
        const diffTime = parseISO(doc.data_scadenza) - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let subject = `Scadenza Documento: ${doc.nome_documento}`;
        let body = `Il documento "${doc.nome_documento}" scade il ${expiryDate}.`;
        
        if (diffDays < 0) {
            subject = `SCADUTO: Documento ${doc.nome_documento}`;
            body = `ATTENZIONE: Il documento "${doc.nome_documento}" è SCADUTO il ${expiryDate}.`;
        } else if (diffDays === 0) {
            subject = `SCADE OGGI: Documento ${doc.nome_documento}`;
            body = `URGENTE: Il documento "${doc.nome_documento}" scade OGGI (${expiryDate}).`;
        }

        // Send to all admins
        for (const email of adminEmails) {
            await base44.asServiceRole.integrations.Core.SendEmail({
                to: email,
                subject: subject,
                body: `${body}\n\nSi prega di verificare e aggiornare il documento nel portale.`
            });
        }
        
        notifications.push({ doc: doc.nome_documento, date: expiryDate, days: diffDays });
    }

    return Response.json({
      success: true,
      processed: docs.length,
      notifications_sent: notifications.length * adminEmails.length,
      notifications
    });

  } catch (error) {
    console.error('Error checking expirations:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});