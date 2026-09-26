# PowerMeter — Design Brief per Claude Design

> Questo documento descrive **ogni schermata** di PowerMeter. Disegnale tutte seguendo le regole
> globali (sezioni 1–4), poi le schermate una per una (sezioni 5–14).
> Alla fine esporta il risultato come indicato nella sezione 15.

---

## 1. Il prodotto in breve

**PowerMeter** è un tool non ufficiale per il MMORPG **Aion 2** (NCSoft), creato da **Letrion Labs**.
Unisce in un'unica piattaforma:

- un **DPS meter** in tempo reale che legge i dati di combattimento mentre si gioca;
- **log di combattimento online** con report dettagliati, classifiche e link condivisibili;
- un **build planner** completo (equipaggiamento, skill, Daevanion) con profili personaggio condivisibili;
- un **database di gioco** (oggetti, skill, NPC, quest, dungeon), mappa interattiva e calcolatori;
- un **organizer** per attività giornaliere/settimanali, timer e liste della spesa.

Il nome gioca su **Combat Power (CP)**, la statistica che in Aion 2 misura la forza di un personaggio:
PowerMeter misura sia il DPS in combattimento sia il "potere" della build.

### Le tre superfici

| Superficie | Cos'è | Dove | Dimensioni di riferimento |
|---|---|---|---|
| **Dashboard** | App desktop Windows a finestra piena, navigabile | PC del giocatore | 1440×900 (minimo 1280×720) |
| **Widget** | Finestra overlay piccola, trasparente, sempre in primo piano, **trascinabile** sopra il gioco | PC del giocatore, sopra Aion 2 | default 400×300, minimo 280×160, ridimensionabile |
| **Sito web** | Pagine pubbliche: landing, download, log/build/profili condivisi, classifiche | `powermeter.letrionlabs.it` | desktop 1440 + **mobile 390** (i link si aprono spesso dal telefono via Discord) |

Dashboard e sito web condividono lo **stesso design system** e molte schermate (report log, build,
profilo): progetta i componenti una volta sola, riusabili in entrambi.

### Chi lo usa

Giocatori di Aion 2 della regione Global/EU, dal casual al raider hardcore. Usano il widget
**mentre combattono**: deve essere leggibile in una frazione di secondo, sopra scene di gioco sia
molto chiare sia molto scure. Nella dashboard invece studiano con calma: lì la densità di dati è
un pregio, non un difetto.

---

## 2. Regola della lingua (FONDAMENTALE)

Il gioco **non è tradotto in italiano**: i giocatori italiani lo giocano in inglese.
Quindi:

- **Interfaccia del tool in italiano**: menu, pulsanti, titoli, messaggi, spiegazioni, tooltip.
- **Tutto ciò che appare nel gioco resta in inglese, esattamente come nel gioco**: nomi di oggetti,
  armi, set, skill, buff, mappe, zone, dungeon, boss, NPC, quest, classi, statistiche di gioco,
  termini di combattimento.

| Tipo | Lingua | Esempi |
|---|---|---|
| Navigazione e azioni | Italiano | Home, Personaggi, Classifiche, Impostazioni, Condividi, Carica log, Copia link |
| Etichette di interfaccia | Italiano | Durata, Tentativo, Danno totale, Pezzi mancanti, Ultimo aggiornamento |
| Classi | Inglese | Gladiator, Templar, Assassin, Ranger, Sorcerer, Cleric, Chanter… |
| Statistiche di gioco | Inglese | Attack, Accuracy, Critical Strike, Combat Power (CP) |
| Termini di combattimento | Inglese | Crit, Back Attack, Parry, Perfect, Double, DOT, DPS, HPS |
| Contenuti | Inglese | nomi di item, skill, boss, dungeon, mappe |

Esempio corretto di una riga: **"Pezzi mancanti: 3"** → sotto, i nomi degli oggetti in inglese.
Esempio corretto di intestazione tabella: **"Skill · Danno · % · Colpi · Crit% · Min · Max · Media · Back · Parry · Perfect · Double · Multi"**.

**Lingue supportate** (selettore in impostazioni e nel footer del sito):
Italiano (default nei mockup), English, Deutsch, Français, Español, Português, Русский, 日本語, 한국어, 简体中文, 繁體中文.

