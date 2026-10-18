# Changelog (it)

Translation of CHANGELOG.md: same `## <version>` sections and bullets.

## 0.5.25

- Corretto: Il ping del widget DPS (barre del segnale, valore e colore del pallino live) funziona di nuovo: il gioco aveva cambiato il modo in cui misura il ping e l'app non riceveva più nessun valore; ora lo misura dalla tua richiesta alla risposta del server.

## 0.5.24

- Cambiato: Il lucchetto del widget DPS e della minimappa ora blocca solo la posizione della finestra: tutti i pulsanti restano visibili e cliccabili, e i clic non passano più al gioco. Lo stesso vale per l'interruttore nelle impostazioni e per Ctrl+Alt+L.
- Nuovo: Widget DPS: il segnale in alto a sinistra mostra il tuo ping reale nel gioco, verde con le barre piene, arancione quando sale e rosso quando è alto, con il valore accanto.
- Cambiato: Il widget DPS e la minimappa hanno gli angoli squadrati, nello stile delle icone del gioco.
- Corretto: Impostazioni: l'interruttore del lucchetto del widget DPS ora segue il lucchetto quando lo cambi dal widget o con la scorciatoia.

## 0.5.23

- Cambiato: Il widget DPS resta visibile quando esci dal gioco (Alt+Tab) invece di finire nella barra delle applicazioni. Per nasconderlo fuori dal gioco, attiva "Nascondi automaticamente il meter" in Impostazioni > Widget DPS.

## 0.5.22

- Corretto: La minimappa si può di nuovo spostare: dalla 0.5.20 restava ferma dov'era.

## 0.5.21

- Corretto: Alt+Tab dal gioco non blocca più il mouse: con la minimappa aperta, l'app su cui passavi perdeva il focus a favore della minimappa ogni secondo e mezzo.

## 0.5.20

- Corretto: Minimappa: spostandola non si aggancia più ai bordi o agli angoli dello schermo e non si ingrandisce col doppio clic, così resta dove la metti, anche sopra la minimappa del gioco.
- Corretto: Minimappa: ridimensionandola la mappa mantiene zoom e centro invece di ripartire dalla mappa intera.
- Corretto: Usare la minimappa non nasconde più il widget DPS e non blocca più il mouse.
- Corretto: Pet della minimappa: l'elenco dei pet è compatto, con una piccola miniatura accanto a nome e livello; la pagina Mappa mantiene le schede grandi.

## 0.5.19

