import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import forge from 'npm:node-forge@1.3.1';

// Helper: convert ArrayBuffer to binary string for forge
function arrayBufferToBinaryString(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return binary;
}

Deno.serve(async (req) => {
    try {
        if (req.method === 'OPTIONS') {
            return new Response(null, { status: 204 });
        }

        const base44 = createClientFromRequest(req);
        
        // Auth check
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { file_uri, cloud_file_url } = payload;

        if (!file_uri && !cloud_file_url) {
            return Response.json({ error: 'Missing file_uri or cloud_file_url' }, { status: 400 });
        }

        // 1. Get download URL
        let downloadUrl = cloud_file_url;
        if (file_uri) {
            // Check if it's already a full URL (some legacy data) or needs signing
            if (file_uri.startsWith('http')) {
                downloadUrl = file_uri;
            } else {
                const res = await base44.integrations.Core.CreateFileSignedUrl({ 
                    file_uri, 
                    expires_in: 600 // 10 minutes
                });
                downloadUrl = res.signed_url;
            }
        }

        console.log(`Downloading file from: ${downloadUrl}`);

        // 2. Download file
        const fileRes = await fetch(downloadUrl);
        if (!fileRes.ok) {
            throw new Error(`Failed to download file: ${fileRes.statusText}`);
        }
        
        const arrayBuffer = await fileRes.arrayBuffer();
        
        // 3. Convert to binary string for Forge
        const binaryString = arrayBufferToBinaryString(arrayBuffer);

        // 4. Parse PKCS#7 (P7M)
        let content = null;
        try {
            const asn1 = forge.asn1.fromDer(binaryString);
            const p7 = forge.pkcs7.messageFromAsn1(asn1);
            
            // Extract content from the signed data
            // content is a binary string
            content = p7.content.getBytes();
        } catch (parseError) {
            console.error("PKCS7 Parsing Error:", parseError);
            return Response.json({ 
                error: 'Invalid P7M file structure or not a CAdES file',
                details: parseError.message 
            }, { status: 422 });
        }

        if (!content) {
            return Response.json({ error: 'No content found in P7M envelope' }, { status: 422 });
        }

        // 5. Return extracted content as Base64
        // forge.util.encode64 handles binary strings correctly
        const contentBase64 = forge.util.encode64(content);

        return Response.json({
            status: 'success',
            content_base64: contentBase64,
            content_type: 'application/pdf' // Assuming PDF for now, usually safe for P7M in this context
        });

    } catch (error) {
        console.error("Handler Error:", error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});