**Vincolo di layout**: le etichette in tedesco e russo sono fino al **30–40% più lunghe**
dell'italiano, il cinese/giapponese/coreano molto più corte ma più alte. Nessun testo di interfaccia
deve stare in un contenitore a larghezza fissa che si rompe: prevedi troncamento con tooltip o
andata a capo. Mostra almeno una schermata chiave (widget DPS) anche in versione tedesca per verificare.

---

## 3. Direzione visiva

### Mood
Strumento **da professionista**, non da fan site. Pensa a un cockpit o a un terminale di analisi:
preciso, denso, calmo, con un solo accento di energia. Scuro di default. Deve sentirsi "premium"
senza effetti gratuiti.

### Riferimenti
- **AbyssLogs** (abysslogs.com): tema scuro, accenti teal/menta, tabelle dense a molte colonne,
  icone di classe colorate. È il nostro riferimento principale per la parte meter e log.
  Vogliamo essere **almeno a quel livello**, ma con un'identità nostra.
- **questlog.gg/aion-2**: riferimento per database, build planner e mappa.
- L'estetica fantasy di Aion (ali, Aether, luce e ombra fra Elyos e Asmodian) può entrare come
  **dettaglio** (texture sottili, un motivo, il logo), mai come decorazione pesante.

### Da evitare
- Look "template AI": gradienti viola-blu generici, glassmorphism ovunque, card tutte uguali, emoji come icone.
- Font fantasy/medievali nell'interfaccia (al massimo nel logo).
- Animazioni lunghe: il widget non deve mai animare durante il combattimento oltre al movimento delle barre.
- Colore usato solo decorativamente: ogni colore deve significare qualcosa (classe, rarità, stato, fazione).

### Design system da proporre
Proponi e documenta:

- **Palette**: sfondi scuri a più livelli (almeno 4 elevazioni), testo primario/secondario/terziario,
  un colore accento del brand, colori di stato (successo, avviso, errore, info).
- **Colori delle classi**: uno distinto per ogni classe, riconoscibile anche nelle barre sottili del
  widget e accessibile ai daltonici (abbinalo sempre all'icona di classe, mai solo il colore).
  Classi da coprire: Gladiator, Templar, Assassin, Ranger, Sorcerer, Elementalist, Cleric, Chanter,
  Brawler *(lista da verificare sui dati reali: prevedi slot per 8–10 classi)*.
- **Colori di rarità degli oggetti**: una scala di 6 gradi (dal più comune al più raro).
  I nomi esatti dei gradi di Aion 2 arriveranno dai dati: prevedi 6 slot.
- **Colori delle fazioni**: Elyos e Asmodian.
- **Tipografia**: un sans per l'interfaccia + un **monospace o sans con cifre tabellari** per tutti i
  numeri (DPS, danni, percentuali devono allinearsi in colonna e non "ballare" mentre cambiano).
  Deve supportare cirillico e CJK (o avere fallback dichiarati).
- **Scala di spaziature, raggi, ombre/bordi, icone** (set coerente, lineare).
- **Tema chiaro**: facoltativo per la dashboard; obbligatorio solo il tema scuro.
- **Motion**: transizioni brevi (150–250 ms), entrate con ease-out; rispettare "riduci movimento".

### Logo
Proponi un logo per **PowerMeter** (wordmark + simbolo). Idee: un indicatore/gauge, una barra di
potenza, un'ala stilizzata che diventa grafico. Deve funzionare a 16 px (icona del widget e della
tray di Windows) e su sfondo scuro. Firma secondaria: "by Letrion Labs".

---

## 4. Regole trasversali per tutte le schermate

1. **Numeri**: separatore delle migliaia secondo la lingua (in italiano `1.234.567`), abbreviazioni
   nei contesti stretti (`1,2 M`, `845 K`). DPS sempre con cifre tabellari.
2. **Stati da disegnare per ogni schermata con dati**: caricamento (skeleton), vuoto (con azione
   suggerita), errore (con "Riprova"), offline.
3. **Accessibilità**: contrasto AA minimo, focus da tastiera visibile, target cliccabili ≥ 32 px nella
   dashboard e ≥ 44 px su mobile.
4. **Icone di classe e oggetti**: usa segnaposto (cerchio/quadrato con iniziale o forma generica):
   le icone vere arriveranno dai dati di gioco.
5. **Dati d'esempio**: usa nomi inglesi plausibili ma inventati per item, boss e dungeon, e nomi
   giocatore fantasy (es. *Kaelthas*, *Nyxara*, *Ironveil*). Mai dati reali di persone.
