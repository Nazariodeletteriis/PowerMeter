# Changelog (fr)

Translation of CHANGELOG.md: same `## <version>` sections and bullets.

## 0.5.35

- Modifié : Guide des cubes : la boussole reste nord en haut comme la mini-carte du jeu ; la flèche pointe vers le cube et un cône montre où votre dernière compétence a visé.
- Nouveau : Guide des cubes : la distance défile jusqu'à la nouvelle valeur quand votre position se met à jour.
- Nouveau : Mini-carte : un cube caché qui vient d'apparaître continue de pulser, pour le repérer d'un coup d'œil.
- Modifié : Guide des cubes : fenêtre et textes plus grands, plus lisibles au-dessus du jeu.
- Corrigé : Guide des cubes : la fenêtre ne s'ouvre plus trop basse en coupant la liste et les lignes du bas.
- Corrigé : Widget DPS en mode compact : le nom du mode est de nouveau centré dans sa ligne au lieu de toucher la ligne du dessus.

## 0.5.34

- Nouveau : Guide des cubes : il liste tous les emplacements de cubes autour de vous (jusqu'à 100 m) avec distance et direction, et des flèches indiquent si le cube est plus haut ou plus bas que vous, avec le dénivelé.
- Nouveau : Guide des cubes : la boussole s'oriente là où vous avez visé avec votre dernière compétence (le viseur du jeu), la flèche indique donc devant, à gauche ou derrière ; après une minute sans compétence elle revient au nord en haut.
- Nouveau : Votre position se met à jour bien plus souvent : aussi avec les buffs, les soins et tout effet que vous lancez, les sprints au sol et les corrections du serveur. Les lanceurs de sorts n'ont plus besoin d'attaquer pour mettre à jour le guide et la mini-carte.
- Corrigé : Un sprint ne déplace plus votre point sur la mini-carte dans le coin de la carte.
- Corrigé : Widget DPS : un boss ne devient plus un combat "JcJ" avec seulement une partie du groupe (le boss était pris pour l'invocation d'un autre joueur et les dégâts des autres étaient perdus).

## 0.5.33

- Nouveau : Guide des cubes : une petite fenêtre au-dessus du jeu qui pointe vers le cube caché le plus proche sur votre carte, nord en haut, avec la distance. Elle se met à jour quand vous vous téléportez ou utilisez une compétence (le jeu n'envoie pas votre position quand vous marchez simplement).
- Nouveau : Cubes cachés : quand un cube apparaît près de vous, le guide le signale par un son et un clignotement et la carte le marque ; une fois ouvert, il disparaît.
- Nouveau : Carte : 2 811 emplacements de cubes cachés, tous les endroits où un cube peut apparaître, remplacent les 226 d'avant (données : Aion-DPS-Meter, MIT).
- Corrigé : Widget DPS : après l'entrée dans une nouvelle instance, les joueurs de votre groupe précédent n'apparaissent plus avec leurs anciens noms ou dégâts.
- Corrigé : Widget DPS en mode compact : les encadrés de fin de combat, de journal envoyé et d'erreur tiennent de nouveau dans la fenêtre, sans boutons hors du bord ni sur le texte.

## 0.5.32

- Nouveau : Mini-carte : elle passe d'elle-même à la carte où vous êtes (Élyséens, Asmodiens ou Abysses), et votre dernière position connue s'affiche aussi dans les Abysses.
- Corrigé : Historique et détails des combats : le Mur de feu du Sorcier n'apparaît plus comme un joueur sans nom en trop ; ses dégâts vont au Sorcier, y compris dans les combats enregistrés avant cette mise à jour.
- Corrigé : Widget DPS : une langue changée dans le tableau de bord s'applique tout de suite au widget.
- Corrigé : Paramètres : dans le thème PowerMeter, les interrupteurs activés et désactivés se distinguent mieux.
- Modifié : L'ancien panneau de paramètres resté dans le widget DPS a été retiré (toutes les options sont dans le tableau de bord).

## 0.5.31

- Nouveau : Mini-carte : un point indique votre dernière position connue sur la carte de votre faction. Il bouge quand vous vous téléportez ou utilisez une compétence (le jeu n'envoie pas votre position quand vous marchez simplement), ainsi après une victime vous voyez si vous êtes au bon endroit.
- Nouveau : Mini-carte : elle s'ouvre sur la carte de votre faction (Asmodien ou Élyséen) quand la faction est indiquée sur le personnage ; une carte choisie à la main reste jusqu'à ce que vous jouiez un personnage de l'autre faction.

## 0.5.30

- Corrigé : Familiers : un familier monte d'un niveau dès que sa progression atteint 75 (le niveau 3 affiche MAX), au lieu de rester bloqué à 75/75.
- Corrigé : Familiers : si vous lancez l'application alors que vous êtes déjà en jeu, la progression compte vos victimes à partir de la dernière collection lue, au lieu de rester figée jusqu'à la prochaine connexion.
- Supprimé : Paramètres > Widget DPS : les options « Échelle » et « Colonnes visibles », qui ne faisaient rien.

## 0.5.29

- Corrigé : Le ping du widget DPS fonctionne : il est désormais mesuré sur la connexion elle-même (votre paquet jusqu'au serveur et retour), car le ping du jeu ne peut plus être lu.

## 0.5.28

- Corrigé : Widget DPS, affichage compact : le nom du mode (par exemple « PowerMeter » ou « Boss Targets ») n'est plus trop grand.
- Corrigé : Mini-carte et Character Builder, familiers : les noms de famille au survol ne passent plus sous les cartes des familiers ; le premier filtre est « ALL » dans toutes les langues.

## 0.5.27

- Corrigé : Familiers : la progression de chaque familier augmente maintenant à chaque monstre que vous tuez pour lui, au lieu de rester à la valeur lue à la connexion.
- Corrigé : Widget DPS : le Mur de feu d'un Sorcier n'apparaît plus comme un joueur supplémentaire sans nom (#id) dans un groupe complet : ses dégâts vont au Sorcier qui l'a lancé.

## 0.5.26

- Corrigé : Le personnage que vous jouez est de nouveau reconnu à la connexion et au changement : le nom d'un autre joueur (par exemple un inconnu près de vous) pouvait être pris pour le vôtre, et le tableau de bord et le widget le suivaient.

## 0.5.25

- Corrigé : Le ping du widget DPS (barres du signal, valeur et couleur du point live) fonctionne de nouveau : le jeu avait changé sa façon de mesurer le ping et l'app ne recevait plus aucune valeur ; elle le mesure désormais de votre requête à la réponse du serveur.

## 0.5.24

- Modifié : Le verrou du widget DPS et de la mini-carte se contente désormais de garder la fenêtre en place : tous les boutons restent visibles et cliquables, et les clics ne passent plus au jeu. L'interrupteur des paramètres et Ctrl+Alt+L font de même.
- Nouveau : Widget DPS : le signal en haut à gauche affiche votre vrai ping en jeu, vert avec toutes les barres, orange quand il monte et rouge quand il est élevé, avec la valeur à côté.
- Modifié : Le widget DPS et la mini-carte ont des coins carrés, dans le style des icônes du jeu.
- Corrigé : Paramètres : l'interrupteur du verrou du widget DPS suit maintenant le verrou quand vous le changez depuis le widget ou au raccourci.

## 0.5.23

- Modifié : Le widget DPS reste visible quand vous quittez le jeu (Alt+Tab) au lieu de passer dans la barre des tâches. Pour le masquer hors du jeu, activez « Masquer le meter automatiquement » dans Paramètres > Widget DPS.

## 0.5.22

- Corrigé : La mini-carte peut de nouveau être déplacée : depuis la 0.5.20, elle restait où elle était.

## 0.5.21

- Corrigé : Alt+Tab depuis le jeu ne bloque plus la souris : avec la mini-carte ouverte, l'application vers laquelle vous basculiez perdait le focus au profit de la mini-carte toutes les secondes et demie.

## 0.5.20

- Corrigé : Mini-carte : en la déplaçant, elle ne s'aimante plus aux bords ou aux coins de l'écran et ne s'agrandit plus au double-clic, elle reste donc là où vous la placez, même sur la mini-carte du jeu.
- Corrigé : Mini-carte : la redimensionner garde le zoom et le centre de la carte au lieu de repartir de la carte entière.
- Corrigé : Utiliser la mini-carte ne masque plus le widget DPS et ne bloque plus la souris.
- Corrigé : Familiers de la mini-carte : la liste est compacte, avec une petite vignette à côté du nom et du niveau ; la page Carte garde les grandes cartes.

## 0.5.19

- Nouveau : Mini-carte : le widget Carte est maintenant une mini-carte transparente par-dessus le jeu, dans le style de celle du jeu, avec des curseurs Opacité de la carte et Opacité du tracé, des boutons latéraux (déplacer, filtre, pets, plein écran, zoom) et un verrou qui laisse passer les clics vers le jeu.
- Nouveau : Filtres de la mini-carte : un menu « Récolte » avec chaque ressource sous son nom dans le jeu (Asvata, Calendula, Azpha, Odyle...) et sa propre icône, et un menu « Calques » avec les autres marqueurs ; les deux ont Tout sélectionner / Tout désélectionner. La grande carte les a aussi.
- Nouveau : Pets sur la mini-carte : choisissez une famille et un pet et ses monstres apparaissent en points sur la mini-carte, avec le nom au survol ; les pets terminés n'apparaissent jamais.
- Nouveau : Thèmes : les thèmes de couleur du widget (PowerMeter, AION2, Asmodian, Elyos, Ember, Frost, Obsidian, Cogni, Fera, Natura, Varian) habillent maintenant toute l'app, un seul choix pour le widget, le tableau de bord et toutes les fenêtres.
- Nouveau : Les réglages du widget DPS sont maintenant dans l'app, dans Paramètres > Widget DPS ; le bouton en forme d'engrenage du widget les ouvre là.
- Nouveau : Les alertes d'événements peuvent aussi afficher une popup sur le widget avec l'événement et son compte à rebours, de 3 à 30 secondes (8 par défaut) ; activable ou désactivable dans les réglages.
- Nouveau : Character Builder : chaque objet affiche ses stats bonus et ses manastones lus depuis le jeu, et les stats bonus comptent dans les totaux (les quelques-unes dont la stat n'est pas encore certaine sont affichées comme #id et laissées de côté ; les manastones n'affichent que leur palier, le jeu n'envoyant aucune valeur).
- Nouveau : Character Builder : les stats d'Arcana comptent dans les totaux, et les stats principales (Time, Life, Freedom, Justice, Illusion et les attributs) ajoutent leurs stats dérivées selon la table de conversion du jeu.
- Nouveau : Character Builder, Pets : chaque pet affiche ses effets aux niveaux 1, 2 et 3, et Effets possédés affiche le total de la collection par famille à côté des options d'Insight ; la collection compte maintenant dans les stats.
- Nouveau : Gear Viewer : réglez l'amélioration de chaque objet comparé et choisissez ses stats bonus (ou saisissez-les), pour que la comparaison soit la vraie.
- Corrigé : Character Builder : les niveaux d'objet correspondent à ceux du jeu (base + amélioration + manastones).
- Corrigé : Character Builder : les Arcana portés en jeu sont reconnus et remplis automatiquement comme le reste de l'équipement.

## 0.5.18

- Nouveau : Widget Carte : la carte interactive s'ouvre dans sa propre fenêtre par-dessus le jeu (bouton sur la page Carte), avec un bouton plein écran sur le widget comme sur la page (Échap pour quitter).
- Nouveau : Calques de la carte pour la récolte (Od, gemmes, métaux, herbes, coquillages, légumes, bois, baies) à côté des cubes cachés et des autres marqueurs, chacun activable ou désactivable et mémorisé.
- Nouveau : Carte, panneau Pet : choisissez des pets (par exemple Kuru Overseer et Kuru Worker) et la carte montre exactement où se trouvent leurs monstres, avec le nom au survol. Les pets terminés (niveau 3) n'apparaissent jamais, vous ne voyez donc que ce qu'il vous manque ; « Afficher tous les pets qui me manquent » les met tous sur la carte.
- Nouveau : Character Builder, Pets : chaque pet indique où il vit, et « Afficher sur la carte » ouvre le widget Carte sur lui. Les icônes de famille sont celles du jeu, avec le nom de la famille au survol.
- Nouveau : Character Builder, Pets : les effets possédés sont lus depuis le jeu à la connexion et comptés dans les stats (24 options du jeu ; les quelques-unes dont la valeur n'est pas encore certaine sont laissées de côté).
- Nouveau : Character Builder : un objet que les données du jeu n'ont pas encore (par exemple Spiritforged Guard) peut être identifié une fois depuis la liste ; il est mémorisé et partagé, donc connu de tous.
- Corrigé : Character Builder : les Arcana que vous portez sont lus depuis le jeu et comptés dans les stats.
- Corrigé : Character Builder : l'amélioration au-delà de +15 (de +16 à +20) s'affiche à son vrai niveau et ses bonus supplémentaires sont listés ; là où les valeurs publiées s'arrêtent à +15, le bonus +15 est utilisé et le panneau l'indique.
- Corrigé : Widget DPS : plus de 6e joueur en trop dans une instance à 5 (soigneurs ou buffeurs à proximité, ou le même joueur avec un nouvel id après sa mort).
- Corrigé : Widget DPS : un joueur qui a changé d'id (mort, reconnexion) garde ses dégâts et son nom au lieu de repartir de 0 ou d'apparaître comme #id ; un nom manquant est repris de la liste du groupe.
- Corrigé : Widget DPS : le meter se réinitialise proprement entre deux boss, aussi quand vous réengagez le même boss ou changez de zone.
- Corrigé : Fermer PowerMeter le ferme maintenant pour de bon : le widget caché ne reste plus actif en arrière-plan et ne bloque plus le démarrage suivant.

## 0.5.17

- Nouveau : Événements, onglet Boss de terrain : « Réapparitions d'après vos kills ». Quand un boss de terrain meurt avec PowerMeter lancé, vous voyez quand il revient (heure du kill + son délai de réapparition), avec un compte à rebours et « Devrait être là » une fois le minuteur écoulé. Couvre les 48 boss de Verteron et d'Altgard ; les délais de réapparition sont estimés.

## 0.5.16

- Modifié : Événements : l'onglet « Tout » n'affiche que le prochain Festival Shugo, pour que les failles et les boss ne soient plus noyés sous 24 lignes par jour ; l'onglet Événements les liste toujours tous.

## 0.5.15

- Corrigé : Redimensionner le widget met maintenant tout son contenu à l'échelle (texte, lignes, icônes), pas seulement le cadre. Tirer la hauteur donne toujours de la place pour plus de lignes.
- Corrigé : « Opacité de la fenêtre » et « Opacité des barres » dans la fenêtre Paramètres changent maintenant le widget tout de suite.
- Corrigé : « Taille du nom de la cible » change aussi le titre affiché sans boss.

## 0.5.14

- Corrigé : Faire glisser le curseur « Taille du nom de la cible » ne fait plus clignoter le meter jusqu'à remplir la RAM : la fenêtre Paramètres et le meter se renvoyaient l'ancienne et la nouvelle valeur.
- Modifié : Organiseur : la page Minuteur s'appelle désormais Événements ; les pages Festival Shugo et Faille spatio-temporelle sont retirées (les deux sont dans Événements).

## 0.5.13

- Nouveau : Page Minuteur redessinée : comptes à rebours pour la prochaine Faille, le prochain événement, boss de terrain et réinitialisation ; onglets Tout / Failles / Événements / Boss de terrain / Réinitialisations ; une liste par jour avec début, fin et compte à rebours de chaque créneau.
- Nouveau : Choisissez quand arrivent les alertes d'événements : 1, 3, 5 ou 10 minutes avant. L'alerte du widget suit le même réglage.
- Modifié : Le son des événements ne vient plus que du widget, il ne sonne donc jamais deux fois.

## 0.5.12

- Corrigé : Votre propre ligne n'affiche plus un numéro (#6653) à la place de votre nom après la réinitialisation automatique entre deux boss : PowerMeter suit votre nouvel id même quand le jeu ne renvoie pas votre nom.
- Corrigé : Alertes d'événements : chaque Shugo et chaque boss de monde a sa propre alerte 10 minutes avant, même quand plusieurs commencent à une minute d'intervalle (une ligne chacun) ; fermer une alerte ne masque plus les suivantes, et un chargement raté est relancé après une minute au lieu d'une heure.

## 0.5.11

- Modifié : Widget : la barre du haut, la ligne du boss et le pied restent opaques ; le réglage d'opacité n'éclaircit plus que la liste des joueurs, pour que les boutons restent lisibles sur un jeu clair.

## 0.5.10

- Corrigé : Le widget restait sur « Non connecté » / « aucun paquet » même après la connexion de PowerMeter au jeu : il suit désormais la connexion toutes les quelques secondes.

## 0.5.9

- Nouveau : Quand PowerMeter n'arrive pas à se connecter au jeu, le widget dit pourquoi (aucun paquet des cartes réseau, aucun paquet du jeu, fenêtre du jeu non reconnue…) et « Copier le diagnostic » copie un rapport à coller dans Discord.
- Corrigé : Wi-Fi : les cartes réseau ne sont plus ouvertes en mode promiscuous, qui sur beaucoup de pilotes Wi-Fi ne capturait rien.
- Corrigé : Les cartes réseau qui étiquettent leurs paquets (Killer et autres cartes gaming) sont désormais lues.
- Corrigé : L'avertissement « non connecté » n'apparaissait jamais : le widget prenait « pas encore de port » pour un port.
- Modifié : Widget : Reset est dans le pied, en bas à gauche.

## 0.5.8

- Nouveau : Widget redessiné : onglets DPS / HEAL / AGGRO, nom du boss avec barre de PV, lignes de classement avec barres de DPS à la couleur de la classe. La disposition Compacte suit le même style.
- Modifié : Les dispositions du widget sont désormais seulement « Interface » et « Compacte ». Les dispositions Classiques ont été retirées : si vous en utilisiez une, vous passez à la nouvelle disposition correspondante.
- Corrigé : PowerMeter trouve le jeu même quand sa fenêtre porte un autre titre (par exemple « AION 2 ») : il le reconnaît à son programme.
- Corrigé : Npcap installé sans le mode « WinPcap API-compatible » fonctionne désormais ; si Npcap ne peut pas démarrer, le widget l'indique.
- Corrigé : Les cartes réseau activées après le démarrage (VPN, ExitLag, Wi-Fi après la veille) sont capturées sans redémarrer, et le meter ne reste plus bloqué sur une connexion morte.
- Corrigé : Carte du monde : les marqueurs et les limites de zone étaient à l'envers (cubes asmodiens dans la mer). Ils sont maintenant sur la terre ferme sur toutes les cartes.
- Modifié : Supporter : les trois offres Patreon débloquent tout ; seules la période de facturation et la remise changent.

## 0.5.7

- Nouveau : Constructeur de personnage : onglet Familier : votre collection de familiers comme dans la fenêtre Familier du jeu (catégories, niveau, progression x/75, MAX), ouverte avec « Afficher les familiers ». PowerMeter la lit dans le jeu à la connexion ; vous pouvez aussi marquer les familiers à la main. Le compte correspond au jeu (familiers Special exclus).
- Corrigé : Constructeur de personnage : un objet porté absent des données d'objets (comme le bouclier du Clerc) reste dans son emplacement au lieu de disparaître.
- Corrigé : Changer de personnage en jeu change maintenant tout l'onglet Personnage, constructeur compris, pas seulement l'en-tête.

## 0.5.6

- Nouveau : Rapport de combat : les dégâts de chaque coup sont désormais enregistrés, une plage de temps sélectionnée affiche donc les dégâts réels de chaque compétence, pas une estimation (à partir des prochains combats).
- Nouveau : Entraîneur aussi dans le widget, Bêta compact compris : l'icône cible dans le pied.
- Nouveau : Entraîneur : le bouton Recommencer relance le compte à rebours et la réinitialisation.
- Corrigé : Votre personnage est reconnu même si PowerMeter démarre alors que vous êtes déjà en jeu : plus de numéro à la place de votre nom.
- Corrigé : Entraîneur : il mesure à nouveau (il restait vide) et le widget ne le repasse plus en PVE.
- Corrigé : « Seulement mon DPS » dans le widget masque désormais les autres joueurs.
- Corrigé : Widget Bêta compact : la barre du haut reste lisible au survol (elle n'affichait que « I »).

## 0.5.4

- Nouveau : Compteur DPS : mode Entraîneur : compte à rebours 3-2-1, puis votre DPS sur le mannequin d'entraînement uniquement.
- Nouveau : Option « Seulement mon DPS » dans le pied du widget et dans le Compteur DPS : masque tous les autres.
- Nouveau : Historique des combats : les tests sur mannequin sont enregistrés comme combats à part, quelques secondes après l'arrêt.
- Nouveau : Widget Bêta compact : barres de DPS animées, lignes plus claires et bouton Réinitialiser dans le pied.
- Corrigé : Réinitialiser ne transforme plus les membres du groupe en numéros : noms et classes restent.
- Corrigé : En changeant la disposition du widget, noms et classes s'affichent tout de suite, jamais un numéro.
- Corrigé : Disposition Classic et historique du widget : les icônes de classe manquaient.
- Corrigé : Rapport de combat : cliquer sur un nom sélectionne ce joueur, et la plage de temps ne clignote plus pendant le glissement.

## 0.5.3

- Nouveau : Panneau d'administration dans l'application : les admins l'ouvrent depuis les Paramètres. Le panneau web n'existe plus.
- Corrigé : Les objets sans icône (comme Wrathful Mind) l'affichent désormais, à partir des icônes officielles du jeu.
- Corrigé : Donjons : les cartes Conquête ne sont plus toujours rouges : elles se débloquent avec le Gear Score de votre personnage.
- Modifié : Donjons : un donjon ne s'ouvre que lorsque votre Gear Score le débloque ; les donjons verrouillés restent fermés.

## 0.5.2

- Nouveau : Les admins ouvrent le nouveau panneau d'administration web depuis la page Supporter.
- Nouveau : Un compte suspendu voit un message clair à la connexion.
- Modifié : L'app envoie sa version au serveur PowerMeter, pour savoir quelles versions sont utilisées.

## 0.5.1

- Modifié : Crafting plus simple : l'objet choisi avec ses matériaux à côté, en dessous seulement l'étape suivante avec ses matériaux, puis le tableau des matériaux nécessaires et de ceux que vous avez.
- Modifié : Crafting : la liste des objets est plus large et plus lisible.
- Modifié : Crafting : les quantités que vous avez forment un seul inventaire par personnage, valable pour tous les objets.

## 0.5.0

- Nouveau : Artisanat refait : onglets Alchemy, Blacksmithing, Cooking, Armorsmithing et Handicrafting, chacun avec ses propres sous-catégories.
- Nouveau : Arbre d'artisanat : choisis un objet et vois toute sa chaîne, de la base à la dernière étape, avec tous les matériaux ; pars d'un objet intermédiaire pour voir le reste de la chaîne.
- Nouveau : Inventaire d'artisanat : saisis les matériaux que tu possèdes déjà et marque les étapes fabriquées ; ils sont déduits de ce qui manque encore, enregistrés par personnage.
- Nouveau : Widget : onglets DPS, HEAL et AGGRO : dégâts, soins prodigués et dégâts subis de chaque joueur.
- Nouveau : Widget : le bouton Copier copie le combat sous forme d'image : colle-la sur Discord avec Ctrl+V.
- Nouveau : Builder : ton vrai Gear Score et Combat Power, lus depuis le jeu.
- Nouveau : Donjons : débloqués par le Gear Score de ton personnage, avec ce qui manque pour les verrouillés.
- Nouveau : Builder : sections Pet, Wings, Pantheon, Achievements et Closet (bientôt disponibles).
- Modifié : L'historique des combats (widget et dashboard) affiche les 10 derniers combats, avec un bouton pour en afficher 10 de plus.
- Modifié : Widget : les onglets Build et Lobby sont supprimés.
- Corrigé : Widget : changer d'onglet ne redimensionne plus le widget.

## 0.4.9

- Nouveau : Rôles : tout le monde commence en Player avec un essai complet de 30 jours (connexion Discord et compte Discord d'au moins 8 mois) ; ensuite Party, rotations et Gear Viewer sont réservés aux plans. Les plans Patreon arrivent bientôt.
- Nouveau : Page Donjons refaite : cartes Exploration et Conquest avec conditions d'accès, récompenses et butins.
- Nouveau : Builder : la barre de compétences s'affiche comme en jeu, chaque set avec les compétences enchaînées au-dessus de chaque emplacement (stigmas compris).
- Nouveau : Widget : bouton Copier pour le DPS du combat, prêt à coller sur Discord.
- Nouveau : Widget : volume de l'alerte d'événement dans les réglages.
- Nouveau : Après un changement de personnage, un conseil suggère une téléportation pour l'actualiser.
- Corrigé : Changer de personnage change tout le profil, Builder et Daevanion compris.
- Corrigé : Redimensionnement du widget : plus de bords transparents qui bloquent le jeu, taille mémorisée, l'icône réduite peut être déplacée.
- Corrigé : Un Npcap déjà installé est reconnu : plus de demande de réinstallation.
- Corrigé : Quêtes : la liste ne commence plus par des quêtes sans nom.
- Modifié : Logs de paquets et de débogage réservés aux rôles Debugger et Admin.
- Modifié : Calculateurs et Armory supprimés.
- Modifié : Conditions et confidentialité mises à jour : il te sera demandé de les accepter à nouveau.

## 0.4.8

- Nouveau : Builder : chaque dieu de l'onglet Daevanion montre son plateau en petit, avec les nœuds que tu as pris ; la loupe l'agrandit.
- Corrigé : La barre du haut suit le personnage vers lequel tu passes en jeu (le titre de la fenêtre du jeu ramenait le précédent).
- Corrigé : Builder : ta barre de compétences est lue à l'entrée dans le monde, pas seulement quand tu la modifies.
- Corrigé : Base de compétences et Daevanion : chaque compétence affiche son icône.

## 0.4.7

- Nouveau : Rapport : Inspecter montre l'équipement des autres joueurs du combat (arme, armure, collier, boucles d'oreilles, avec enchantement).
- Nouveau : Builder : ton Daevanion vient du jeu, points par dieu ; clique sur un dieu pour voir ses compétences Daevanion.
- Nouveau : Builder : l'onglet Compétences montre ta barre de compétences en jeu, par personnage.
- Nouveau : Builder : les niveaux d'enchantement (+N) sont lus depuis le jeu.
- Nouveau : L'alerte d'événement du widget joue le son du Minuteur, si tu l'as activé.
- Corrigé : Widget : « DPS moyen par classe » montre le combat sur le meter au lieu de chiffres fixes.
- Corrigé : Les runes et l'amulette apparaissent désormais dans l'équipement lu depuis le jeu.
- Corrigé : Rapport et base de compétences : icônes pour beaucoup plus de compétences (dégâts sur la durée, théostones, compétences renommées) ; toutes les compétences du jeu sont listées.
- Corrigé : Widget : plus d'espace entre l'alerte d'événement et la barre du boss.
- Corrigé : Icônes de l'Aède et du Templier aux couleurs de leur classe.
- Corrigé : Le garde d'un Rôdeur reste dans l'emplacement de main secondaire.

## 0.4.6

- Corrigé : Builder : l’équipement est de nouveau lu à l’entrée dans le monde (un gros paquet de connexion était ignoré et l’équipement actuel restait vide).
- Corrigé : L’équipement va au personnage que tu joues : en changeant de personnage, il ne finit plus sur le précédent.
- Corrigé : L’équipement lu dans le jeu affiche maintenant les icônes des objets.

## 0.4.5

- Nouveau : Builder : ton équipement actuel vient du jeu (lu à la connexion et à chaque changement), avec les stats et les niveaux d’amélioration.
- Nouveau : Le widget prévient 10 minutes avant un événement (faille, boss du monde, Festival Shugo, réinitialisations) avec un compte à rebours.
- Corrigé : Rapport : seulement les vrais joueurs, nommés comme dans les logs ; plus de lignes grises avec des numéros.
- Corrigé : Un personnage déjà dans ta liste est reconnu même si son nom a été saisi un peu différemment : plus de demande pour le recréer.
- Corrigé : Objets : le bouclier apparaît en main secondaire pour toutes les classes.

## 0.4.4

- Nouveau : Le compteur change de mode tout seul : BOSS sur un boss, PVP contre des joueurs, PVE pour le reste.
- Modifié : TRAIN disparaît : les mannequins comptent comme PVE, dans le widget et le tableau de bord.
- Nouveau : Bouton RESET toujours visible dans le widget, à côté du sélecteur de mode.
- Nouveau : Les kills de boss sont envoyés automatiquement (connecté, désactivable dans les Paramètres) ; les pages de log n'affichent que les noms des personnages.
- Nouveau : Classements (plus gros coup, kill le plus rapide, DPS du groupe) et les meilleurs joueurs de chaque classe dans Statistiques des classes.
- Nouveau : Onglet Rotation dans le Rapport ; le Rapport ouvre ton dernier boss avec le donjon et Boss 1/2/3.
- Nouveau : Historique groupé par donjon, avec un vrai filtre Donjon.
- Nouveau : Le Skill Planner remplit la barre de compétences depuis le jeu ; passifs en points, niveau 1–20.
- Nouveau : Builder avec l'équipement actuel et souhaité et l'écart de statistiques.
- Nouveau : Filtres d'objets (catégorie, emplacement, rang, niveau, échange, faction, source, classe) ; le Gear Viewer peut sélectionner, comparer et épingler.
- Corrigé : Le widget ne se fige plus en changeant de mode, et la barre STAGGER se met à jour sans nouveaux dégâts.
- Corrigé : Paquets perdus récupérés et latence réduite : le compteur suit le combat en temps réel.
- Modifié : Marketplace supprimé.

## 0.4.3

- Nouveau : Quand une mise à jour est disponible, une fenêtre s'affiche dès l'ouverture de l'app avec les boutons Mettre à jour et Notes de version.

## 0.4.2

- Nouveau : Barre STAGGER sous la barre de PV du boss dans le widget, avec la vraie valeur : elle baisse avec tes coups et montre quand le boss est brisé.
- Corrigé : Le widget et ses Paramètres suivent la langue choisie (dans l'app installée ils restaient en anglais).
- Corrigé : Réinitialisations quotidienne et hebdomadaire à 07:00 UTC, affichées dans ton heure locale.
- Corrigé : Tes propres PV ne se mélangent plus avec ceux des monstres.

## 0.4.1

- Modifié : Nouveau design du widget DPS Meter : boutons plus grands et plus faciles à cliquer, barre du boss et lignes des joueurs plus claires avec les icônes de classe.
- Nouveau : Vue du DPS moyen par classe dans le widget, depuis le bouton à côté du cadenas.

## 0.4.0

- Nouveau : Base de données : recherche, objets, PNJ et monstres avec leurs butins et un bouton Carte qui montre où ils se trouvent, quêtes, donjons, artisanat et compétences, avec les données du jeu.
- Nouveau : Gear Viewer avec les données du jeu.
- Nouveau : Minuteurs : 9 événements récurrents à ton heure locale, avec compte à rebours et son facultatif.
- Nouveau : Daevanion Planner : les plateaux Daevanion du jeu, choisis les nœuds et vois les statistiques et niveaux de compétence qu'ils donnent.
- Nouveau : Character Builder : statistiques de base, niveaux d'amélioration et une estimation du CP et du DPS du build.
- Modifié : PowerMeter est présenté partout comme un projet amateur non officiel fait pour la communauté d'Aion 2.
- Corrigé : le jeu est détecté de façon fiable quand il est lancé depuis Purple.
- Corrigé : le DPS et les dégâts ne deviennent plus négatifs avec des attaques multi-coups très puissantes.
- Corrigé : les soins d'un soigneur qui n'a pas encore utilisé de compétence dans le combat ne sont plus perdus.
- Corrigé : dans Mes personnages, cliquer sur un personnage ouvre directement son build dans le Character Builder.
- Corrigé : le Character Builder n'affiche plus de « j'aime » ni de réponses inexistants : un build part de 0.
- Corrigé : la fiche d'un monstre n'est plus vide, et le bouton Carte ouvre sa carte dans une fenêtre.
- Corrigé : Gear Viewer affiche chaque pièce une fois au lieu de deux.
- Corrigé : Donjons liste tous les donjons, chacun une fois.

## 0.3.9

- Modifié : Conditions mises à jour : dans Recluta et Daeva, la Base de données, le Gear Viewer, l’aide à l’artisanat et le calculateur sont inclus dès que les données officielles du jeu sont disponibles. Il vous sera demandé d’accepter à nouveau les Conditions.

## 0.3.8

- Retiré : Base de données, Gear Viewer, Armurerie, planificateur Daevanion, Artisanat, Calculateurs et Marché affichent « Données officielles à venir » jusqu’à ce que des données officielles du jeu soient disponibles.
- Retiré : le Character Builder garde les compétences, la description et les commentaires ; équipement, statistiques, Gear Score et collections reviendront avec les données officielles, et l’équipement enregistré dans vos builds a été effacé.
- Retiré : Builds de la communauté ne liste plus que vos propres builds ; les builds de la communauté, les favoris et les points d’apparition sur la carte ont disparu.
- Modifié : Faille spatio-temporelle et Festival Shugo n’affichent que les détails confirmés par NCSOFT ; le portail de la Faille reste ouvert 15 minutes.

## 0.3.7

- Modifié : Recluta, Daeva et l'essai gratuit fonctionnent sur 1 PC par compte, Empyrean sur 2 ; en passant à un abonnement avec moins de PC, les PC enregistrés en premier gardent l'accès.

## 0.3.6

- Corrigé : la page Supporter ne rend plus la fenêtre noire quand le panneau d'administration liste les utilisateurs ; si une page plante, elle affiche l'erreur avec Réessayer au lieu d'une fenêtre noire.

## 0.3.5

- Nouveau : les monstres situés dans un donjon affichent la carte du monde avec l'entrée du donjon et un lien vers celui-ci, et les monstres de la couche Illusion Curtain de Verteron apparaissent désormais sur la carte de Verteron.

## 0.3.4

- Nouveau : formules Soutien sur Patreon (Recluta 3 €, Daeva 7 €, Empyrean 15 € par mois). Le meter et la plupart des onglets restent gratuits ; Base de données, Rapport de combat, Journaux en ligne et Classements nécessitent Recluta, Groupe et rotations, Artisanat et Calculateurs nécessitent Daeva. Les onglets verrouillés restent dans le menu avec un cadenas et un aperçu flouté.
- Nouveau : essai gratuit de tout pendant 14 jours, une fois par compte Discord : connecte-toi avec Discord pour le démarrer.
- Nouveau : un abonnement fonctionne sur 2 PC maximum par compte (un PC libère sa place après 30 jours sans utilisation) et l'essai gratuit est unique par personne, lié au compte Discord et au PC.
- Nouveau : page Soutien : ta formule et son origine, lier ou délier Patreon, et les formules côte à côte.
- Nouveau : Builds de la communauté affiche les builds de la communauté depuis questlog.gg, avec des filtres par classe, tag, région et recherche ; ouvre n'importe lequel dans le Character Builder et duplique-le pour te l'approprier.
- Nouveau : les cartes de PNJ, monstres et donjons affichent une minicarte de leur emplacement, et les cartes de quête indiquent où se trouvent le donneur de quête, les cibles, le PNJ de remise et le donjon. Ajout des cartes de Poeta, Ishalgen, Eltnen et Morheim.
- Modifié : « Tes builds » ne liste que les builds que tu as créés ou dupliqués ; « J'aime » est désormais appelé « Favoris » et reste après un redémarrage.
- Modifié : les cartes ne chargent plus que la partie que tu regardes.

## 0.3.3

- Nouveau : les PNJ et monstres de la base de données affichent leurs points d'apparition sur la carte (Voir sur la carte), pour Verteron, Altgard et Reshanta.
- Modifié : le build principal est désormais propre à chaque personnage et non plus à chaque classe : deux personnages de la même classe ont un équipement séparé. Tant qu'un personnage ne modifie pas le sien, il part du build partagé précédent.
- Modifié : les cartes de Mes personnages affichent le Gear Score du build principal du personnage (possédé / objectif, les mêmes chiffres que le Character Builder) au lieu d'un CP toujours vide ; la barre du haut ne l'affiche plus non plus.
- Corrigé : un build ouvert depuis la carte d'un personnage utilise l'Arcana et le Daevanion de ce personnage, et non ceux du personnage actif.

## 0.3.2

- Corrigé : dans Mes personnages, toute la carte du personnage ouvre son build (avant, seul le nom le faisait, sans aucun indice visuel).
- Corrigé : le meter suit le personnage avec lequel vous jouez réellement, lu depuis le jeu ; rendre un personnage actif dans Mes personnages ne change plus le personnage suivi par le meter.

## 0.3.1

- Nouveau : Avant de commencer : les Conditions générales et la Politique de confidentialité complètes (anglais, italien, allemand, français, espagnol, portugais, russe) doivent être acceptées avant que PowerMeter ne lise la moindre donnée de combat. Les utilisateurs existants les acceptent une fois au prochain lancement.
- Modifié : « Ouvrir le widget » devient « Lancer le DPSMeter ».
- Modifié : les modes du meter s'affichent en BOSS, TRAIN, PVE, PVP, dans cet ordre, dans le meter, l'Historique des combats et les Paramètres.
- Modifié : cliquer sur le nom d'un personnage dans Mes personnages ouvre son build sans changer de personnage actif.
- Modifié : la fenêtre de mise à jour regroupe les notes de version par type (nouveau, modifié, corrigé) et se lit plus facilement.
- Corrigé : le Gear Viewer affichait la plupart des pièces en double (le même objet existe une fois par faction) ; chaque pièce n'apparaît désormais qu'une fois.
- Corrigé : l'en-tête du build affichait des compteurs de j'aime et de commentaires fictifs au lieu des vrais j'aime du build.

## 0.3.0

- Nouveau : Logs en ligne : les combats que vous avez envoyés, avec lien, visibilité modifiable (public, non répertorié, privé), vues, position au classement et suppression.
- Nouveau : Statistiques de classes : DPS moyen par classe sur chaque boss, classes les plus jouées et tendance hebdomadaire, à partir des logs publics de la communauté. Un même combat envoyé par plusieurs membres du groupe ne compte qu'une fois.
- Nouveau : Visionneuse d'équipement : toutes les pièces d'équipement avec filtres, recherche et statistiques triables. Sélectionnez des objets pour les épingler en haut ou les comparer, avec une flèche verte sur la meilleure valeur et une rouge sur la pire.
- Nouveau : Armurerie : recherchez des personnages par région, faction, serveur et classe, consultez les profils populaires, les classements et la fiche complète d'un personnage (EU/NA dès qu'ils seront disponibles).
- Nouveau : Festival Shugo : compte à rebours en direct jusqu'à la prochaine manche, ses mini-jeux, les manches suivantes et un planificateur de la boutique du festival avec les jetons qu'il vous manque.
- Nouveau : Faille spatio-temporelle : comptes à rebours du portail et de la faille, le planning sur 24 heures et l'itinéraire de votre faction.
- Nouveau : Calculateurs : statistiques et Gear Score d'une pièce entre deux niveaux d'amélioration avec la qualité du soul imprint, bonus des statistiques primaires et chances de Splendent d'une recette.
- Nouveau : Marché (remplace la Liste de courses) : recherche d'objets et liste de suivi ; prix, tendances et statistiques apparaîtront dès qu'une source de données de marché existera pour EU/NA.
- Nouveau : Artisanat étape par étape : chaque étape montre l'objet exact utilisé, les résultats Normal et Splendent et celui dont l'étape suivante a besoin ; au dernier palier, choisissez entre améliorer la pièce normale et fabriquer jusqu'à obtenir Splendent.
- Modifié : Flow Map est remplacée par le Festival Shugo ; Logs en ligne et Statistiques de classes expliquent à quoi elles servent.
- Corrigé : les ailes, titres et familiers de la base de données affichent leurs bonus.

## 0.2.14

- Nouveau : onglet PvE dans le meter pour le farm de mobs. Les dégâts s'additionnent sur tous les mobs touchés, même après leur mort, et se remettent à zéro après 5 minutes sans toucher de mob, au changement de zone ou avec Réinitialiser.
- Nouveau : Boss, PvE, Train et PvP sont séparés : chaque coup ne compte que dans l'onglet de son type de cible. Le widget affiche toujours ce qu'il enregistre (type et nom de la cible), et les combats enregistrés vont dans leur onglet, avec un filtre par mode dans l'Historique.
- Nouveau : Soins reçus par joueur (les siens et ceux des autres) et Aggro (coups reçus des mobs ; Templier et Gladiateur marqués TANK ; une estimation, indiquée comme telle, tant que les mobs n'ont touché personne).
- Nouveau : Artisanat : tous les objets fabricables avec les armes en premier, la chaîne d'amélioration du premier au dernier palier, l'arbre des recettes et les matériaux pour la quantité choisie avec Possédés et Manquants, enregistrés.
- Modifié : les dégâts sont affichés en entier partout (widget, fenêtre de détails, meter et rapport du tableau de bord), plus d'arrondi K/M.
- Corrigé : le meter ne s'arrête plus de compter quand un mob se déplace (il était pris pour un joueur), et l'onglet Boss n'affiche que les boss.
- Corrigé : verrouiller le widget ne vide plus la liste des joueurs ; Build et Lobby restent visibles une fois verrouillé.
- Corrigé : le widget affiche les icônes du build enregistré, même après l'avoir créé ou renommé.
- Corrigé : Envoyer dans le widget envoie le combat qui vient de se terminer, demande de se connecter avec Discord si besoin et prévient quand un combat d'entraînement ne peut pas être envoyé.

## 0.2.13

- Nouveau : les personnages ont une faction (Elyséen ou Asmodien). Choisissez-la en ajoutant un personnage, ou sur la carte d'un personnage existant ; elle apparaît sur l'Accueil et dans le Character Builder.
- Nouveau : le rapport de combat affiche vos combats enregistrés : tentatives sur le même boss, vue d'ensemble, compétences, graphique DPS, chronologie, dégâts subis, soins et Comparer. Cliquer sur un combat dans l'Historique ou sur l'Accueil l'ouvre dans le rapport.
- Nouveau : Exporter dans le rapport de combat enregistre le combat entier, qui peut être rechargé depuis Historique des combats → Envoyer → Depuis un fichier.
- Nouveau : l'Analyse de groupe affiche les joueurs, les compétences et les rotations d'ouverture de votre dernier combat.
- Modifié : toutes les données d'exemple ont été supprimées avant le lancement. Les pages qui n'ont encore rien à afficher (classements, builds de la communauté, commentaires, actualités, activités, soins et aggro du meter, lobby du widget) affichent un état vide.
- Modifié : Partager ne donne qu'un vrai lien, une fois le combat envoyé depuis l'Historique.
- Modifié : les réglages pas encore disponibles sont désactivés et marqués « Bientôt disponible ».
- Corrigé : l'équipement de votre build principal enregistré dans les versions précédentes est conservé.

## 0.2.12

- Nouveau : Envoyer dans l'historique des combats ouvre une fenêtre pour envoyer les combats sélectionnés ou un fichier enregistré avec Exporter, et permet de se connecter avec Discord depuis là.
- Nouveau : renommez une build que vous avez créée ou clonée et enregistrez-la ; boutons Modifier et Supprimer sur vos builds, avec une fenêtre de confirmation.
- Nouveau : les stats des ailes affichent les bonus de l'aile équipée en plus de ceux de la collection.
- Modifié : les ailes, titres et familiers qui ne donnent aucune stat sont de nouveau listés, après les autres, marqués "Aucune stat".
- Modifié : Vos builds ne liste que les builds que vous avez créées ou clonées.
- Corrigé : Télécharger Npcap relance l'installateur (il demande maintenant les droits administrateur au lieu d'échouer silencieusement).

## 0.2.11

- Nouveau : les stats du Character Builder sont réelles et en direct : stats de base de la classe, équipement (pierres de mana et tous les autres emplacements), Daevanion, collections et titres, calculées comme le fait questlog. La vue Cible affiche le changement sur chaque stat.
- Nouveau : collections Pantheon, Arcana et Genus Insight, avec leurs stats dans le builder.
- Nouveau : les compétences et quêtes de la base de données affichent la fiche en anglais et, en dessous, la même fiche dans votre langue (l'italien est une traduction non officielle).
- Nouveau : supprimez les builds que vous avez créées ou clonées ; vos builds et vos nœuds de Daevanion sont conservés après un redémarrage.
- Nouveau : nouvelle icône Windows.
- Modifié : le Gear Score est calculé comme le fait questlog (enchantement, percée, pierres de mana, théopierre, Arcana, points de Daevanion).
- Modifié : une build ne peut être clonée que sur un personnage de la même classe.
- Modifié : un seul bouton Retour : vers la build depuis Pièces manquantes, vers le Character Builder partout ailleurs.
- Corrigé : Envoyer dans l'historique des combats envoie les combats sélectionnés.
- Corrigé : les ailes et titres équipés donnent leurs bonus ; les ailes et titres sans stats ne sont plus listés ; la puissance de vol n'est plus gonflée.
- Corrigé : l'apparence de gantelet et les ailes du Brawler sont masquées jusqu'à la sortie du Brawler en EU/NA.

## 0.2.10

- Nouveau : collections dans le Character Builder (apparences, familiers, ailes, monolithe, titres) avec leurs vrais totaux de stats ; un nouveau personnage part de 0. Genus Insight, Pantheon et Arcana arrivent dans une mise à jour dédiée.
- Nouveau : vraies stats d'objets dans le Character Builder (base, enchantement, percée, lignes d'empreinte d'âme), vraies pierres de mana, théopierres et pierres philosophales, et Gear Score calculé à partir de vos pièces.
- Nouveau : depuis une fiche objet, Ajouter à la build le place dans votre équipement actuel et Ajouter à l'objectif dans votre équipement cible.
- Nouveau : Comparer et Exporter dans le rapport de combat ; Exporter dans l'historique des combats.
- Modifié : l'emplacement de main secondaire est la Guard pour toutes les classes ; le curseur Potentiel a été retiré ; la Combat Power n'est plus affichée avec des chiffres inventés.
- Corrigé : le widget de build affiche les icônes des objets.
- Corrigé : Pièces manquantes compte tous les emplacements (bracelets compris) ; Actuel affiche vide une build vide ; Retour à la build ramène à la build sur laquelle vous travailliez.
- Corrigé : les barres de soins, dégâts subis et cibles du rapport de combat sont à l'échelle du combat entier, et le compteur de tentatives change d'une tentative à l'autre.
- Corrigé : les portraits de Build community montrent le visage du personnage.

## 0.2.9

- Nouveau : toute la base de données du jeu est dans l'app (objets, PNJ, quêtes, donjons, compétences, recettes, titres, succès, familiers, ailes et plus) avec de vrais détails, des liens entre fiches et la recherche Ctrl+K.
- Nouveau : onglet PvP dans le DPS Meter : les dégâts infligés par vous et votre groupe aux autres joueurs.
- Nouveau : Character Builder refait : chaque emplacement ne propose que les objets de son type, curseurs et menus de stats fonctionnels, équipement actuel et cible réels, pièces manquantes, Comparer, Widget et Partager (Discord).
- Nouveau : Build community affiche 12 builds par page ; Vos builds et Aimées fonctionnent.
- Modifié : le fichier du programme s'appelle désormais PowerMeter.exe.
- Modifié : la puce du personnage en haut est un simple bouton qui ouvre Mes personnages.
- Corrigé : l'export des personnages enregistre le fichier dans Téléchargements.
- Corrigé : chaque onglet du rapport de combat (chronologie des compétences et buffs, dégâts subis, soins, cibles) suit l'intervalle sélectionné.
- Corrigé : l'équipement par défaut et les listes de builds suivent la classe de votre personnage.

## 0.2.8

- Nouveau : Mes personnages fonctionne : ajoutez, importez, exportez, dupliquez et supprimez des personnages, et choisissez le personnage actif. Changer de personnage met à jour tout le tableau de bord (builder, Skill Planner, Daevanion).
- Nouveau : le Daevanion Planner affiche les vrais plateaux de la classe de votre personnage.
- Nouveau : vraies icônes d'objets dans le builder, les fiches objet, la recherche et l'accueil.
- Nouveau : carte du monde interactive avec de vrais marqueurs (données : aion2-interactive-map, CC BY-NC 4.0).
- Nouveau : choix des tags à la création d'une build.
- Modifié : les onglets du DPS Meter sont désormais Boss, Train et PvP.
- Modifié : seules EU et NA sont affichées ; le Brawler est masqué jusqu'à sa sortie en Occident.
- Corrigé : changer d'onglet dans le DPS Meter ne revient plus sur Boss.
- Corrigé : sélectionner un intervalle dans le rapport de combat met à jour les statistiques en dessous.
- Corrigé : les onglets et filtres des classements et les numéros de page de Build community fonctionnent.

## 0.2.7

- Corrigé : les notes de version de la fenêtre de mise à jour s'affichent désormais dans la langue choisie pour PowerMeter.
