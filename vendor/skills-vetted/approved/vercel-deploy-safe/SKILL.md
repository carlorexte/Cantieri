---
name: vercel-deploy-safe
description: Deploy preview su Vercel usando solo la CLI ufficiale autenticata. Vietato qualsiasi fallback che impacchetti e carichi il progetto verso endpoint terzi.
---

# Vercel Deploy Safe

Usa questa skill quando serve pubblicare `CantierePro` su Vercel in modo controllato.

## Policy

1. Usa solo la CLI ufficiale `vercel`.
2. Esegui solo preview deploy, non production, salvo richiesta esplicita.
3. Non usare script fallback che comprimono il repository e lo inviano a servizi terzi.
4. Se la CLI non e installata o non e autenticata, fermati e chiedi l'azione minima necessaria.

## Flusso

1. Verifica presenza CLI:

```bash
vercel --version
```

2. Verifica che il progetto sia nella root corretta.

3. Esegui preview deploy:

```bash
vercel deploy -y
```

4. Riporta solo:
   - URL preview;
   - eventuali errori di build;
   - eventuali richieste di login/configurazione.

## Guardrail

- Vietato usare endpoint di deploy non ufficiali.
- Vietato fare upload manuale del progetto a servizi non approvati.
- Vietato promuovere in produzione senza conferma esplicita.