6. **Tooltip**: qualunque metrica abbreviata (es. "Back%") ha un tooltip con spiegazione in italiano.
7. **Link condivisibili**: ogni oggetto condivisibile (log, build, profilo) ha lo stesso pattern
   di "Condividi" (vedi schermata 13.3).

---

## 5. Dashboard — struttura generale

### 5.1 Layout dell'app (shell)
- **Barra del titolo personalizzata** (l'app è senza cornice di Windows): logo, nome, pulsanti
  riduci/massimizza/chiudi, area trascinabile.
- **Sidebar sinistra** comprimibile (espansa 240 px, compressa 64 px solo icone), con gruppi:
  - **Home**
  - **Combattimento**: DPS Meter · Storico combattimenti · Log online · Classifiche · Statistiche classi
  - **Personaggi**: I miei personaggi · Build · Skill Planner · Daevanion
  - **Database**: Cerca · Oggetti · Skill · NPC e mostri · Quest · Dungeon
  - **Mondo**: Mappa · Crafting · Calcolatori · Armory
  - **Organizer**: Attività · Timer · Lista della spesa · Flow Map
  - in fondo: **Supporter** · **Impostazioni**
- **Topbar**: ricerca globale (scorciatoia `Ctrl+K`), **selettore personaggio attivo** (avatar
  classe + nome + CP), indicatore stato meter (vedi 5.2), pulsante "Apri widget", avatar account
  Discord (o "Accedi").
- **Area contenuto** con titolo pagina, breadcrumb dove serve, azioni principali in alto a destra.

### 5.2 Indicatore di stato del meter (componente)
Pillola nella topbar con 5 stati: **Gioco non rilevato** (grigio) · **In attesa di connessione** (giallo,
pulsante) · **Pronto** (verde) · **In combattimento** (accento, con timer) · **Errore** (rosso, cliccabile:
apre la diagnosi). Ogni stato ha un tooltip in italiano.

### 5.3 Palette comandi (`Ctrl+K`)
Modale di ricerca globale: cerca in pagine del tool, oggetti, skill, NPC, dungeon, personaggi, log.
Risultati raggruppati per tipo, navigazione da tastiera, anteprima a destra.

---

## 6. Primo avvio e sistema

### 6.1 Onboarding (4–5 step, modale a tutta finestra)
1. **Benvenuto**: logo, una frase su cosa fa PowerMeter, selettore **lingua**.
2. **Controllo requisiti** con checklist live: Windows 10/11 ✓ · **Npcap installato** (con link
   "Scarica Npcap" e nota "attiva la modalità WinPcap API-compatible") · **Avviato come amministratore**
   (con pulsante "Riavvia come amministratore") · Aion 2 rilevato (facoltativo in questa fase).
3. **Il tuo personaggio**: regione (default **Global/EU**), nome personaggio, classe; nota
   "verrà rilevato anche in automatico dal titolo della finestra del gioco".
4. **Account (facoltativo)**: "Accedi con Discord" per caricare log e condividere build; "Più tardi".
5. **Avviso**: "PowerMeter è un tool non ufficiale, non affiliato a NCSoft. Legge in modo passivo i
   dati di combattimento. Usalo sotto la tua responsabilità." con checkbox di accettazione.

### 6.2 Diagnosi del meter
Pagina/modale aperta dall'indicatore in stato di errore: lista dei controlli (Npcap, permessi,
adattatore di rete rilevato, gioco rilevato, porta di combattimento trovata) con esito e azione
correttiva per ognuno. Selettore manuale dell'adattatore di rete (utile con VPN/ping reducer).

### 6.3 Impostazioni
Pagina a schede verticali:
- **Generale**: lingua, tema (scuro/chiaro/sistema), avvio con Windows, riduci nella tray alla chiusura.
- **Meter**: adattatore di rete, modalità bersaglio predefinita (Boss / Last Hit / All Targets / Train),
  nome personaggio e actor ID, auto-salvataggio combattimenti contro boss, **upload automatico**
  dei log (on/off, visibilità predefinita).
- **Widget**: opacità, scala (75–150%), click-through (il mouse passa attraverso), mostra/nascondi
  colonne, numero massimo di righe, tema del widget, posizione salvata per monitor.
