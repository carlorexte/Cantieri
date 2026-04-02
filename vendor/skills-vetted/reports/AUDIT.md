# Audit Skill Per Cantieri

Data audit: 2026-03-22

## Obiettivo

Ridurre il rischio di supply chain e di inserimento di codice opaco o malevolo nel workspace `CantierePro`, mantenendo solo skill utili al completamento del progetto.

## Criteri di audit

Una skill viene approvata solo se soddisfa queste condizioni:

1. Provenienza verificabile.
2. Contenuto leggibile e limitato.
3. Nessun eseguibile opaco o download non giustificato.
4. Nessun upload automatico del codice del progetto a endpoint terzi.
5. Ambito coerente con il progetto `Cantieri`.
6. Licenza o provenienza abbastanza chiare da consentire uso interno.

## Skill approvate

### `figma-implement-design`

- Fonte: skill locale OpenAI già presente.
- Valutazione: testo procedurale, nessuno script eseguibile nel pacchetto copiato.
- Utilità: alta per UI di dashboard, cronoprogramma e componenti da Figma.
- Rischio residuo: basso. Dipende da MCP Figma, quindi usare solo su richiesta esplicita e con server configurato.

### `frontend-skill`

- Fonte: `openai/skills`.
- Valutazione: skill testuale, struttura piccola, nessun comportamento opaco.
- Utilità: alta per rifinire superfici prodotto e viste ad alta qualità.
- Rischio residuo: basso.

### `security-best-practices`

- Fonte: `openai/skills`.
- Valutazione: skill testuale con riferimenti statici; nessuno script operativo nel pacchetto.
- Utilità: alta per review di sicurezza su React, Express, Supabase-side code e frontend web.
- Rischio residuo: basso.

### `ui-ux-pro-max`

- Fonte: skill locale già presente.
- Valutazione: solo linee guida di design. Nessuno script allegato.
- Utilità: alta per migliorare leggibilità, gerarchia, accessibilità e resa professionale.
- Rischio residuo: basso.

### `openai-docs`

- Fonte: skill locale OpenAI già presente.
- Valutazione: skill ufficiale, orientata a documentazione primaria.
- Utilità: media, utile per funzioni AI e integrazioni OpenAI già presenti o future.
- Rischio residuo: basso.

### `cantieri-project`

- Fonte: skill interna creata nel workspace.
- Valutazione: nessuna dipendenza esterna, solo conoscenza del progetto.
- Utilità: alta come skill di coordinamento locale.
- Rischio residuo: basso.

### `vercel-deploy-safe`

- Fonte: skill interna creata nel workspace.
- Valutazione: sostituisce la skill esterna di deploy con policy piu stretta.
- Utilità: media-alta per preview deploy del progetto.
- Rischio residuo: basso-medio. Richiede ancora credenziali Vercel, ma vieta upload a endpoint terzi non necessari.

## Skill ristrette

### `playwright`

- Fonte: `openai/skills`.
- Stato: consentita solo con review.
- Motivo: lo script `scripts/playwright_cli.sh` esegue `npx --yes --package @playwright/cli playwright-cli`, quindi scarica un pacchetto npm al momento dell'uso.
- Rischio: medio. Non ci sono endpoint sospetti o upload del repository, ma c'è rischio supply chain runtime lato npm e versione non pinata.
- Uso consentito: debugging browser/UI, mai esecuzione automatica in pipeline senza pinning.

### `find-skills`

- Fonte: skill locale.
- Stato: consentita solo per discovery.
- Motivo: porta verso l'ecosistema pubblico `skills.sh` e verso installazioni successive.
- Rischio: medio. Non introduce codice da sola, ma aumenta la superficie di discovery esterna.
- Uso consentito: ricerca di skill; vietata installazione diretta senza nuovo audit.

### `skill-installer`

- Fonte: skill locale OpenAI.
- Stato: consentita solo a livello amministrativo.
- Motivo: scarica contenuto GitHub nel workspace.
- Rischio: medio. Lo script è leggibile e fa validazioni di path, ma la funzione resta ad alto impatto.
- Uso consentito: solo dopo audit manuale repo-per-repo.

## Skill respinte

### `vercel-deploy`

- Fonte: `openai/skills`.
- Decisione: respinta dal workspace operativo.
- Motivo critico: lo script fallback `scripts/deploy.sh` crea un tarball del progetto e lo invia a `https://codex-deploy-skills.vercel.sh/api/deploy`.
- Rischio: alto. Questo comporta upload del codice del progetto a un endpoint terzo non necessario per il nostro modello di fiducia.

### `github-actions` da `vamseeachanta/workspace-hub`

- Decisione: respinta.
- Motivi:
- repository molto ampio e rumoroso, con struttura anomala e numerosi contenuti non pertinenti alle skill;
- licenza assente;
- bassa affidabilità come sorgente singola per skill mission-critical.
- Rischio: alto per scarsa delimitazione del contenuto e cattiva auditabilità.

### Skill community da repo molto ampi o non verificabili

- Esempi: skill scoperte tramite `skills.sh` ma con repo non risolvibili con chiarezza o contenitori enormi/multiuso.
- Decisione: respinte fino a verifica più stretta.
- Motivo: impossibile garantire audit preciso file-per-file con rapporto rischio/beneficio accettabile.

## Note operative

- Le skill copiate nel workspace non diventano automaticamente "preinstallate" per Codex. Sono state vendorizzate e documentate per riuso controllato.
- Per attivarle globalmente in futuro, conviene installare solo i pacchetti già approvati e mantenere questo report come fonte di verità.
- La skill interna `vercel-deploy-safe` copre il caso Vercel senza fallback con upload a terzi.
