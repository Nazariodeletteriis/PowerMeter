# Changelog (fr)

Translation of CHANGELOG.md: same `## <version>` sections and bullets.

## 0.3.4

- Nouveau : formules Soutien sur Patreon (Recluta 3 €, Daeva 7 €, Empyrean 15 € par mois). Le meter et la plupart des onglets restent gratuits ; Base de données, Rapport de combat, Journaux en ligne et Classements nécessitent Recluta, Groupe et rotations, Artisanat et Calculateurs nécessitent Daeva. Les onglets verrouillés restent dans le menu avec un cadenas et un aperçu flouté.
- Nouveau : essai gratuit de tout pendant 14 jours, une fois par compte Discord : connecte-toi avec Discord pour le démarrer.
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
