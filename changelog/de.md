# Changelog (de)

Translation of CHANGELOG.md: same `## <version>` sections and bullets.

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