- Nuovo: Minimappa: il widget Mappa ora è una minimappa trasparente sopra il gioco, nello stile di quella del gioco, con cursori Opacità mappa e Opacità percorso, bottoni laterali (sposta, filtro, pet, schermo intero, zoom) e un lucchetto che lascia passare i clic al gioco.
- Nuovo: Filtri della minimappa: un menu "Raccolta" con ogni risorsa col suo nome nel gioco (Asvata, Calendula, Azpha, Odyle...) e la sua icona, e un menu "Livelli" con gli altri segnalini; entrambi hanno Seleziona tutto / Deseleziona tutto. Li ha anche la mappa grande.
- Nuovo: Pet sulla minimappa: scegli una famiglia e un pet e i suoi mostri compaiono come puntini sulla minimappa, con il nome al passaggio del mouse; i pet completati non compaiono mai.
- Nuovo: Temi: i temi colore del widget (PowerMeter, AION2, Asmodian, Elyos, Ember, Frost, Obsidian, Cogni, Fera, Natura, Varian) ora danno stile a tutta l'app, una sola scelta per il widget, la dashboard e ogni finestra.
- Nuovo: Le impostazioni del widget DPS ora sono nell'app, in Impostazioni > Widget DPS; il bottone a ingranaggio del widget le apre lì.
- Nuovo: Gli avvisi degli eventi possono mostrare anche un popup sul widget con l'evento e il suo conto alla rovescia, da 3 a 30 secondi (8 per impostazione predefinita); attivabile o disattivabile nelle impostazioni.
- Nuovo: Character Builder: ogni oggetto mostra le sue statistiche bonus e le manastone lette dal gioco, e le statistiche bonus contano nei totali (le poche la cui statistica non è ancora certa sono mostrate come #id ed escluse; le manastone mostrano solo il loro livello, perché il gioco non invia alcun valore).
- Nuovo: Character Builder: le statistiche degli Arcana contano nei totali, e le statistiche principali (Time, Life, Freedom, Justice, Illusion e gli attributi) aggiungono le loro statistiche derivate secondo la tabella di conversione del gioco.
- Nuovo: Character Builder, Pet: ogni pet mostra i suoi effetti ai livelli 1, 2 e 3, e Effetti posseduti mostra il totale della collezione per famiglia accanto alle opzioni di Insight; la collezione ora conta nelle statistiche.
- Nuovo: Gear Viewer: imposta il potenziamento di ogni oggetto confrontato e scegli le sue statistiche bonus (o digitali), così il confronto è quello vero.
- Corretto: Character Builder: i livelli degli oggetti corrispondono a quelli del gioco (base + potenziamento + manastone).
- Corretto: Character Builder: gli Arcana indossati nel gioco vengono riconosciuti e compilati automaticamente come il resto dell'equipaggiamento.

## 0.5.18

- Nuovo: Widget Mappa: la mappa interattiva si apre in una finestra tutta sua sopra il gioco (bottone nella pagina Mappa), con un bottone a schermo intero sia sul widget sia sulla pagina (Esc per uscire).
- Nuovo: Livelli della mappa per la raccolta (Od, gemme, metalli, erbe, molluschi, ortaggi, legno, bacche) accanto ai cubi nascosti e agli altri segnalini, ognuno attivabile o disattivabile e ricordato.
- Nuovo: Mappa, pannello Pet: scegli i pet (per esempio Kuru Overseer e Kuru Worker) e la mappa mostra esattamente dove sono i loro mostri, con il nome al passaggio del mouse. I pet completati (livello 3) non compaiono mai, così vedi solo quello che ti manca; "Mostra tutti i pet che mi mancano" li mette tutti sulla mappa.
- Nuovo: Character Builder, Pet: ogni pet mostra dove vive, con "Mostra sulla mappa" che apre il widget Mappa su di lui. Le icone delle famiglie sono quelle del gioco, con il nome della famiglia al passaggio del mouse.
- Nuovo: Character Builder, Pet: gli effetti posseduti vengono letti dal gioco al login e conteggiati nelle statistiche (24 opzioni del gioco; le poche il cui valore non è ancora certo sono escluse).
- Nuovo: Character Builder: un oggetto che i dati del gioco non hanno ancora (per esempio Spiritforged Guard) può essere identificato una volta dalla lista; viene ricordato e condiviso, quindi risulta noto a tutti.
- Corretto: Character Builder: gli Arcana che indossi vengono letti dal gioco e conteggiati nelle statistiche.
- Corretto: Character Builder: il potenziamento oltre +15 (da +16 a +20) è mostrato al suo livello reale e i suoi bonus extra sono elencati; dove i valori pubblicati si fermano a +15, si usa il bonus del +15 e il pannello lo indica.
- Corretto: Widget DPS: niente sesto giocatore in più in un'istanza da 5 (healer o buffer vicini, oppure lo stesso giocatore con un nuovo id dopo la morte).
- Corretto: Widget DPS: un giocatore che ha cambiato id (morte, riconnessione) mantiene il suo danno e il suo nome invece di ripartire da 0 o comparire come #id; un nome mancante viene preso dalla lista del gruppo.
- Corretto: Widget DPS: il meter si azzera in modo pulito tra due boss, anche quando riattacchi lo stesso boss o cambi zona.
- Corretto: Chiudere PowerMeter ora lo chiude davvero: il widget nascosto non resta più in esecuzione in background bloccando l'avvio successivo.

## 0.5.17

- Nuovo: Eventi, tab Field boss: "Respawn dalle tue kill". Quando un field boss muore con PowerMeter attivo, vedi quando torna (ora della kill + il suo tempo di respawn), con conto alla rovescia e "Dovrebbe essere vivo" quando il timer scade. Copre i 48 boss di Verteron e Altgard; i tempi di respawn sono stimati.

## 0.5.16

- Cambiato: Eventi: la tab "Tutti" mostra solo il prossimo Festival Shugo, così rift e boss non finiscono più sotto 24 righe al giorno; la tab Eventi li elenca ancora tutti.

## 0.5.15

- Corretto: Ridimensionare il widget ora ingrandisce o rimpicciolisce tutto il contenuto (testi, righe, icone), non solo la cornice. Trascinando l'altezza si fa ancora spazio a più righe.
- Corretto: "Opacità della finestra" e "Opacità delle barre" nella finestra Impostazioni ora cambiano subito il widget.
- Corretto: "Dimensione nome bersaglio" cambia anche il titolo mostrato quando non c'è un boss.

## 0.5.14

- Corretto: Trascinare lo slider "Dimensione nome bersaglio" non fa più oscillare il meter fino a riempire la RAM: la finestra Impostazioni e il meter si rimandavano a vicenda il valore vecchio e quello nuovo.
- Cambiato: Organizer: la pagina Timer ora si chiama Eventi; tolte le pagine Festival Shugo e Faglia Spaziotemporale (sono entrambe in Eventi).

## 0.5.13

- Nuovo: Pagina Timer ridisegnata: conto alla rovescia per prossimo Rift, evento, field boss e reset; tab Tutti / Rift / Eventi / Field boss / Reset; lista per giorno con inizio, fine e conto alla rovescia di ogni finestra.
- Nuovo: Scegli quando arrivano gli avvisi degli eventi: 1, 3, 5 o 10 minuti prima. L'avviso del widget segue la stessa impostazione.
- Cambiato: Il suono degli eventi ora parte solo dal widget, così non suona mai due volte.

## 0.5.12

- Corretto: La tua riga non mostra più un numero (#6653) al posto del tuo nome dopo il reset automatico tra due boss: PowerMeter segue il tuo nuovo id anche quando il gioco non rimanda il nome.
- Corretto: Avvisi eventi: ogni Shugo e ogni world boss ha il suo avviso 10 minuti prima, anche quando più eventi partono a un minuto di distanza (una riga ciascuno); chiudere un avviso non nasconde più i successivi, e se il caricamento fallisce riprova dopo un minuto invece che dopo un'ora.

## 0.5.11

- Cambiato: Widget: barra in alto, riga del boss e footer restano pieni; l'opacità ora rende trasparente solo la lista dei giocatori, così i pulsanti si leggono bene anche sopra un gioco chiaro.

## 0.5.10

- Corretto: Il widget restava su "Non connesso" / "nessun pacchetto" anche dopo che PowerMeter si era collegato al gioco: ora segue la connessione ogni pochi secondi.

## 0.5.9

- Nuovo: Quando PowerMeter non riesce a collegarsi al gioco, il widget dice perché (nessun pacchetto dalle schede di rete, nessun pacchetto del gioco, finestra del gioco non riconosciuta…) e "Copia diagnosi" copia un report da incollare su Discord.
- Corretto: Wi-Fi: le schede di rete non vengono più aperte in modalità promiscua, che su molti driver Wi-Fi non catturava niente.
- Corretto: Ora vengono lette anche le schede di rete che etichettano i pacchetti (Killer e altre schede da gaming).
- Corretto: L'avviso "non connesso" non compariva mai: il widget scambiava "nessuna porta" per una porta.
- Cambiato: Widget: il Reset è nel footer, in basso a sinistra.

## 0.5.8

- Nuovo: Widget ridisegnato: schede DPS / HEAL / AGGRO, nome del boss con barra HP, righe in classifica con barre DPS nel colore della classe. Il layout Compatta segue lo stesso stile.
- Cambiato: I layout del widget ora sono solo "Interfaccia" e "Compatta". I layout Classici sono stati tolti: se ne usavi uno, passi al nuovo layout corrispondente.
- Corretto: PowerMeter trova il gioco anche quando la sua finestra ha un titolo diverso (per esempio "AION 2"): lo riconosce dal programma.
- Corretto: Npcap installato senza la modalità "WinPcap API-compatible" ora funziona; se Npcap non parte, il widget lo dice.
- Corretto: Le schede di rete accese dopo l'avvio (VPN, ExitLag, Wi-Fi dopo lo standby) vengono catturate senza riavviare, e il meter non resta più bloccato su una connessione morta.
- Corretto: Mappa del mondo: marker e confini delle zone erano capovolti (cubi Asmodiani in mare). Ora sono a terra su ogni mappa.
- Cambiato: Supporter: i tre piani Patreon sbloccano tutto; cambiano solo periodo di pagamento e sconto.

## 0.5.7

- Nuovo: Character Builder: scheda Pet: la tua collezione di pet come nella finestra Pet del gioco (categorie, livello, progresso x/75, MAX), aperta con "Mostra pet". PowerMeter la legge dal gioco al login; puoi anche segnare i pet a mano. Il conteggio è uguale al gioco (pet Special esclusi).
- Corretto: Character Builder: un oggetto indossato assente dai dati degli oggetti (come la guardia del Cleric) resta nel suo slot invece di sparire.
- Corretto: Cambiando personaggio in gioco ora cambia tutta la scheda Personaggio, Character Builder compreso, non solo l'intestazione.

## 0.5.6

- Nuovo: Report combattimento: ora viene registrato il danno di ogni colpo, quindi un intervallo di tempo selezionato mostra il danno reale di ogni skill, non una stima (dai prossimi combattimenti).
- Nuovo: Trainer anche nel widget, Beta compatta compresa: l'icona bersaglio nella footer.
- Nuovo: Trainer: il pulsante Ricomincia rifà il conto alla rovescia e l'azzeramento.
- Corretto: Il tuo personaggio viene riconosciuto anche se avvii PowerMeter quando sei già in gioco: niente più numero al posto del nome.
- Corretto: Trainer: misura di nuovo (restava vuoto) e il widget non lo riporta più in PVE.
- Corretto: "Solo il mio DPS" nel widget ora nasconde gli altri giocatori.
- Corretto: Widget Beta compatta: la barra in alto resta leggibile col mouse sopra (mostrava solo "I").

## 0.5.4

- Nuovo: DPS Meter: modalità Trainer: conto alla rovescia 3-2-1, poi il tuo DPS solo sul manichino.
- Nuovo: Flag "Solo il mio DPS" nella footer del widget e nel DPS Meter: nasconde tutti gli altri.
- Nuovo: Storico combattimenti: i test sul manichino vengono salvati come combattimenti a sé, pochi secondi dopo che smetti.
- Nuovo: Widget Beta compatta: barre DPS animate, righe più pulite e tasto Reset nella footer.
- Corretto: Il Reset non trasforma più i compagni in numeri: nomi e classi restano.
- Corretto: Cambiando layout del widget nomi e classi compaiono subito, mai un numero.
- Corretto: Layout Classic e storico del widget: mancavano le icone delle classi.
- Corretto: Report combattimento: cliccando un nome si seleziona quel giocatore, e l'intervallo di tempo non sfarfalla più mentre trascini.

## 0.5.3

- Nuovo: Pannello admin dentro l'app: gli admin lo aprono dalle Impostazioni. Il pannello web non c'è più.
- Corretto: Gli oggetti senza icona (come Wrathful Mind) ora la mostrano, dalle icone ufficiali del gioco.
- Corretto: Dungeon: le card Conquest non sono più sempre rosse: si sbloccano con il Gear Score del personaggio.
- Modificato: Dungeon: un dungeon si apre solo quando il tuo Gear Score lo sblocca; quelli bloccati restano chiusi.

## 0.5.2

- Nuovo: Gli admin aprono il nuovo pannello admin web dalla pagina Supporter.
- Nuovo: Un account sospeso vede un messaggio chiaro all'accesso.
- Modificato: L'app invia la sua versione al server PowerMeter, per sapere quali versioni sono in uso.

## 0.5.1

- Modificato: Crafting più semplice: l'oggetto scelto con accanto i suoi materiali, sotto solo lo step successivo con i suoi materiali, poi la tabella dei materiali che servono e di quelli che hai.
- Modificato: Crafting: la lista degli oggetti è più larga e leggibile.
- Modificato: Crafting: le quantità che hai sono un unico inventario per personaggio, valido per tutti gli oggetti.

## 0.5.0

- Nuovo: Crafting rifatto: tab Alchemy, Blacksmithing, Cooking, Armorsmithing e Handicrafting, ognuna con le sue sottocategorie.
- Nuovo: Albero del crafting: scegli un oggetto e vedi tutta la catena, dalla base all'ultimo step, con ogni materiale; parti da un oggetto intermedio per vedere il resto della catena.
- Nuovo: Inventario del crafting: inserisci i materiali che hai già e segna gli step craftati; vengono scalati da ciò che manca, salvati per personaggio.
- Nuovo: Widget: tab DPS, HEAL e AGGRO: danno, cure fatte e danno subito da ogni giocatore.
- Nuovo: Widget: il pulsante Copia copia il combattimento come immagine: incollala su Discord con Ctrl+V.
- Nuovo: Builder: Gear Score e Combat Power reali, letti dal gioco.
- Nuovo: Dungeon: sbloccati dal Gear Score del tuo personaggio, con quanto manca per quelli bloccati.
- Nuovo: Builder: sezioni Pet, Wings, Pantheon, Achievements e Closet (in arrivo).
- Modificato: Lo storico dei combattimenti (widget e dashboard) mostra gli ultimi 10, con un pulsante per vederne altri 10.
- Modificato: Widget: rimosse le tab Build e Lobby.
- Corretto: Widget: cambiare tab non ridimensiona più il widget.

## 0.4.9

- Nuovo: Ruoli: tutti partono come Player con 30 giorni di prova completa (login Discord e account Discord di almeno 8 mesi); poi Party, rotazioni e Gear Viewer sono dei piani. I piani Patreon arrivano presto.
- Nuovo: Pagina Dungeon rifatta: card Exploration e Conquest con requisiti, ricompense e drop.
- Nuovo: Builder: la barra skill è mostrata come nel gioco, ogni set con le skill concatenate sopra ogni slot (stigma comprese).
- Nuovo: Widget: pulsante Copia per il DPS del combattimento, pronto da incollare su Discord.
- Nuovo: Widget: volume dell'avviso eventi nelle impostazioni.
- Nuovo: Dopo un cambio personaggio, un suggerimento consiglia un teletrasporto per aggiornarlo.
- Corretto: Cambiare personaggio cambia tutto il profilo, Builder e Daevanion compresi.
- Corretto: Ridimensionamento del widget: niente più bordi trasparenti che bloccano il gioco, dimensione ricordata, l'icona ridotta si può trascinare.
- Corretto: Npcap già installato viene riconosciuto: nessuna richiesta di reinstallarlo.
- Corretto: Quest: la lista non parte più dalle quest senza nome.
- Modificato: Log dei pacchetti e di debug solo per i ruoli Debugger e Admin.
- Modificato: Rimossi Calcolatori e Armory.
- Modificato: Termini e privacy aggiornati: ti verrà chiesto di accettarli di nuovo.

## 0.4.8

- Nuovo: Builder: ogni dio della scheda Daevanion mostra il suo tabellone in piccolo, con i nodi che hai preso; la lente lo ingrandisce.
- Corretto: La barra in alto segue il personaggio su cui passi in gioco (il titolo della finestra del gioco riportava quello precedente).
- Corretto: Builder: la barra skill viene letta quando entri nel mondo, non solo quando la cambi.
- Corretto: Database Skill e Daevanion: ogni skill mostra la sua icona.

## 0.4.7

- Nuovo: Report: Ispeziona mostra l'equip degli altri giocatori del combattimento (arma, armatura, collana, orecchini, con potenziamento).
- Nuovo: Builder: il Daevanion arriva dal gioco, punti per dio; clicca un dio per vedere le sue skill Daevanion.
- Nuovo: Builder: la scheda Skill mostra la tua barra skill in gioco, per personaggio.
- Nuovo: Builder: i livelli di potenziamento (+N) vengono letti dal gioco.
- Nuovo: L'avviso eventi del widget suona con il suono del Timer, se l'hai attivato.
- Corretto: Widget: «DPS medio per classe» mostra il combattimento sul meter invece di numeri fissi.
- Corretto: Rune e amuleto ora compaiono nell'equip preso dal gioco.
- Corretto: Report e Database Skill: icone per molte più skill (danni nel tempo, Theostone, skill rinominate); ci sono tutte le skill del gioco.
- Corretto: Widget: più spazio tra l'avviso eventi e la barra del boss.
- Corretto: Icone di Chanter e Templar nei colori della loro classe.
- Corretto: Il guard del Ranger resta nello slot della mano secondaria.

## 0.4.6

- Corretto: Builder: l'equip viene letto di nuovo quando entri nel mondo (un pacchetto grande del login veniva scartato e l'equip corrente restava vuoto).
- Corretto: L'equip va al personaggio che stai giocando: cambiando personaggio non finisce più sul precedente.
- Corretto: L'equip preso dal gioco ora mostra le icone degli oggetti.

## 0.4.5

- Nuovo: Builder: l'equip corrente arriva dal gioco (letto al login e a ogni cambio), con statistiche e livelli di potenziamento.
- Nuovo: Il widget avvisa 10 minuti prima di un evento (rift, boss del mondo, Festival Shugo, reset) con il conto alla rovescia.
- Corretto: Report: solo i giocatori veri, con i nomi come nei log; niente più righe grigie con i numeri.
- Corretto: Un personaggio già nella tua lista viene riconosciuto anche se il nome è scritto in modo leggermente diverso: non chiede più di crearlo.
- Corretto: Oggetti: lo scudo compare come mano secondaria per tutte le classi.

## 0.4.4

- Nuovo: Il meter cambia modalità da solo: BOSS al boss, PVP contro i giocatori, PVE per tutto il resto.
- Modificato: TRAIN non c'è più: i manichini contano come PVE, nel widget e nella dashboard.
- Nuovo: Pulsante RESET sempre visibile nel widget, accanto al selettore della modalità.
- Nuovo: I kill dei boss si caricano da soli (con l'accesso, disattivabile in Impostazioni); le pagine dei log mostrano solo i nomi dei personaggi.
- Nuovo: Classifiche (colpo più forte, kill più veloce, DPS del party) e i migliori giocatori di ogni classe in Statistiche classi.
- Nuovo: Tab Rotazione nel Report; il Report apre il tuo ultimo boss con il dungeon e Boss 1/2/3.
- Nuovo: Storico raggruppato per dungeon, con un vero filtro Dungeon.
- Nuovo: Lo Skill Planner riempie la barra skill dal gioco; passive a punti, livello 1–20.
- Nuovo: Builder con equip attuale e desiderato e la differenza di statistiche.
- Nuovo: Filtri Oggetti (categoria, slot, grado, livello, scambio, fazione, fonte, classe); il Gear Viewer seleziona, confronta e fissa.
- Corretto: Il widget non si blocca più cambiando modalità e la barra STAGGER si aggiorna anche senza nuovi danni.
- Corretto: Pacchetti persi recuperati e latenza più bassa: il meter segue il combattimento in tempo reale.
- Modificato: Marketplace rimosso.

## 0.4.3

- Nuovo: Quando c'è un aggiornamento, appena apri l'app compare una finestra con i pulsanti Aggiorna ora e Note di rilascio.

## 0.4.2

- Nuovo: Barra STAGGER sotto la barra HP del boss nel widget, con il valore vero: scende con i tuoi colpi e mostra quando il boss è rotto.
- Corretto: Il widget e le sue Impostazioni seguono la lingua scelta (nell'app installata restavano in inglese).
- Corretto: Reset giornaliero e settimanale alle 07:00 UTC, mostrati nella tua ora locale.
- Corretto: I tuoi HP non si mescolano più con quelli dei mostri.

## 0.4.1

- Cambiato: Nuovo design del widget DPS Meter: pulsanti più grandi e facili da cliccare, barra del boss e righe dei giocatori più chiare con le icone di classe.
- Nuovo: Vista del DPS medio per classe nel widget, dal pulsante accanto al lucchetto.

## 0.4.0

- Nuovo: Database: ricerca, oggetti, NPC e mostri con i loro drop e un bottone Mappa che mostra dove si trovano, missioni, dungeon, crafting e skill, con i dati del gioco.
- Nuovo: Gear Viewer con i dati del gioco.
- Nuovo: Timer: 9 eventi ricorrenti nel tuo orario locale, con conto alla rovescia e suono facoltativo.
- Nuovo: Daevanion Planner: le tavole Daevanion del gioco, scegli i nodi e vedi le statistiche e i livelli skill che danno.
- Nuovo: Character Builder: statistiche base, livelli di potenziamento e una stima di CP e DPS della build.
- Cambiato: PowerMeter è descritto ovunque come progetto amatoriale non ufficiale fatto per la community di Aion 2.
- Corretto: il gioco viene rilevato in modo affidabile quando è avviato da Purple.
- Corretto: DPS e danni non diventano più negativi con attacchi multi-colpo molto forti.
- Corretto: le cure di un healer che non ha ancora usato una skill nel combattimento non vanno più perse.
- Corretto: in I miei personaggi, cliccando un personaggio si apre direttamente la sua build nel Character Builder.
- Corretto: il Character Builder non mostra più like e risposte inesistenti: una build parte da 0.
- Corretto: la scheda di un mostro non è più vuota, e il bottone Mappa apre la sua mappa in un popup.
- Corretto: Gear Viewer mostra ogni pezzo una volta sola invece di due.
- Corretto: Dungeon elenca tutti i dungeon, ognuno una volta sola.

## 0.3.9

- Cambiato: Termini aggiornati: in Recluta e Daeva, Database, Gear Viewer, aiuto crafting e calcolatore sono inclusi quando saranno disponibili i dati ufficiali del gioco. Ti verrà chiesto di accettare di nuovo i Termini.

## 0.3.8

- Rimosso: Database, Gear Viewer, Armory, Daevanion planner, Crafting, Calcolatori e Marketplace mostrano "Dati ufficiali in arrivo" finché non saranno disponibili i dati ufficiali del gioco.
- Rimosso: il Character Builder mantiene skill, descrizione e commenti; equipaggiamento, statistiche, Gear Score e collezioni torneranno con i dati ufficiali, e l'equipaggiamento salvato nelle tue build è stato cancellato.
- Rimosso: Build community elenca solo le tue build; build della community, preferite e punti di spawn sulla mappa non ci sono più.
- Cambiato: Spacetime Rift e Shugo Festival mostrano solo i dettagli confermati da NCSOFT; il portale del Rift resta aperto 15 minuti.

## 0.3.7

- Cambiato: Recluta, Daeva e la prova gratuita funzionano su 1 PC per account, Empyrean su 2; passando a un piano con meno PC restano attivi quelli registrati per primi.

## 0.3.6

- Corretto: la pagina Supporter non rende più nera la finestra quando il pannello admin elenca gli utenti; se una pagina va in errore, ora mostra l'errore con Riprova invece di una finestra nera.

## 0.3.5

- Nuovo: i mostri che si trovano dentro un dungeon mostrano la mappa del mondo con l'ingresso del dungeon e un link al dungeon (Si trova dentro), e i mostri dello strato Illusion Curtain di Verteron ora compaiono sulla mappa di Verteron.

## 0.3.4

- Nuovo: piani Supporter su Patreon (Recluta 3 €, Daeva 7 €, Empyrean 15 € al mese). Il meter e la maggior parte delle tab restano gratis; Database, Report combattimento, Log online e Classifiche richiedono Recluta, Party, Crafting e Calcolatori richiedono Daeva. Le tab bloccate restano nel menu con un lucchetto e un'anteprima sfocata.
- Nuovo: prova gratuita di tutto per 14 giorni, una per account Discord: accedi con Discord per iniziarla.
- Nuovo: un piano funziona su massimo 2 PC per account (un PC libera il posto dopo 30 giorni che non lo usi) e la prova gratuita è una per persona, legata sia all'account Discord sia al PC.
- Nuovo: pagina Supporter: il tuo piano e da dove arriva, collega o scollega Patreon, i piani a confronto.
- Nuovo: Build community mostra le build della community da questlog.gg, con filtri per classe, tag, regione e ricerca; aprile nel Character Builder e duplicale per farle tue.
- Nuovo: le card di NPC, mostri e dungeon mostrano una minimappa di dove si trovano, e le card delle quest mostrano dove sono chi assegna la quest, gli obiettivi, l'NPC di consegna e il dungeon. Aggiunte le mappe di Poeta, Ishalgen, Eltnen e Morheim.
- Cambiato: "Le tue build" elenca solo le build che hai creato o duplicato; "Piaciute" ora si chiama "Preferite" e resta salvata dopo il riavvio.
- Cambiato: le mappe caricano solo la parte che stai guardando.

## 0.3.3

- Nuovo: NPC e mostri del database mostrano i punti di spawn sulla mappa (Mostra sulla mappa), per Verteron, Altgard e Reshanta.
- Cambiato: la build principale ora è per personaggio e non per classe: due personaggi della stessa classe hanno equipaggiamenti separati. Finché un personaggio non modifica la sua, parte dalla build condivisa di prima.
- Cambiato: le card in I miei personaggi mostrano il Gear Score della build principale del personaggio (posseduto / obiettivo, gli stessi numeri del Character Builder) al posto del CP sempre vuoto; anche la barra in alto non lo mostra più.
- Corretto: una build aperta dalla card di un personaggio usa l'Arcana e il Daevanion di quel personaggio, non di quello attivo.

## 0.3.2

- Corretto: in I miei personaggi tutta la card del personaggio apre la sua build (prima solo il nome, senza alcun segnale visivo).
- Corretto: il meter segue il personaggio con cui stai davvero giocando, letto dal gioco; rendere attivo un personaggio in I miei personaggi non cambia più chi traccia il meter.

## 0.3.1

- Nuovo: Prima di iniziare: i Termini e condizioni e l'Informativa sulla privacy completi (inglese, italiano, tedesco, francese, spagnolo, portoghese, russo) vanno accettati prima che PowerMeter legga qualsiasi dato di combattimento. Chi usa già l'app li accetta una volta al prossimo avvio.
- Cambiato: "Apri widget" ora si chiama "Avvia il DPSMeter".
- Cambiato: le modalità del meter compaiono come BOSS, TRAIN, PVE, PVP, in quest'ordine, nel meter, nello Storico combattimenti e nelle Impostazioni.
- Cambiato: un clic sul nome di un personaggio in I miei personaggi apre la sua build senza cambiare il personaggio attivo.
- Cambiato: la finestra degli aggiornamenti raggruppa le note di rilascio per tipo (nuovo, cambiato, corretto) ed è più leggibile.
- Corretto: il Gear Viewer mostrava quasi tutti i pezzi due volte (lo stesso oggetto esiste una volta per fazione); ora ogni pezzo compare una volta sola.
- Corretto: l'intestazione della build mostrava like e commenti fittizi invece dei like reali della build.

## 0.3.0

- Nuovo: Log online: i combattimenti che hai caricato, con link, visibilità modificabile (pubblico, non in elenco, privato), visualizzazioni, posizione in classifica ed eliminazione.
- Nuovo: Statistiche classi: DPS medio per classe su ogni boss, classi più giocate e andamento settimanale, dai log pubblici caricati dalla community. Lo stesso combattimento caricato da più membri del gruppo conta una volta sola.
- Nuovo: Gear Viewer: tutti i pezzi di equipaggiamento con filtri, ricerca e statistiche ordinabili. Seleziona gli oggetti per fissarli in cima (Pin) o confrontarli (Compare), con freccia verde sul valore migliore e rossa sul peggiore.
- Nuovo: Armory: cerca personaggi per regione, fazione, server e classe, vedi i profili più visti, le classifiche e la scheda completa di un personaggio (EU/NA appena disponibili).
- Nuovo: Festival Shugo: conto alla rovescia al prossimo round, i suoi minigiochi, i round successivi e un pianificatore del Festival Shop con i token che ti mancano.
- Nuovo: Faglia Spaziotemporale: conti alla rovescia del portale e della faglia, orario delle 24 ore e percorso per la tua fazione.
- Nuovo: Calcolatori: statistiche e Gear Score di un pezzo tra due livelli di potenziamento con la qualità del soul imprint, bonus delle statistiche primarie e probabilità Splendent di una ricetta.
- Nuovo: Marketplace (sostituisce la Lista della spesa): ricerca oggetti e lista degli oggetti seguiti; prezzi, andamenti e statistiche di mercato compariranno quando esisterà una fonte di dati di mercato per EU/NA.
- Nuovo: Crafting passo dopo passo: ogni passo mostra l'oggetto esatto che usa, gli esiti Normale e Splendent e quale serve al passo successivo; sull'ultimo tier scegli tra potenziare il pezzo normale e craftare finché esce Splendent.
- Cambiato: Flow Map è sostituita dal Festival Shugo; Log online e Statistiche classi spiegano a cosa servono.
- Corretto: ali, titoli e pet nel database mostrano i bonus che danno.

## 0.2.14

- Nuovo: tab PvE nel meter per il farming dei mob. Il danno si somma su tutti i mob che colpisci, anche dopo che muoiono, e si azzera dopo 5 minuti senza colpire mob, al cambio zona o con Reset.
- Nuovo: Boss, PvE, Train e PvP sono separati: ogni colpo conta solo nella tab del tipo di bersaglio. Il widget mostra sempre cosa sta registrando (tipo e nome del bersaglio), e i combattimenti salvati finiscono nella loro tab, con un filtro per modalità nello Storico.
- Nuovo: Cure ricevute per giocatore (proprie e da altri) e Aggro (colpi subiti dai mob; Templar e Gladiator segnati come TANK; una stima, indicata come tale, finché i mob non hanno colpito nessuno).
- Nuovo: Crafting: tutti gli oggetti craftabili con le armi in cima, la catena di upgrade dal primo all'ultimo tier, l'albero delle ricette e i materiali per la quantità che scegli, con Hai e Mancano, salvati.
- Cambiato: il danno è mostrato per intero ovunque (widget, finestra dettagli, meter e report della dashboard), niente più arrotondamenti K/M.
- Corretto: il meter non smette più di contare quando un mob si muove (veniva scambiato per un giocatore), e la tab Boss mostra solo i boss.
- Corretto: bloccare il widget non svuota più la lista dei giocatori; Build e Lobby restano visibili da bloccato.
- Corretto: il widget mostra le icone della build salvata, anche dopo averla creata o rinominata.
- Corretto: Carica nel widget carica il combattimento appena finito, chiede di accedere con Discord se serve e avvisa quando un combattimento di allenamento non si può caricare.

## 0.2.13

- Nuovo: i personaggi hanno una fazione (Elyos o Asmodian). Si sceglie quando aggiungi un personaggio, o sulla scheda di uno esistente; compare nella Home e nel Character Builder.
- Nuovo: il report mostra i tuoi combattimenti salvati: tentativi sullo stesso boss, panoramica, abilità, grafico DPS, timeline, danno ricevuto, cure e Confronta. Cliccando un combattimento nello Storico o nella Home si apre nel report.
- Nuovo: Esporta nel report salva l'intero combattimento, che si può ricaricare da Storico combattimenti → Carica → Da file.
- Nuovo: Analisi party mostra giocatori, abilità e rotazioni di apertura del tuo ultimo combattimento.
- Cambiato: tutti i dati di esempio sono stati rimossi prima del lancio. Le pagine che non hanno ancora niente da mostrare (classifiche, build della community, commenti, news, attività, cure e aggro nel meter, lobby del widget) mostrano uno stato vuoto.
- Cambiato: Condividi dà solo un link reale, dopo aver caricato il combattimento dallo Storico.
- Cambiato: le impostazioni non ancora disponibili sono disattivate e contrassegnate "Presto disponibile".
- Corretto: l'equipaggiamento della tua build principale salvato nelle versioni precedenti viene mantenuto.

## 0.2.12

- Nuovo: Carica in Storico combattimenti apre una finestra per caricare i combattimenti selezionati o un file salvato con Esporta, e da lì permette di accedere con Discord.
- Nuovo: rinomina una build che hai creato o clonato e salvala; pulsanti Modifica ed Elimina sulle tue build, con una finestra di conferma.
- Nuovo: le statistiche delle ali mostrano i bonus dell'ala equipaggiata oltre a quelli della collezione.
- Cambiato: ali, titoli e pet che non danno statistiche sono di nuovo elencati, dopo gli altri, contrassegnati "Nessuna stat".
- Cambiato: Le tue build elenca solo le build che hai creato o clonato.
- Corretto: Scarica Npcap avvia di nuovo l'installer (ora chiede i diritti di amministratore invece di fallire in silenzio).

## 0.2.11

- Nuovo: le statistiche del Character Builder sono reali e live: statistiche base della classe, equip (Magicstone e ogni altro slot), Daevanion, collezioni e titoli, calcolate come fa questlog. La vista Obiettivo mostra la variazione su ogni statistica.
- Nuovo: collezioni Pantheon, Arcana e Genus Insight, con le loro statistiche nel builder.
- Nuovo: abilità e missioni nel database mostrano la scheda in inglese e, sotto, la stessa scheda nella tua lingua (l'italiano è una traduzione non ufficiale).
- Nuovo: elimina le build che hai creato o clonato; le tue build e i tuoi nodi Daevanion restano dopo un riavvio.
- Nuovo: nuova icona per Windows.
- Cambiato: il Gear Score è calcolato come fa questlog (potenziamento, sfondamento, Magicstone, Theostone, Arcana, punti Daevanion).
- Cambiato: una build può essere clonata solo su un personaggio della stessa classe.
- Cambiato: un unico pulsante Indietro: alla build da Pezzi mancanti, al Character Builder ovunque altrove.
- Corretto: Carica in Storico combattimenti carica i combattimenti selezionati.
- Corretto: ali e titoli equipaggiati danno i loro bonus; ali e titoli senza statistiche non sono più elencati; il potere di volo non è più gonfiato.
- Corretto: lo skin dei guanti e le ali del Brawler sono nascosti finché il Brawler non esce in EU/NA.

## 0.2.10

- Nuovo: collezioni nel Character Builder (skin, pet, ali, monolith, titoli) con i totali reali delle statistiche; un personaggio nuovo parte da 0. Genus Insight, Pantheon e Arcana arrivano in un aggiornamento dedicato.
- Nuovo: statistiche reali degli oggetti nel Character Builder (base, potenziamento, sfondamento, righe di soul imprint), Magicstone, Theostone e Philosopher's Stone reali, e Gear Score calcolato dai tuoi pezzi.
- Nuovo: dalla scheda di un oggetto, Aggiungi alla build lo mette nell'equip posseduto e Aggiungi all'obiettivo nell'equip obiettivo.
- Nuovo: Confronta ed Esporta nel report di combattimento; Esporta in Storico combattimenti.
- Cambiato: lo slot della mano secondaria è la Guard per tutte le classi; lo slider Potenziale è stato tolto; il Combat Power non viene più mostrato con numeri inventati.
- Corretto: il widget della build mostra le icone degli oggetti.
- Corretto: Pezzi mancanti conta tutti gli slot (anche i bracciali); Posseduto mostra vuota una build vuota; Torna alla build riporta alla build su cui stavi lavorando.
- Corretto: nel report di combattimento le barre di cure, danno ricevuto e bersagli sono in scala sull'intero scontro, e il contatore dei tentativi si sposta tra i tentativi.
- Corretto: i ritratti di Build community mostrano il volto del personaggio.

## 0.2.9

- Nuovo: tutto il database del gioco è nell'app (oggetti, NPC, missioni, dungeon, abilità, ricette, titoli, obiettivi, pet, ali e altro) con dettagli reali, collegamenti tra le voci e ricerca con Ctrl+K.
- Nuovo: tab PvP nel DPS Meter: il danno fatto da te e dal tuo party ad altri giocatori.
- Nuovo: Character Builder rifatto: ogni slot propone solo oggetti del suo tipo, slider e menu delle statistiche funzionanti, equip posseduto e obiettivo reali, pezzi mancanti, Confronta, Widget e Condividi (Discord).
- Nuovo: Build community mostra 12 build per pagina; Le tue build e Piaciute funzionano.
- Cambiato: il file del programma ora si chiama PowerMeter.exe.
- Cambiato: il chip del personaggio in alto è un semplice bottone che apre I miei personaggi.
- Corretto: esportare i personaggi salva il file nella cartella Download.
- Corretto: ogni tab del Report combattimento (timeline skill e buff, danno ricevuto, cure, bersagli) segue l'intervallo selezionato.
- Corretto: equipaggiamento di default ed elenchi build seguono la classe del tuo personaggio.

## 0.2.8

- Nuovo: I miei personaggi funziona: aggiungi, importa, esporta, duplica ed elimina personaggi, e scegli quello attivo. Cambiando personaggio si aggiorna tutta la dashboard (builder, Skill Planner, Daevanion).
- Nuovo: il Daevanion Planner mostra le board reali della classe del tuo personaggio.
- Nuovo: icone reali degli oggetti in builder, schede oggetto, ricerca e home.
- Nuovo: mappa del mondo interattiva con marker reali (dati: aion2-interactive-map, CC BY-NC 4.0).
- Nuovo: scelta dei tag quando crei una nuova build.
- Cambiato: le tab del DPS Meter ora sono Boss, Train e PvP.
- Cambiato: vengono mostrati solo EU e NA; il Brawler è nascosto finché non esce in Occidente.
- Corretto: cambiando tab nel DPS Meter non si torna più a Boss.
- Corretto: selezionando un intervallo nel report di combattimento le statistiche sotto si aggiornano.
- Corretto: tab e filtri delle classifiche e numeri di pagina di Build community funzionano.

## 0.2.7

- Corretto: le note di rilascio nella finestra di aggiornamento ora compaiono nella lingua scelta per PowerMeter.
