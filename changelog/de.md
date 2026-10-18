# Changelog (de)

Translation of CHANGELOG.md: same `## <version>` sections and bullets.

## 0.5.23

- Geändert: Das DPS-Widget bleibt sichtbar, wenn du das Spiel verlässt (Alt+Tab), statt in die Taskleiste zu wandern. Um es außerhalb des Spiels auszublenden, aktiviere „Meter automatisch ausblenden“ unter Einstellungen > DPS-Widget.

## 0.5.22

- Behoben: Die Minikarte lässt sich wieder verschieben: Seit 0.5.20 blieb sie, wo sie war.

## 0.5.21

- Behoben: Alt+Tab aus dem Spiel lässt die Maus nicht mehr hängen: Bei offener Minikarte verlor die Anwendung, zu der du gewechselt hast, alle anderthalb Sekunden den Fokus an sie.

## 0.5.20

- Behoben: Minikarte: Beim Verschieben rastet sie nicht mehr an Bildschirmrändern oder -ecken ein und wird per Doppelklick nicht mehr maximiert, sie bleibt also, wo du sie hinlegst, auch über der Minikarte des Spiels.
- Behoben: Minikarte: Beim Ändern der Größe behält die Karte Zoom und Mitte, statt wieder die ganze Karte zu zeigen.
- Behoben: Die Minikarte zu benutzen blendet das DPS-Widget nicht mehr aus und lässt die Maus nicht mehr hängen.
- Behoben: Minikarten-Pets: Die Pet-Liste ist kompakt, mit einem kleinen Vorschaubild neben Name und Stufe; die Kartenseite behält die großen Karten.

## 0.5.19

