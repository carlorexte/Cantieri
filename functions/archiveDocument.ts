import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { document_id } = await req.json();

    if (!document_id) {
        return Response.json({ error: 'document_id required' }, { status: 400 });
    }

    const doc = await base44.entities.Documento.get(document_id);
    if (!doc) {
        return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Mock External API Call
    // const externalResponse = await fetch('https://external-archive-service.com/api/archive', { ... });
    const mockArchiveId = `ARCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Update Document
    await base44.entities.Documento.update(document_id, {
        is_archived: true,
        stato_archiviazione: 'archiviato',
        archiviazione_id: mockArchiveId
    });

    return Response.json({
      success: true,
      archiviazione_id: mockArchiveId,
      message: "Documento archiviato con successo nel sistema esterno (simulato)."
    });

  } catch (error) {
    console.error('Error archiving document:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});