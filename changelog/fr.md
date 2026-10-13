# Changelog (fr)

Translation of CHANGELOG.md: same `## <version>` sections and bullets.

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