- Neu: Minikarte: Das Karten-Widget ist jetzt eine durchsichtige Minikarte über dem Spiel, im Stil der Minikarte des Spiels, mit Schiebereglern für Kartendeckkraft und Pfaddeckkraft, Seitenschaltflächen (verschieben, Filter, Pets, Vollbild, Zoom) und einer Sperre, die Klicks zum Spiel durchlässt.
- Neu: Minikarten-Filter: Ein Menü „Sammeln“ mit jeder Ressource unter ihrem Spielnamen (Asvata, Calendula, Azpha, Odyle...) und eigenem Symbol und ein Menü „Ebenen“ mit den anderen Markern; beide haben Alle auswählen / Alle abwählen. Die große Karte hat sie auch.
- Neu: Minikarten-Pets: Wähle eine Familie und ein Pet, und seine Monster erscheinen als Punkte auf der Minikarte, mit dem Namen beim Überfahren; abgeschlossene Pets erscheinen nie.
- Neu: Themes: Die Farbthemen des Widgets (PowerMeter, AION2, Asmodian, Elyos, Ember, Frost, Obsidian, Cogni, Fera, Natura, Varian) gestalten jetzt die ganze App, eine Wahl für das Widget, das Dashboard und alle Fenster.
- Neu: Die Einstellungen des DPS-Widgets sind jetzt in der App, unter Einstellungen > DPS-Widget; die Zahnrad-Schaltfläche des Widgets öffnet sie dort.
- Neu: Ereignis-Benachrichtigungen können auch ein Popup am Widget mit dem Ereignis und seinem Countdown zeigen, für 3 bis 30 Sekunden (standardmäßig 8); in den Einstellungen ein- oder ausschaltbar.
- Neu: Character Builder: Jeder Gegenstand zeigt seine Zusatzwerte und Manasteine, aus dem Spiel gelesen, und die Zusatzwerte zählen in den Summen (die wenigen, deren Wert noch nicht sicher ist, werden als #id angezeigt und nicht mitgezählt; Manasteine zeigen nur ihre Stufe, da das Spiel keinen Wert sendet).
- Neu: Character Builder: Arcana-Werte zählen in den Summen, und Hauptwerte (Time, Life, Freedom, Justice, Illusion und die Attribute) fügen ihre abgeleiteten Werte laut Umrechnungstabelle des Spiels hinzu.
- Neu: Character Builder, Pets: Jedes Pet zeigt seine Effekte auf Stufe 1, 2 und 3, und Besessene Effekte zeigt die Sammlungssumme nach Familie neben den Insight-Optionen; die Sammlung zählt jetzt in den Werten.
- Neu: Gear Viewer: Stelle die Verstärkung jedes verglichenen Gegenstands ein und wähle seine Zusatzwerte (oder tippe sie ein), damit der Vergleich der echte ist.
- Behoben: Character Builder: Gegenstandsstufen entsprechen dem Spiel (Basis + Verstärkung + Manasteine).
- Behoben: Character Builder: Im Spiel getragene Arcana werden erkannt und wie die übrige Ausrüstung automatisch eingetragen.

## 0.5.18

- Neu: Karten-Widget: Die interaktive Karte öffnet sich in einem eigenen Fenster über dem Spiel (Schaltfläche auf der Karten-Seite), mit einer Vollbild-Schaltfläche am Widget und auf der Seite (Esc beendet).
- Neu: Kartenebenen fürs Sammeln (Od, Edelsteine, Metalle, Kräuter, Schalentiere, Gemüse, Holz, Beeren) neben den versteckten Würfeln und den anderen Markern, jede einzeln ein- oder ausschaltbar und gemerkt.
- Neu: Karte, Pet-Panel: Wähle Pets (zum Beispiel Kuru Overseer und Kuru Worker), und die Karte zeigt genau, wo ihre Monster sind, mit dem Namen beim Überfahren. Abgeschlossene Pets (Stufe 3) erscheinen nie, du siehst also nur, was dir noch fehlt; "Alle fehlenden Pets anzeigen" legt sie alle auf die Karte.
- Neu: Character Builder, Pets: Jedes Pet zeigt, wo es lebt, und "Auf der Karte zeigen" öffnet das Karten-Widget bei ihm. Die Familiensymbole stammen aus dem Spiel, mit dem Familiennamen beim Überfahren.
- Neu: Character Builder, Pets: Besessene Effekte werden beim Login aus dem Spiel gelesen und in den Werten mitgezählt (24 der Spieloptionen; die wenigen, deren Wert noch nicht sicher ist, fehlen).
- Neu: Character Builder: Ein Gegenstand, den die Spieldaten noch nicht kennen (zum Beispiel Spiritforged Guard), kann einmal aus der Liste identifiziert werden; er wird gemerkt und geteilt, ist also für alle bekannt.
- Behoben: Character Builder: Getragene Arcana werden aus dem Spiel gelesen und in den Werten mitgezählt.
- Behoben: Character Builder: Verstärkung über +15 (+16 bis +20) wird mit ihrer echten Stufe angezeigt und ihre Zusatzboni aufgelistet; wo die veröffentlichten Werte bei +15 enden, wird der +15-Bonus verwendet und das Panel weist darauf hin.
- Behoben: DPS-Widget: Kein zusätzlicher 6. Spieler in einer 5-Spieler-Instanz (Heiler oder Buffer in der Nähe oder derselbe Spieler mit neuer ID nach dem Tod).
- Behoben: DPS-Widget: Ein Spieler, der die ID gewechselt hat (Tod, Reconnect), behält Schaden und Namen, statt bei 0 neu zu starten oder als #id zu erscheinen; ein fehlender Name wird aus der Gruppenliste übernommen.
- Behoben: DPS-Widget: Das Meter setzt sich zwischen zwei Bossen sauber zurück, auch wenn du denselben Boss erneut ziehst oder die Zone wechselst.
- Behoben: PowerMeter zu schließen beendet es jetzt endgültig: Das versteckte Widget läuft nicht mehr im Hintergrund weiter und blockiert den nächsten Start.

## 0.5.17

- Neu: Events, Tab Feldbosse: "Respawns aus deinen Kills". Stirbt ein Feldboss bei laufendem PowerMeter, siehst du, wann er zurückkommt (Kill-Zeit + seine Respawnzeit), mit Countdown und "Sollte da sein", sobald der Timer abläuft. Umfasst die 48 Bosse in Verteron und Altgard; die Respawnzeiten sind geschätzt.

## 0.5.16

- Geändert: Events: Der Tab "Alle" zeigt nur das nächste Shugo-Festival, damit Risse und Bosse nicht mehr unter 24 Zeilen am Tag verschwinden; der Tab Events listet weiterhin alle.

## 0.5.15

- Behoben: Die Größe des Widgets zu ändern skaliert jetzt den ganzen Inhalt (Text, Zeilen, Symbole), nicht nur den Rahmen. Wer die Höhe zieht, bekommt weiterhin Platz für mehr Zeilen.
- Behoben: "Fenster-Deckkraft" und "Deckkraft der Balken" im Einstellungsfenster ändern das Widget jetzt sofort.
- Behoben: "Größe des Zielnamens" ändert auch den Titel, der ohne Boss angezeigt wird.

## 0.5.14

- Behoben: Das Ziehen des Schiebereglers "Größe des Zielnamens" lässt das Meter nicht mehr flackern und den Arbeitsspeicher füllen: Einstellungsfenster und Meter schickten sich gegenseitig den alten und den neuen Wert.
- Geändert: Organizer: Die Seite Timer heißt jetzt Events; die Seiten Shugo-Festival und Raum-Zeit-Riss entfallen (beide sind in Events).

## 0.5.13

- Neu: Timer-Seite neu gestaltet: Countdowns für den nächsten Riss, das nächste Event, den nächsten Feldboss und Reset; Tabs Alle / Riss / Events / Feldbosse / Resets; eine Zeitleiste nach Tagen mit Beginn, Ende und Countdown jedes Zeitfensters.
- Neu: Wähle, wann Event-Hinweise kommen: 1, 3, 5 oder 10 Minuten vorher. Der Hinweis im Widget folgt derselben Einstellung.
- Geändert: Der Event-Ton kommt jetzt nur noch vom Widget und klingelt nie doppelt.

## 0.5.12

- Behoben: Deine eigene Zeile zeigt nach dem automatischen Reset zwischen zwei Bossen keine Nummer (#6653) mehr statt deines Namens: PowerMeter folgt deiner neuen ID, auch wenn das Spiel deinen Namen nicht erneut sendet.
- Behoben: Event-Hinweise: Jeder Shugo und jeder Weltboss bekommt seinen eigenen Hinweis 10 Minuten vorher, auch wenn mehrere im Minutenabstand starten (je eine Zeile); das Schließen eines Hinweises blendet die nächsten nicht mehr aus, und ein fehlgeschlagenes Laden wird nach einer Minute statt nach einer Stunde wiederholt.

## 0.5.11

- Geändert: Widget: Obere Leiste, Boss-Zeile und Fußzeile bleiben deckend; die Deckkraft-Einstellung macht jetzt nur die Spielerliste durchsichtig, damit die Buttons auch über hellem Spielbild lesbar bleiben.

## 0.5.10

- Behoben: Das Widget blieb auf "Nicht verbunden" / "keine Pakete", auch nachdem PowerMeter sich mit dem Spiel verbunden hatte: Es verfolgt die Verbindung jetzt alle paar Sekunden.

## 0.5.9

- Neu: Wenn PowerMeter keine Verbindung zum Spiel bekommt, sagt das Widget warum (keine Pakete von den Netzwerkadaptern, keine Spielpakete, Spielfenster nicht erkannt…), und "Diagnose kopieren" kopiert einen Bericht zum Einfügen in Discord.
- Behoben: WLAN: Netzwerkadapter werden nicht mehr im Promiscuous-Modus geöffnet, der bei vielen WLAN-Treibern gar nichts erfasste.
- Behoben: Netzwerkadapter, die ihre Pakete markieren (Killer und andere Gaming-Adapter), werden jetzt gelesen.
- Behoben: Die Warnung "nicht verbunden" erschien nie: Das Widget hielt "noch kein Port" für einen Port.
- Geändert: Widget: Reset sitzt in der Fußzeile unten links.

## 0.5.8

- Neu: Neu gestaltetes Widget: Tabs DPS / HEAL / AGGRO, Bossname mit HP-Leiste, Ranglisten-Zeilen mit DPS-Leisten in Klassenfarbe. Das Layout Kompakt folgt demselben Stil.
- Geändert: Die Widget-Layouts heißen jetzt nur noch "Oberfläche" und "Kompakt". Die klassischen Layouts wurden entfernt: Wer eines nutzte, wechselt zum passenden neuen Layout.
- Behoben: PowerMeter findet das Spiel auch, wenn sein Fenster anders heißt (zum Beispiel "AION 2"): Es erkennt es am Programm.
- Behoben: Npcap ohne "WinPcap API-compatible mode" funktioniert jetzt; startet Npcap nicht, zeigt das Widget es an.
- Behoben: Netzwerkadapter, die nach dem Start eingeschaltet werden (VPN, ExitLag, WLAN nach dem Standby), werden ohne Neustart erfasst, und das Meter bleibt nicht mehr an einer toten Verbindung hängen.
- Behoben: Weltkarte: Markierungen und Zonengrenzen standen auf dem Kopf (Asmodier-Würfel im Meer). Jetzt liegen sie auf jeder Karte an Land.
- Geändert: Supporter: Die drei Patreon-Pläne schalten alles frei; sie unterscheiden sich nur in Abrechnungszeitraum und Rabatt.

## 0.5.7

- Neu: Charakter-Builder: Tab Haustier: deine Haustier-Sammlung wie im Haustier-Fenster des Spiels (Kategorien, Stufe, Fortschritt x/75, MAX), geöffnet mit "Pets anzeigen". PowerMeter liest sie beim Login aus dem Spiel; du kannst Pets auch von Hand markieren. Die Zählung entspricht dem Spiel (ohne Special-Pets).
- Behoben: Charakter-Builder: Ein getragener Gegenstand, der in den Gegenstandsdaten fehlt (wie der Schild des Klerikers), bleibt in seinem Slot, statt zu verschwinden.
- Behoben: Ein Charakterwechsel im Spiel wechselt jetzt den ganzen Charakter-Tab, Charakter-Builder inklusive, nicht nur die Kopfzeile.

## 0.5.6

- Neu: Kampfbericht: Der Schaden jedes Treffers wird jetzt gespeichert, ein gewählter Zeitraum zeigt also den echten Schaden jeder Fertigkeit statt einer Schätzung (ab den nächsten Kämpfen).
- Neu: Trainer auch im Widget, Compact Beta eingeschlossen: das Zielsymbol in der Fußleiste.
- Neu: Trainer: Die Schaltfläche Neu starten führt Countdown und Zurücksetzen erneut aus.
- Behoben: Dein Charakter wird erkannt, auch wenn PowerMeter startet, während du schon im Spiel bist: keine Nummer mehr statt deines Namens.
- Behoben: Trainer: misst wieder (blieb leer), und das Widget stellt ihn nicht mehr auf PVE zurück.
- Behoben: „Nur mein DPS“ im Widget blendet die anderen Spieler jetzt aus.
- Behoben: Compact-Beta-Widget: Die obere Leiste bleibt beim Darüberfahren lesbar (sie zeigte nur „I“).

## 0.5.4

- Neu: DPS Meter: Trainer-Modus: Countdown 3-2-1, danach nur dein DPS an der Trainingspuppe.
- Neu: Schalter „Nur mein DPS“ in der Fußleiste des Widgets und im DPS Meter: blendet alle anderen aus.
- Neu: Kampfverlauf: Tests an der Trainingspuppe werden als eigene Kämpfe gespeichert, wenige Sekunden nach dem Aufhören.
- Neu: Widget Beta kompakt: animierte DPS-Balken, aufgeräumtere Zeilen und ein Reset-Knopf in der Fußleiste.
- Behoben: Reset macht Gruppenmitglieder nicht mehr zu Nummern: Namen und Klassen bleiben.
- Behoben: Beim Wechsel des Widget-Layouts erscheinen Namen und Klassen sofort, nie eine Nummer.
- Behoben: Classic-Layout und Widget-Verlauf: Klassensymbole fehlten.
- Behoben: Kampfbericht: Ein Klick auf einen Namen wählt diesen Spieler, und der Zeitbereich flackert beim Ziehen nicht mehr.

## 0.5.3

- Neu: Adminpanel direkt in der App: Admins öffnen es in den Einstellungen. Das Web-Panel gibt es nicht mehr.
- Behoben: Gegenstände ohne Symbol (z. B. Wrathful Mind) zeigen es jetzt an, aus den offiziellen Spielsymbolen.
- Behoben: Dungeons: Eroberungskarten sind nicht mehr immer rot: Sie werden mit dem Gear Score deines Charakters freigeschaltet.
- Geändert: Dungeons: Ein Dungeon lässt sich erst öffnen, wenn dein Gear Score ihn freischaltet; gesperrte bleiben zu.

## 0.5.2

- Neu: Admins öffnen das neue Web-Adminpanel über die Supporter-Seite.
- Neu: Ein gesperrtes Konto sieht bei der Anmeldung eine klare Meldung.
- Geändert: Die App sendet ihre Version an den PowerMeter-Server, um zu sehen, welche Versionen genutzt werden.

## 0.5.1

- Geändert: Crafting ist einfacher: der gewählte Gegenstand mit seinen Materialien daneben, darunter nur der nächste Schritt mit seinen Materialien, dann die Tabelle der benötigten und vorhandenen Materialien.
- Geändert: Crafting: die Gegenstandsliste ist breiter und besser lesbar.
- Geändert: Crafting: deine vorhandenen Mengen sind ein Inventar pro Charakter, für alle Gegenstände.

## 0.5.0

- Neu: Handwerk neu gestaltet: Tabs Alchemy, Blacksmithing, Cooking, Armorsmithing und Handicrafting, jeweils mit eigenen Unterkategorien.
- Neu: Handwerksbaum: Wähle einen Gegenstand und sieh seine ganze Kette von der Basis bis zum letzten Schritt, mit allen Materialien; beginne bei einem Zwischengegenstand, um den Rest der Kette zu sehen.
- Neu: Handwerksinventar: Gib die Materialien ein, die du schon hast, und markiere die hergestellten Schritte; sie werden von dem abgezogen, was noch fehlt, und pro Charakter gespeichert.
- Neu: Widget: Tabs DPS, HEAL und AGGRO: Schaden, Heilung und erlittener Schaden jedes Spielers.
- Neu: Widget: Der Kopieren-Button kopiert den Kampf als Bild: Füge es mit Ctrl+V in Discord ein.
- Neu: Builder: dein echter Gear Score und Combat Power, aus dem Spiel gelesen.
- Neu: Dungeons: freigeschaltet durch den Gear Score deines Charakters, mit Anzeige, wie viel für die gesperrten fehlt.
- Neu: Builder: Bereiche Pet, Wings, Pantheon, Achievements und Closet (bald verfügbar).
- Geändert: Der Kampfverlauf (Widget und Dashboard) zeigt die letzten 10 Kämpfe, mit einem Button für 10 weitere.
- Geändert: Widget: Die Tabs Build und Lobby wurden entfernt.
- Behoben: Widget: Der Tabwechsel ändert die Größe des Widgets nicht mehr.

## 0.4.9

- Neu: Rollen: Alle starten als Player mit einer vollen 30-Tage-Testphase (Discord-Login und ein mindestens 8 Monate altes Discord-Konto); danach sind Party, Rotationen und Gear Viewer den Plänen vorbehalten. Die Patreon-Pläne kommen bald.
- Neu: Dungeon-Seite neu gestaltet: Karten für Exploration und Conquest mit Voraussetzungen, Belohnungen und Drops.
- Neu: Builder: Die Skillleiste wird wie im Spiel gezeigt, jedes Set mit den verketteten Skills über jedem Slot (inklusive Stigmata).
- Neu: Widget: Kopieren-Button für den DPS des Kampfes, bereit zum Einfügen in Discord.
- Neu: Widget: Lautstärke des Event-Hinweises in den Einstellungen.
- Neu: Nach einem Charakterwechsel empfiehlt ein Hinweis einen Teleport, um den Charakter zu aktualisieren.
- Behoben: Ein Charakterwechsel wechselt das ganze Profil, Builder und Daevanion eingeschlossen.
- Behoben: Widget-Größe: keine transparenten Ränder mehr, die das Spiel blockieren, Größe wird gespeichert, das minimierte Icon lässt sich ziehen.
- Behoben: Ein bereits installiertes Npcap wird erkannt: keine erneute Installation.
- Behoben: Quests: Die Liste beginnt nicht mehr mit namenlosen Quests.
- Geändert: Paket- und Debug-Logs nur für die Rollen Debugger und Admin.
- Geändert: Rechner und Armory entfernt.
- Geändert: Bedingungen und Datenschutz aktualisiert: Du wirst gebeten, sie erneut zu akzeptieren.

## 0.4.8

- Neu: Builder: Jeder Gott im Daevanion-Tab zeigt sein Brett im Kleinen, mit deinen gewählten Knoten; die Lupe vergrößert es.
- Behoben: Die obere Leiste folgt dem Charakter, zu dem du im Spiel wechselst (der Fenstertitel des Spiels holte den vorherigen zurück).
- Behoben: Builder: Deine Skillleiste wird beim Betreten der Welt gelesen, nicht nur bei Änderungen.
- Behoben: Skill-Datenbank und Daevanion: Jeder Skill zeigt sein Icon.

## 0.4.7

- Neu: Bericht: Inspizieren zeigt die Ausrüstung der anderen Spieler im Kampf (Waffe, Rüstung, Halskette, Ohrringe, mit Verstärkung).
- Neu: Builder: dein Daevanion kommt aus dem Spiel, Punkte pro Gott; klicke auf einen Gott, um seine Daevanion-Skills zu sehen.
- Neu: Builder: der Skills-Tab zeigt deine Skillleiste im Spiel, pro Charakter.
- Neu: Builder: Verstärkungsstufen (+N) werden aus dem Spiel gelesen.
- Neu: Der Event-Hinweis im Widget spielt den Timer-Ton, wenn du ihn eingeschaltet hast.
- Behoben: Widget: „Durchschnittlicher DPS pro Klasse“ zeigt den Kampf im Meter statt fester Zahlen.
- Behoben: Runen und Amulett erscheinen jetzt in der Ausrüstung aus dem Spiel.
- Behoben: Bericht und Skill-Datenbank: Icons für viele weitere Skills (Schaden über Zeit, Theosteine, umbenannte Skills); alle Skills des Spiels sind aufgeführt.
- Behoben: Widget: mehr Abstand zwischen Event-Hinweis und Bossleiste.
- Behoben: Icons von Kantor und Templer in den Farben ihrer Klasse.
- Behoben: Der Schutz eines Waldläufers bleibt im Nebenhand-Slot.

## 0.4.6

- Behoben: Builder: Die Ausrüstung wird beim Betreten der Welt wieder gelesen (ein großes Login-Paket wurde verworfen, die aktuelle Ausrüstung blieb leer).
- Behoben: Die Ausrüstung gehört dem gespielten Charakter: Beim Charakterwechsel landet sie nicht mehr beim vorherigen.
- Behoben: Aus dem Spiel gelesene Ausrüstung zeigt jetzt die Gegenstandssymbole.

## 0.4.5

- Neu: Builder: Deine aktuelle Ausrüstung kommt aus dem Spiel (beim Login und bei jedem Wechsel gelesen), mit Werten und Verstärkungsstufen.
- Neu: Das Widget warnt 10 Minuten vor einem Event (Riss, Weltbosse, Shugo-Festival, Resets) mit Countdown.
- Behoben: Bericht: nur echte Spieler, benannt wie in den Logs; keine grauen Zeilen mit Nummern mehr.
- Behoben: Ein Charakter in deiner Liste wird auch erkannt, wenn sein Name leicht anders geschrieben wurde: keine Aufforderung mehr, ihn neu anzulegen.
- Behoben: Gegenstände: Der Schild erscheint für jede Klasse als Nebenhand.

## 0.4.4

- Neu: Der Meter wechselt den Modus selbst: BOSS beim Boss, PVP gegen Spieler, PVE für alles andere.
- Geändert: TRAIN entfällt: Trainingspuppen zählen als PVE, im Widget und im Dashboard.
- Neu: RESET-Taste immer sichtbar im Widget, neben der Modusauswahl.
- Neu: Boss-Kills werden automatisch hochgeladen (angemeldet, in den Einstellungen abschaltbar); Log-Seiten zeigen nur Charakternamen.
- Neu: Ranglisten (stärkster Treffer, schnellster Kill, Gruppen-DPS) und die besten Spieler jeder Klasse in den Klassenstatistiken.
- Neu: Tab Rotation im Bericht; der Bericht öffnet deinen letzten Boss mit Dungeon und Boss 1/2/3.
- Neu: Verlauf nach Dungeon gruppiert, mit echtem Dungeon-Filter.
- Neu: Der Skill-Planer übernimmt die Skillleiste aus dem Spiel; Passive als Punkte, Stufe 1–20.
- Neu: Builder mit aktueller und gewünschter Ausrüstung und dem Wertunterschied.
- Neu: Gegenstandsfilter (Kategorie, Slot, Grad, Stufe, Handel, Fraktion, Quelle, Klasse); der Gear Viewer kann auswählen, vergleichen und anheften.
- Behoben: Das Widget friert beim Moduswechsel nicht mehr ein, und die STAGGER-Leiste aktualisiert sich auch ohne neuen Schaden.
- Behoben: Verlorene Pakete werden erfasst und die Latenz ist geringer: der Meter folgt dem Kampf in Echtzeit.
- Geändert: Marktplatz entfernt.

## 0.4.3

- Neu: Wenn ein Update verfügbar ist, erscheint beim Öffnen der App ein Fenster mit den Schaltflächen Jetzt aktualisieren und Versionshinweise.

## 0.4.2

- Neu: STAGGER-Leiste unter der HP-Leiste des Bosses im Widget, mit dem echten Wert: sie sinkt mit deinen Treffern und zeigt, wann der Boss gebrochen ist.
- Behoben: Das Widget und seine Einstellungen folgen jetzt der gewählten Sprache (in der installierten App blieben sie auf Englisch).
- Behoben: Täglicher und wöchentlicher Reset um 07:00 UTC, in deiner Ortszeit angezeigt.
- Behoben: Deine eigenen HP mischen sich nicht mehr mit denen der Monster.

## 0.4.1

- Geändert: Neues Design des DPS-Meter-Widgets: größere, leichter klickbare Schaltflächen, klarere Boss-Leiste und Spielerzeilen mit Klassensymbolen.
- Neu: Ansicht des durchschnittlichen DPS pro Klasse im Widget, über die Schaltfläche neben dem Schloss.

## 0.4.0

- Neu: Datenbank: Suche, Gegenstände, NPCs und Monster mit ihren Drops und einer Karte-Schaltfläche, die zeigt, wo sie sind, Quests, Dungeons, Crafting und Skills, mit den Spieldaten.
- Neu: Gear Viewer mit den Spieldaten.
- Neu: Timer: 9 wiederkehrende Events in deiner Ortszeit, mit Countdown und optionalem Ton.
- Neu: Daevanion Planner: die Daevanion-Tafeln des Spiels, wähle die Knoten und sieh die Werte und Skillstufen, die sie geben.
- Neu: Character Builder: Grundwerte, Verstärkungsstufen und eine Schätzung von CP und DPS des Builds.
- Geändert: PowerMeter wird überall als inoffizielles Amateurprojekt für die Aion-2-Community beschrieben.
- Behoben: das Spiel wird zuverlässig erkannt, wenn es über Purple gestartet wird.
- Behoben: DPS und Schaden werden bei sehr starken Mehrfachtreffern nicht mehr negativ.
- Behoben: Heilungen eines Heilers, der im Kampf noch keinen Skill benutzt hat, gehen nicht mehr verloren.
- Behoben: in Meine Charaktere öffnet ein Klick auf einen Charakter direkt seinen Build im Character Builder.
- Behoben: der Character Builder zeigt keine erfundenen Likes und Antworten mehr: ein Build startet bei 0.
- Behoben: die Karte eines Monsters ist nicht mehr leer, und die Karte-Schaltfläche öffnet seine Karte in einem Popup.
- Behoben: Gear Viewer zeigt jedes Teil einmal statt zweimal.
- Behoben: Dungeons listet alle Dungeons, jeden einmal.

## 0.3.9

- Geändert: Nutzungsbedingungen aktualisiert: In Recluta und Daeva sind Datenbank, Gear Viewer, Crafting-Helfer und Rechner enthalten, sobald offizielle Spieldaten verfügbar sind. Du wirst gebeten, die Bedingungen erneut zu akzeptieren.

## 0.3.8

- Entfernt: Datenbank, Gear Viewer, Armory, Daevanion-Planer, Crafting, Rechner und Marktplatz zeigen „Offizielle Daten folgen“, bis offizielle Spieldaten verfügbar sind.
- Entfernt: Der Character Builder behält Skills, Beschreibung und Kommentare; Ausrüstung, Werte, Gear Score und Sammlungen kommen mit offiziellen Daten zurück, und die in deinen Builds gespeicherte Ausrüstung wurde gelöscht.
- Entfernt: Build-Community listet nur noch deine eigenen Builds; Community-Builds, Favoriten und Spawnpunkte auf der Karte sind weg.
- Geändert: Raumzeit-Riss und Shugo-Festival zeigen nur noch von NCSOFT bestätigte Details; das Riss-Portal bleibt 15 Minuten offen.

## 0.3.7

- Geändert: Recluta, Daeva und die kostenlose Testphase gelten auf 1 PC pro Konto, Empyrean auf 2; nach einem Wechsel zu einem Plan mit weniger PCs behalten die zuerst registrierten PCs den Zugang.

## 0.3.6

- Behoben: Die Unterstützer-Seite färbt das Fenster nicht mehr schwarz, wenn das Admin-Panel Nutzer auflistet; schlägt eine Seite fehl, zeigt sie den Fehler mit „Erneut versuchen“ statt eines schwarzen Fensters.

## 0.3.5

- Neu: Monster in einem Dungeon zeigen die Weltkarte mit dem Dungeon-Eingang und einen Link zum Dungeon, und Monster der Illusion-Curtain-Ebene von Verteron erscheinen jetzt auf der Karte von Verteron.

## 0.3.4

- Neu: Unterstützer-Pläne auf Patreon (Recluta 3 €, Daeva 7 €, Empyrean 15 € im Monat). Das Meter und die meisten Tabs bleiben kostenlos; Datenbank, Kampfbericht, Online-Logs und Ranglisten erfordern Recluta, Gruppe und Rotationen, Crafting und Rechner erfordern Daeva. Gesperrte Tabs bleiben im Menü, mit Schloss-Symbol und unscharfer Vorschau.
- Neu: 14 Tage kostenlose Testphase für alles, einmal pro Discord-Konto: melde dich mit Discord an, um sie zu starten.
- Neu: Ein Plan gilt auf bis zu 2 PCs pro Konto (ein PC gibt seinen Platz nach 30 Tagen ohne Nutzung frei), und die kostenlose Testphase gibt es einmal pro Person, gebunden an Discord-Konto und PC.
- Neu: Unterstützer-Seite: dein Plan und woher er kommt, Patreon verknüpfen oder trennen, und die Pläne im Vergleich.
- Neu: Community-Builds zeigt die Builds der Community von questlog.gg, mit Filtern nach Klasse, Tag, Region und Suche; öffne einen davon im Character Builder und dupliziere ihn, um ihn dir zu eigen zu machen.
- Neu: Karten von NPCs, Monstern und Dungeons zeigen jetzt eine Minikarte ihres Standorts, und Quest-Karten zeigen, wo sich Questgeber, Ziele, der Abgabe-NPC und der Dungeon befinden. Die Karten von Poeta, Ishalgen, Eltnen und Morheim wurden hinzugefügt.
- Geändert: „Deine Builds" listet nur die Builds auf, die du erstellt oder dupliziert hast; „Gefällt mir" heißt jetzt „Favoriten" und bleibt nach einem Neustart erhalten.
- Geändert: Karten laden nur noch den Teil, den du gerade betrachtest.

## 0.3.3

- Neu: NPCs und Monster in der Datenbank zeigen ihre Spawnpunkte auf der Karte (Auf der Karte zeigen), für Verteron, Altgard und Reshanta.
- Geändert: Der Hauptbuild gilt jetzt pro Charakter statt pro Klasse: Zwei Charaktere derselben Klasse haben getrennte Ausrüstung. Bis ein Charakter seinen eigenen bearbeitet, startet er mit dem bisher geteilten Build.
- Geändert: Die Karten in Meine Charaktere zeigen den Gear Score des Hauptbuilds (vorhanden / Ziel, dieselben Zahlen wie im Character Builder) statt des immer leeren CP; auch die obere Leiste zeigt ihn nicht mehr.
- Behoben: Ein über die Charakterkarte geöffneter Build nutzt Arcana und Daevanion dieses Charakters, nicht die des aktiven.

## 0.3.2

- Behoben: In Meine Charaktere öffnet die ganze Charakterkarte seinen Build (vorher nur der Name, ohne sichtbaren Hinweis).
- Behoben: Das Meter folgt dem Charakter, den du tatsächlich spielst, und liest ihn aus dem Spiel; einen Charakter in Meine Charaktere aktiv zu setzen ändert nicht mehr, wen das Meter erfasst.

## 0.3.1

- Neu: Bevor du startest: Die vollständigen Nutzungsbedingungen und die Datenschutzerklärung (Englisch, Italienisch, Deutsch, Französisch, Spanisch, Portugiesisch, Russisch) müssen akzeptiert werden, bevor PowerMeter Kampfdaten liest. Bestehende Nutzer akzeptieren sie einmal beim nächsten Start.
- Geändert: „Widget öffnen“ heißt jetzt „DPSMeter starten“.
- Geändert: Die Meter-Modi erscheinen als BOSS, TRAIN, PVE, PVP in dieser Reihenfolge im Meter, im Kampfverlauf und in den Einstellungen.
- Geändert: Ein Klick auf den Namen eines Charakters in Meine Charaktere öffnet seinen Build, ohne den aktiven Charakter zu wechseln.
- Geändert: Das Update-Fenster gruppiert die Versionshinweise nach Art (neu, geändert, behoben) und ist übersichtlicher.
- Behoben: Der Gear Viewer zeigte die meisten Teile doppelt an (derselbe Gegenstand existiert einmal pro Fraktion); jetzt erscheint jedes Teil nur einmal.
- Behoben: Der Build-Kopf zeigte Platzhalter für Likes und Kommentare statt der echten Likes des Builds.

## 0.3.0

- Neu: Online-Logs: deine hochgeladenen Kämpfe mit Link, änderbarer Sichtbarkeit (öffentlich, nicht gelistet, privat), Aufrufen, Ranglistenplatz und Löschen.
- Neu: Klassenstatistiken: durchschnittlicher DPS pro Klasse an jedem Boss, meistgespielte Klassen und wöchentlicher Verlauf, aus den öffentlichen Logs der Community. Derselbe Kampf, von mehreren Gruppenmitgliedern hochgeladen, zählt nur einmal.
- Neu: Ausrüstungsansicht: alle Ausrüstungsteile mit Filtern, Suche und sortierbaren Werten. Wähle Gegenstände aus, um sie oben anzuheften oder nebeneinander zu vergleichen, mit grünem Pfeil beim besten und rotem beim schlechtesten Wert.
- Neu: Armory: Charaktere nach Region, Fraktion, Server und Klasse suchen, beliebte Profile, Ranglisten und das vollständige Charakterblatt sehen (EU/NA, sobald verfügbar).
- Neu: Shugo-Festival: Live-Countdown bis zur nächsten Runde, ihre Minispiele, kommende Runden und ein Festival-Shop-Planer mit den noch fehlenden Marken.
- Neu: Raumzeit-Riss: Countdowns für Portal und Riss, der 24-Stunden-Plan und die Route für deine Fraktion.
- Neu: Rechner: Werte und Gear Score eines Teils zwischen zwei Verbesserungsstufen mit Seelenprägungs-Qualität, Boni der Primärwerte und Splendent-Chancen eines Rezepts.
- Neu: Marktplatz (ersetzt die Einkaufsliste): Gegenstandssuche und Beobachtungsliste; Preise, Verläufe und Marktstatistiken erscheinen, sobald es eine Marktdatenquelle für EU/NA gibt.
- Neu: Handwerk Schritt für Schritt: jeder Schritt zeigt den genauen verwendeten Gegenstand, die Ergebnisse Normal und Splendent und welches der nächste Schritt braucht; auf der letzten Stufe wählst du zwischen Aufwerten des normalen Teils und Herstellen bis Splendent.
- Geändert: Flow Map wird durch das Shugo-Festival ersetzt; Online-Logs und Klassenstatistiken erklären, wofür sie da sind.
- Behoben: Flügel, Titel und Begleiter in der Datenbank zeigen ihre Boni.

## 0.2.14

- Neu: PvE-Tab im Meter für das Farmen von Mobs. Der Schaden summiert sich über alle getroffenen Mobs, auch nach ihrem Tod, und wird nach 5 Minuten ohne Mob-Treffer, beim Zonenwechsel oder mit Zurücksetzen gelöscht.
- Neu: Boss, PvE, Train und PvP sind getrennt: jeder Treffer zählt nur im Tab seines Zieltyps. Das Widget zeigt immer, was es aufzeichnet (Typ und Zielname), und gespeicherte Kämpfe landen in ihrem Tab, mit einem Modusfilter im Kampfverlauf.
- Neu: Erhaltene Heilung pro Spieler (eigene und von anderen) und Aggro (von Mobs erlittene Treffer; Templer und Gladiator als TANK markiert; eine als solche gekennzeichnete Schätzung, bis Mobs jemanden getroffen haben).
- Neu: Handwerk: alle herstellbaren Gegenstände mit Waffen zuerst, die Aufwertungskette von der ersten bis zur letzten Stufe, der Rezeptbaum und die Materialien für die gewählte Menge mit Vorhanden und Fehlend, gespeichert.
- Geändert: Schaden wird überall vollständig angezeigt (Widget, Detailfenster, Meter und Bericht im Dashboard), keine K/M-Rundung mehr.
- Behoben: Das Meter hört nicht mehr auf zu zählen, wenn sich ein Mob bewegt (er wurde für einen Spieler gehalten), und der Boss-Tab zeigt nur Bosse.
- Behoben: Das Sperren des Widgets leert die Spielerliste nicht mehr; Build und Lobby bleiben im gesperrten Zustand sichtbar.
- Behoben: Das Widget zeigt die Symbole des gespeicherten Builds, auch nach dem Erstellen oder Umbenennen.
- Behoben: Hochladen im Widget lädt den gerade beendeten Kampf hoch, bittet bei Bedarf um Anmeldung mit Discord und meldet, wenn ein Trainingskampf nicht hochgeladen werden kann.

## 0.2.13

- Neu: Charaktere haben eine Fraktion (Elyos oder Asmodier). Wähle sie beim Hinzufügen eines Charakters oder auf der Karte eines bestehenden; sie erscheint auf der Startseite und im Character Builder.
- Neu: Der Kampfbericht zeigt deine gespeicherten Kämpfe: Versuche am selben Boss, Übersicht, Fertigkeiten, DPS-Diagramm, Zeitleiste, erlittener Schaden, Heilung und Vergleichen. Ein Klick auf einen Kampf im Kampfverlauf oder auf der Startseite öffnet ihn im Bericht.
- Neu: Exportieren im Kampfbericht speichert den ganzen Kampf, sodass er über Kampfverlauf → Hochladen → Aus Datei wieder geladen werden kann.
- Neu: Die Gruppenanalyse zeigt Spieler, Fertigkeiten und Eröffnungsrotationen deines letzten Kampfes.
- Geändert: Alle Beispieldaten wurden vor dem Start entfernt. Seiten, die noch nichts anzuzeigen haben (Ranglisten, Community-Builds, Kommentare, News, Aktivitäten, Heilung und Aggro im Meter, Widget-Lobby), zeigen einen leeren Zustand.
- Geändert: Teilen liefert nur noch einen echten Link, sobald der Kampf aus dem Kampfverlauf hochgeladen wurde.
- Geändert: Noch nicht verfügbare Einstellungen werden deaktiviert und mit "Demnächst verfügbar" angezeigt.
- Behoben: Die in früheren Versionen gespeicherte Ausrüstung deines Haupt-Builds bleibt erhalten.

## 0.2.12

- Neu: Hochladen im Kampfverlauf öffnet ein Fenster, um die ausgewählten Kämpfe oder eine mit Exportieren gespeicherte Datei hochzuladen, und lässt dich von dort aus mit Discord anmelden.
- Neu: benenne einen von dir erstellten oder geklonten Build um und speichere ihn; Bearbeiten- und Löschen-Buttons bei deinen Builds, mit einem Bestätigungsfenster.
- Neu: die Flügelwerte zeigen die Boni des ausgerüsteten Flügels zusätzlich zu denen der Sammlung.
- Geändert: Flügel, Titel und Begleiter ohne Werte werden wieder aufgelistet, nach den anderen, markiert mit "Keine Werte".
- Geändert: Deine Builds zeigt nur die Builds, die du erstellt oder geklont hast.
- Behoben: Npcap herunterladen startet den Installer erneut (er fragt jetzt nach Administratorrechten, statt stillschweigend zu scheitern).

## 0.2.11

- Neu: die Werte im Character Builder sind echt und live: Klassen-Basiswerte, Ausrüstung (Magiesteine und jeder andere Slot), Daevanion, Sammlungen und Titel, berechnet so wie questlog es macht. Die Ziel-Ansicht zeigt die Änderung bei jedem Wert.
- Neu: Sammlungen für Pantheon, Arcana und Genus Insight, mit ihren Werten im Builder.
- Neu: Fertigkeiten und Quests in der Datenbank zeigen die englische Seite und darunter dieselbe Seite in deiner Sprache (Italienisch ist eine inoffizielle Übersetzung).
- Neu: lösche die Builds, die du erstellt oder geklont hast; deine Builds und deine Daevanion-Knoten bleiben nach einem Neustart erhalten.
- Neu: neues Windows-Symbol.
- Geändert: Gear Score wird berechnet, so wie questlog es macht (Verstärkung, Durchbruch, Magiesteine, Theostein, Arcana, Daevanion-Punkte).
- Geändert: ein Build kann nur auf einen Charakter derselben Klasse geklont werden.
- Geändert: ein einziger Zurück-Button: zum Build von Fehlende Teile aus, überall sonst zum Character Builder.
- Behoben: Hochladen im Kampfverlauf lädt die ausgewählten Kämpfe hoch.
- Behoben: ausgerüstete Flügel und Titel geben ihre Boni; Flügel und Titel ohne Werte werden nicht mehr aufgelistet; die Flugkraft ist nicht mehr aufgebläht.
- Behoben: der Handschuh-Skin und die Brawler-Flügel sind ausgeblendet, bis der Brawler in EU/NA erscheint.

## 0.2.10

- Neu: Sammlungen im Character Builder (Skins, Begleiter, Flügel, Monolith, Titel) mit echten Wertesummen; ein neuer Charakter beginnt bei 0. Genus Insight, Pantheon und Arcana folgen in einem eigenen Update.
- Neu: echte Gegenstandswerte im Character Builder (Basis, Verstärkung, Durchbruch, Seelenprägungs-Zeilen), echte Magiesteine, Theosteine und Steine der Weisen sowie Gear Score aus deinen Teilen.
- Neu: auf einer Gegenstandsseite legt Zum Build hinzufügen ihn in deine aktuelle Ausrüstung und Zum Ziel hinzufügen in deine Zielausrüstung.
- Neu: Vergleichen und Exportieren im Kampfbericht; Exportieren im Kampfverlauf.
- Geändert: der Nebenhand-Slot ist für jede Klasse die Guard; der Potenzial-Regler ist entfernt; Combat Power wird nicht mehr mit erfundenen Zahlen angezeigt.
- Behoben: das Build-Widget zeigt Gegenstandssymbole.
- Behoben: Fehlende Teile zählt jeden Slot (auch Armreifen); Aktuell zeigt einen leeren Build als leer; Zurück zum Build führt zum Build, an dem du gearbeitet hast.
- Behoben: die Balken für Heilung, erlittenen Schaden und Ziele im Kampfbericht skalieren über den ganzen Kampf, und der Versuchszähler wechselt zwischen den Versuchen.
- Behoben: die Porträts in Build community zeigen das Gesicht der Figur.

## 0.2.9

- Neu: die gesamte Spieldatenbank ist in der App (Gegenstände, NPCs, Quests, Dungeons, Fertigkeiten, Rezepte, Titel, Erfolge, Begleiter, Flügel und mehr) mit echten Details, Verknüpfungen und Suche per Strg+K.
- Neu: PvP-Tab im DPS Meter: Schaden von dir und deiner Gruppe an anderen Spielern.
- Neu: Character Builder überarbeitet: jeder Slot bietet nur passende Gegenstände, funktionierende Regler und Werte-Menüs, echte Ist- und Ziel-Ausrüstung, fehlende Teile, Vergleichen, Widget und Teilen (Discord).
- Neu: Build community zeigt 12 Builds pro Seite; Deine Builds und Gefällt mir funktionieren.
- Geändert: die Programmdatei heißt jetzt PowerMeter.exe.
- Geändert: der Charakter-Chip oben ist ein einfacher Button, der Meine Charaktere öffnet.
- Behoben: der Charakter-Export speichert die Datei im Ordner Downloads.
- Behoben: jeder Tab des Kampfberichts (Fertigkeiten- und Buff-Zeitleiste, erlittener Schaden, Heilung, Ziele) folgt dem gewählten Zeitraum.
- Behoben: Standardausrüstung und Build-Listen folgen der Klasse deines Charakters.

## 0.2.8

- Neu: Meine Charaktere funktioniert: Charaktere hinzufügen, importieren, exportieren, duplizieren und löschen sowie den aktiven wählen. Ein Charakterwechsel aktualisiert das ganze Dashboard (Builder, Skill Planner, Daevanion).
- Neu: der Daevanion Planner zeigt die echten Boards der Klasse deines Charakters.
- Neu: echte Gegenstandssymbole in Builder, Gegenstandsseiten, Suche und Startseite.
- Neu: interaktive Weltkarte mit echten Markierungen (Daten: aion2-interactive-map, CC BY-NC 4.0).
- Neu: Tags beim Erstellen eines neuen Builds wählen.
- Geändert: die Tabs des DPS Meters sind jetzt Boss, Train und PvP.
- Geändert: nur EU und NA werden angezeigt; der Brawler ist ausgeblendet, bis er im Westen erscheint.
- Behoben: beim Wechsel des DPS-Meter-Tabs springt die Ansicht nicht mehr zu Boss zurück.
- Behoben: ein ausgewählter Zeitraum im Kampfbericht aktualisiert die Statistiken darunter.
- Behoben: Tabs und Filter der Ranglisten sowie die Seitenzahlen von Build community funktionieren.

## 0.2.7

- Behoben: Die Versionshinweise im Update-Fenster erscheinen jetzt in der für PowerMeter gewählten Sprache.