- **Scorciatoie**: tabella azioni ↔ tasti modificabili (mostra/nascondi widget, blocca/sblocca,
  reset combattimento, cambia modalità DPS/Build, screenshot).
- **Account**: Discord collegato (avatar, nome, "Disconnetti"), Patreon collegato (stato supporter).
- **Dati**: esporta/importa tutto, pulisci cache, cartella dei log locali, dimensione occupata.
- **Notifiche**: webhook Discord (vedi 12.6), notifiche di Windows per i timer.
- **Informazioni**: versione, "Controlla aggiornamenti", licenza GPL-3.0, crediti, disclaimer.

### 6.4 Aggiornamento disponibile
Banner non invasivo in cima alla dashboard + modale con note di rilascio (in italiano) e "Aggiorna ora".

### 6.5 Tray di Windows
Menu contestuale dell'icona nella tray: Apri dashboard · Mostra/Nascondi widget · Blocca widget ·
Modalità DPS / Build · Esci.

---

## 7. Home (dashboard)

Panoramica del personaggio attivo, a griglia di moduli:
- **Card personaggio**: nome, classe, livello, server, **CP grande** con variazione dall'ultima
  settimana, build attiva.
- **Progresso build**: "Pezzi posseduti 11/15", barra, i 3 prossimi upgrade consigliati.
- **Ultimi combattimenti**: 5 righe (boss/dungeon, esito kill/wipe, DPS, posizione nel party, data),
  stato upload, link al report.
- **Attività di oggi**: le daily/weekly aperte con checkbox rapide.
- **Timer**: prossimi reset (giornaliero, settimanale) e timer personalizzati con countdown.
- **Novità**: ultime patch note/notizie del gioco (titolo + data + link).
- Stato vuoto per il primo avvio: "Entra in un combattimento per vedere i tuoi primi dati".

---

## 8. Widget overlay (la schermata più importante)

Il widget è una finestra **senza cornice, trasparente, sempre in primo piano**, che il giocatore
**trascina dove vuole** sul desktop o sopra il gioco. Disegnalo **sopra uno screenshot di gioco
fittizio** (scena fantasy chiara e scena scura) per verificare la leggibilità.

### 8.1 Cornice e controlli (comuni a tutte le modalità)
- **Barra superiore sottile** (area di trascinamento, cursore "sposta"): logo mini, **switch di
  modalità** `DPS | Build` (e in R2 `Lobby`), timer del combattimento, icone: blocca
  (click-through), opacità, riduci a pillola, apri dashboard, chiudi.
- **Maniglie di ridimensionamento** visibili solo al passaggio del mouse.
- **Stato bloccato** (click-through): la barra si riduce al minimo, compare un piccolo lucchetto;
  si sblocca solo con la scorciatoia o dalla tray. Mostra come appare.
- **Pillola ridotta**: forma minima (circa 160×32) con DPS personale e timer; clic per espandere.
- Sfondo semi-trasparente regolabile (mostra 3 livelli: 30%, 60%, 90%).

### 8.2 Modalità DPS — combattimento in corso
- **Intestazione bersaglio**: nome boss (inglese), **barra HP del boss** con percentuale, **timer
  berserk** (conto alla rovescia, diventa rosso negli ultimi 30 s), selettore modalità bersaglio
  (Boss / Last Hit / All Targets / Train).
- **Lista party** (fino a 6 righe, poi scroll; per le raid prevedi 12+): per ogni riga icona classe,
  nome giocatore, **barra orizzontale colorata della classe** proporzionale al danno, **DPS**,
  **% del danno totale**, danno totale abbreviato. La riga del giocatore stesso è evidenziata.
- **Piè**: ping (ms, colorato), durata, "DPS party".
- Le barre si aggiornano fluidamente; l'ordine delle righe cambia con animazione breve.

### 8.3 Modalità DPS — dettaglio di un giocatore
Clic su una riga → il widget mostra il breakdown di quel giocatore: lista skill con icona, nome
(inglese), danno, %, colpi, Crit%, e in alto 5 badge: **CRIT · BACK · PARRY · PERFECT · DOUBLE** con
percentuale. Pulsante "Indietro". Variante: mostra le cure (HPS) invece del danno.

