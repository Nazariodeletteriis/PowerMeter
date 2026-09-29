# Changelog (it)

Translation of CHANGELOG.md: same `## <version>` sections and bullets.

## 0.3.4

- Nuovo: piani Supporter su Patreon (Recluta 3 €, Daeva 7 €, Empyrean 15 € al mese). Il meter e la maggior parte delle tab restano gratis; Database, Report combattimento, Log online e Classifiche richiedono Recluta, Party, Crafting e Calcolatori richiedono Daeva. Le tab bloccate restano nel menu con un lucchetto e un'anteprima sfocata.
- Nuovo: prova gratuita di tutto per 14 giorni, una per account Discord: accedi con Discord per iniziarla.
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
