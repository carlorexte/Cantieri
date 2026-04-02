# Skills Vetted For Cantieri

Questa cartella contiene una selezione di skill auditata prima dell'inserimento nel workspace.

Struttura:

- `approved/`: skill consentite per uso normale.
- `restricted/`: skill utili ma da usare solo con controlli aggiuntivi.
- `reports/`: report di audit, criteri e decisioni.

Regole operative:

1. Non installare nuove skill nel workspace produttivo senza aggiornare il report in `reports/AUDIT.md`.
2. Non eseguire script presenti in `restricted/` senza leggere prima i rischi documentati.
3. Per skill che fanno download o deployment, usare sempre una review umana prima dell'esecuzione.