### 8.4 Modalità DPS — altri stati
- **In attesa**: "In attesa di Aion 2…" / "Nessun combattimento attivo" con l'ultimo risultato in grigio.
- **Fine combattimento**: riepilogo (esito, durata, tuo DPS, posizione) + pulsante **"Carica log"**
  (o "Caricato ✓ · Copia link" se l'upload è automatico) + "Apri report".
- **Errore di cattura**: messaggio breve + "Diagnosi".
- **Grafico mini**: variante con una sparkline del DPS nel tempo sotto la lista.

### 8.5 Modalità Build
Quadro rapido della **build attiva**, consultabile senza aprire la dashboard:
- Intestazione: nome build, classe, **CP attuale → CP obiettivo**, barra di completamento.
- **Griglia slot** compatta (armi, armatura, accessori, ali, ecc.): ogni slot con icona e bordo del
  colore di rarità; slot **posseduto** pieno, slot **mancante** tratteggiato/attenuato con il nome
  dell'oggetto obiettivo in inglese al passaggio del mouse.
- Scheda **"Mancanti"**: lista dei pezzi che mancano con dove si ottengono (drop/crafting/negozio).
- Scheda **"Statistiche"**: le statistiche principali (inglese) con valore attuale vs obiettivo.
- Selettore rapido per cambiare build o personaggio.
- Pulsante "Apri nel builder".

### 8.6 Modalità Lobby dungeon (R2)
Prima del pull: lista dei membri del party con classe, **CP**, gear score, e stato
**Pronto / Non pronto**. Utile al capo gruppo per un controllo al volo.

### 8.7 Varianti di dimensione
Mostra il widget DPS in: **compatto** (280×160, solo nome+DPS+barra), **standard** (400×300),
**esteso** (520×480 con dettaglio e grafico). E una versione **in tedesco**.

---

## 9. Combattimento e log

### 9.1 DPS Meter (pagina nella dashboard)
Versione a tutta pagina del meter live: lista party grande, grafico DPS in tempo reale di tutti i
giocatori (linee colorate per classe), breakdown della skill del giocatore selezionato a destra,
controlli: modalità bersaglio, reset, salva, "Stacca nel widget".

### 9.2 Storico combattimenti (locale)
Tabella: data/ora, dungeon → boss, esito (Kill/Wipe), durata, tuo DPS, tua posizione, numero
giocatori, stato upload (Locale / Caricato / Errore). Filtri: periodo, dungeon, boss, esito, solo
boss. Azioni di massa: carica, elimina, esporta. Clic → report.

### 9.3 Report di combattimento (dashboard e web — la seconda schermata più importante)
Deve essere al livello di AbyssLogs o migliore.
- **Breadcrumb**: Dungeon → Segmento (boss) → Tentativo n. Frecce per il tentativo precedente/successivo.
- **Intestazione**: nome boss, esito (badge Kill/Wipe), durata, data, regione, party (icone classe),
  visibilità, pulsanti **Condividi**, **Confronta**, **Esporta**.
- **Tabella party**: per ogni giocatore classe, nome, CP, DPS, danno totale, %, colpi, morti.
  Barra colorata della classe nella colonna del danno.
- **Grafico principale**: DPS nel tempo per giocatore (linee), con marcatori degli eventi (morti,
  fasi del boss) e selezione di un intervallo che filtra tutto il report.
- **Schede**:
  1. **Panoramica**: la tabella party + grafico.
  2. **Skill**: per il giocatore selezionato, card riassuntiva giocatore vs boss (danno, cast,
     danno ricevuto, cure / boss: danno, cast, colpi, durata), i 5 badge **CRIT · BACK · PARRY ·
     PERFECT · DOUBLE**, e la tabella **"Skill vs [Boss]"** a 13 colonne:
     *Skill · Danno · % · Colpi · Crit% · Min · Max · Media · Back · Parry · Perfect · Double · Multi*.
     Ordinabile per colonna, righe espandibili (dettaglio DOT, evocazioni fuse con il proprietario).
  3. **Timeline skill**: una riga per skill, un segno per ogni cast nel tempo (tipo diagramma di
     Gantt), toggle "Solo io / Party".
  4. **Timeline buff**: barre di attività di buff e debuff nel tempo con **uptime %** per giocatore.
  5. **Danno ricevuto**: chi ha preso danno da cosa.
  6. **Cure**: HPS per giocatore e skill.
  7. **Bersagli**: danno per bersaglio (utile per i trash e le fasi con add).
- **Confronto**: vista affiancata di due giocatori (anche da log diversi) con differenze evidenziate.
- **Mobile (web 390)**: tabelle con prima colonna fissa e scroll orizzontale, schede come menu a
  tendina, grafici semplificati.

### 9.4 Report di dungeon (vista multi-segmento)
Pagina che raccoglie un'intera run: elenco dei segmenti (boss e tentativi, con esito e durata),
riepilogo per giocatore sull'intera run, tempo totale.

### 9.5 Log online (i miei log caricati)
Come lo storico ma per i log sul server: visibilità (Pubblico / Non in elenco / Privato),
visualizzazioni, link, posizione in classifica se c'è. Avviso dei limiti per chi non è supporter
(es. "I log più vecchi di 30 giorni vengono archiviati · Diventa Supporter per conservarli tutti").

### 9.6 Esplora log pubblici (web + dashboard)
Lista/griglia dei log pubblici recenti con filtri: regione (TW, KR, NA, SA, EU, Asia; default EU),
dungeon, boss, classe, periodo, solo kill. Contatori in alto: combattimenti registrati totali,
questa settimana, ultimo upload.

### 9.7 Classifiche
Selettore: regione → dungeon → boss → classe (o "Tutte") → periodo (settimana/mese/stagione).
Tabella: posizione, giocatore, classe, DPS, CP, durata, data, link al log. Podio evidenziato per i
primi 3. Riga del giocatore stesso fissata in basso se fuori dalla vista.

### 9.8 Statistiche delle classi
Grafici: DPS medio per classe per boss (barre orizzontali colorate per classe), distribuzione delle
classi giocate, andamento nel tempo dopo le patch. Filtri come le classifiche.

---

## 10. Personaggi e build

### 10.1 I miei personaggi
Griglia di card: nome, classe, server, livello, CP, build attiva, ultimo combattimento. Azioni:
aggiungi, duplica, importa, esporta, elimina, imposta come attivo.

### 10.2 Profilo personaggio (dashboard + pagina web pubblica)
- **Intestazione**: nome, classe, fazione, server, livello, **CP**, titolo, avatar/ritratto segnaposto.
- **Schede**: Equipaggiamento · Statistiche · Skill · Daevanion · Log recenti · Build salvate.
- Pulsante **Condividi profilo** (13.3). Versione pubblica in sola lettura con "Apri in PowerMeter".

### 10.3 Character Builder (la terza schermata più importante)
- **Colonna sinistra – "manichino"**: gli slot di equipaggiamento disposti attorno a una silhouette
  (armi principale/secondaria, testa, spalle, torso, mani, gambe, piedi, cintura, mantello/ali,
  collana, orecchini ×2, anelli ×2, e slot aggiuntivi da prevedere: titolo, pet, monolith, skin).
  Ogni slot mostra icona, livello di potenziamento (+15), bordo del colore di rarità.
- **Colonna centrale – dettaglio dello slot selezionato**: oggetto (nome inglese), statistiche base,
  **sottostatistiche** selezionabili, potenziamento, pietre/incantamenti, **bonus di set** attivi.
  Toggle **"Posseduto / Obiettivo"**: ogni slot può avere il pezzo che hai e quello a cui punti.
- **Colonna destra – statistiche live**: CP totale, statistiche offensive e difensive (inglese),
  con il **delta** (verde/rosso) quando provi un oggetto diverso.
- **Selettore oggetti** (pannello laterale): ricerca, filtri (slot, grado, livello, fonte), confronto
  con l'oggetto attuale al passaggio del mouse.
- **Barra superiore**: nome build, classe, tag (PvE, PvP, Arena, Tank, DPS, Healer), note, salva,
  duplica, **Condividi**, "Mostra nel widget".
- **Vista "Pezzi mancanti"**: elenco degli slot dove posseduto ≠ obiettivo, con fonte di ogni
  oggetto e link al crafting o al dungeon.

### 10.4 Skill Planner
Selettore di classe → albero/griglia delle skill della classe (nomi inglesi), punti assegnati,
livelli, requisiti, tooltip con descrizione, barra delle skill attive. Salva, condividi, collega a
una build.

### 10.5 Daevanion Planner
Board a nodi (grafo esplorabile con zoom e trascinamento): nodi attivabili, percorsi, costo, totale
statistiche ottenute. Riepilogo laterale e reset.

### 10.6 Gear Viewer
Vista a sola lettura di set di equipaggiamento: griglia dei set con i loro pezzi e bonus, filtri
per classe e livello, confronto tra due set.

### 10.7 Build della community (dashboard + web)
Feed di build pubbliche: card con classe, nome build, autore (Discord), tag, CP, like, visualizzazioni,
data. Filtri: regione (Global / Korea & Taiwan), classe, tag, ordinamento (popolari, recenti).
Pagina **build pubblica** in sola lettura: manichino, statistiche, skill, note dell'autore,
"Mi piace", **"Importa in PowerMeter"**, **"Copia link"**.

---

## 11. Database e mondo

### 11.1 Ricerca nel database
Barra grande + filtri per categoria (Oggetti, Skill, NPC e mostri, Quest, Dungeon, Ricette).
Risultati in tabella densa con icona, nome inglese, tipo, livello, grado. Oggetti popolari
come stato iniziale.

### 11.2 Scheda oggetto
Icona grande, nome (inglese, colore rarità), tipo/slot, livello, statistiche, sottostatistiche
possibili, set di appartenenza, **dove si ottiene** (drop da boss, crafting, negozio), in quali
ricette si usa, "Aggiungi alla build", "Aggiungi alla lista della spesa", condividi.

### 11.3 Scheda skill · 11.4 Scheda NPC/mostro · 11.5 Scheda quest
Stessa struttura: intestazione con icona e nome inglese, dati chiave, relazioni (la skill con le
build che la usano; il mostro con i drop e la posizione sulla mappa; la quest con ricompense e
catena).

### 11.6 Scheda dungeon / boss
Descrizione, boss in ordine, drop per boss, **collegamento diretto a classifiche e log** di quel
boss, tempo medio di kill, classi più usate.

### 11.7 Mappa interattiva
Mappa a tutto schermo (sfondo segnaposto) con:
- **pannello dei livelli** a sinistra con conteggi: Servizi, NPC, Mostri (con "Named"), Raccolta
  (Berries, Gems, Herbs, Ore…), Collezionabili/Monolith;
- **tracker dei progressi** per categoria (es. "Monolith trovati 34/560") con segna-come-trovato;
- **modalità Percorsi**: disegna e salva un percorso di raccolta;
- ricerca sulla mappa, zoom, selettore di zona, popup del marcatore con dettaglio e link alla scheda.

### 11.8 Crafting
- **Browser ricette**: tabella filtrabile per professione (5), categoria, maestria, resa.
- **Calcolatore**: albero dei materiali (espandibile fino alle materie prime), quantità per N
  pezzi, materiali già posseduti, costo stimato, "Aggiungi tutto alla lista della spesa".

### 11.9 Calcolatori
Tre pagine con lo stesso schema input → risultato: **Arcana**, **Pantheon**, **Genius Insight**.
Input a sinistra (slot/livelli/scelte), risultato a destra (statistiche ottenute, costi).

### 11.10 Armory
- **Ricerca personaggi**: cerca un giocatore per nome/server e vedi il profilo pubblico.
- **Tier list**: classi per fascia (S/A/B/C) per PvE e PvP, con motivazione breve.
- **Meta**: distribuzione delle classi, statistiche arena, build più usate per classe.
- **Pagine classe**: panoramica, ruolo, skill chiave, build consigliate, prestazioni nei log.

---

## 12. Organizer

### 12.1 Attività
Liste per **Giornaliere / Settimanali / Stagionali / Personalizzate**, per personaggio (o per tutti),
con priorità, checkbox, reset automatico all'orario di reset di Global/EU, filtro per personaggio,
vista "tutti i personaggi" a matrice (righe attività × colonne personaggi).

### 12.2 Checklist
Checklist pronte (es. routine giornaliera consigliata) da attivare o personalizzare.

### 12.3 Timer
Card con countdown: reset giornaliero, reset settimanale, Shugo, Rift, e timer personalizzati
(nome, durata o orario, ripetizione, notifica Windows e/o Discord).

### 12.4 Lista della spesa
Materiali e oggetti da procurare, con quantità, spuntabili, raggruppati per fonte;
alimentata dal crafting e dalle build.

### 12.5 Flow Map
Editor a nodi della progressione del personaggio (obiettivo → passi → oggetti richiesti), con
rami, nodi "oggetto" collegati al database e stato completato/da fare.

### 12.6 Modelli, esportazione e notifiche
- **Modelli**: salva un insieme di attività/timer come modello riutilizzabile.
- **Esporta / Importa**: CSV, Excel, HTML; anteprima prima dell'importazione.
- **Notifiche Discord**: URL webhook, eventi da notificare (timer, reset, nuovo record personale),
  "Invia notifica di prova".

---

## 13. Account, supporter e condivisione

### 13.1 Accesso
Modale "Accedi con Discord" (unico metodo), con spiegazione di cosa si sblocca: caricare log,
condividere build e profili, classifiche.

### 13.2 Pagina Supporter
Tono di **ringraziamento, non di vendita**: "PowerMeter è gratuito e resterà completo per tutti.
Chi lo sostiene su Patreon tiene in vita i server."
- Cosa ottieni: sincronizzazione cloud tra PC, storico log illimitato, link personalizzati
  (`/p/tuonome`), ruolo Discord, nome nei crediti, voto sulla roadmap.
- Stato: "Non collegato / Supporter dal …", pulsante "Collega Patreon".
- Badge Supporter (piccolo, elegante) da mostrare accanto al nome in classifiche e profili.

### 13.3 Condividi (componente comune)
Modale per log, build e profili:
- **link** (es. `powermeter.letrionlabs.it/e/9Uiga7pj` per un log, `/b/…` per una build, `/p/…` per un profilo) con pulsante "Copia" e conferma "Copiato!";
- **visibilità**: Pubblico / Non in elenco / Privato;
- **anteprima della card** come apparirà su Discord;
- pulsanti rapidi: Discord, Reddit, X.

### 13.4 Immagini di anteprima per i social (Open Graph, 1200×630)
Tre template per quando un link viene incollato su Discord:
- **Log**: boss, esito, durata, top 3 DPS con classi, logo.
- **Build**: nome build, classe, CP, i pezzi chiave.
- **Profilo**: nome, classe, server, CP.

---

## 14. Sito web pubblico

### 14.1 Landing page
- **Hero**: titolo di impatto, sottotitolo, pulsante **"Scarica per Windows"**, e una **demo animata
  del widget DPS** (combattimento simulato) come elemento visivo principale.
- Sezioni: Meter live · Log e classifiche · Build planner · Database e mappa · Organizer ·
  "Gratis per tutti" + Supporter · Requisiti · FAQ breve · footer con disclaimer, lingue, Discord,
  GitHub, "by Letrion Labs".
- Contatori live (combattimenti registrati, giocatori).
- Versione mobile (390).

### 14.2 Download
Requisiti (Windows 10/11 64 bit, Npcap con modalità WinPcap, esecuzione come amministratore),
pulsante di download con versione e dimensione, 3 passi di installazione illustrati, badge
"scansionato su VirusTotal", link alle note di rilascio.

### 14.3 Guida / FAQ
Fisarmonica di domande (meter non rileva il gioco, nome non compare, VPN, è sicuro?, cosa legge),
con ricerca.

### 14.4 Pagine di errore
404 · "Questo log è privato" · "Link scaduto o rimosso" · "Accedi per vedere questo contenuto".
Tono leggero, sempre con un'azione per tornare indietro.

### 14.5 Banner cookie
Semplice, conforme GDPR, in italiano, con "Accetta" / "Rifiuta" di pari peso.

---

## 15. Cosa consegnare (e come riportarlo)

1. **Design system**: palette (con i valori), tipografia, spaziature, raggi, colori classi e rarità,
   componenti base (pulsanti, input, tab, tabelle, badge, card, tooltip, modali, toast, grafici).
2. **Tutte le schermate** delle sezioni 5–14, con i loro stati (caricamento, vuoto, errore).
3. **Widget** in tutte le modalità, stati e dimensioni della sezione 8, sopra screenshot di gioco fittizi.
4. **Web mobile (390)** per: landing, report di combattimento, build pubblica, profilo pubblico,
   classifiche, errori.
5. **Esportazione**: il pacchetto di handoff di Claude Design (codice HTML/React + token) e, se
   possibile, anche gli screenshot PNG di ogni schermata, nominati con il numero della sezione
   (es. `08-2-widget-dps-combattimento.png`).

### Priorità se il tempo è poco
1. Design system + logo
2. **Widget (sezione 8)**
3. **Report di combattimento (9.3)**
4. Shell della dashboard + Home (5, 7)
5. **Character Builder (10.3)** e build pubblica (10.7)
6. Landing (14.1)
7. Tutto il resto
