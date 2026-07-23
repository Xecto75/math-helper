# Résumé pour le prochain agent — math-engine

*Remplace le HANDOFF précédent (traduction, `valueRefs.js`, exercices, pagination set-layout — toujours vrai, voir section dédiée en bas). Cette session a été une longue suite d'allers-retours en direct avec l'utilisateur sur le générateur IA, le Lesson Builder, et surtout le moteur graphique (Desmos) — beaucoup de bugs sournois trouvés en testant réellement, pas en devinant.*

## ⚠️ État git — RIEN n'est commité
`git status --short` avant de commencer. ~37 fichiers modifiés + 3 nouveaux (`ExercisePanel.jsx`, `SliderPanel.jsx`, `valueRefs.js`). L'utilisateur n'a jamais demandé de commit — ne pas commiter sans demande explicite.

## Tempérament de l'utilisateur (Xecto75) — À LIRE AVANT DE TOUCHER QUOI QUE CE SOIT
- Très direct, régulièrement vulgaire/hostile quand frustré ("bro just give me the json", "you fucking idiot", "how can you be so shit") — jamais personnel, c'est la frustration face à un bug qui persiste après un "fix" précédent. Répondre par des actions concrètes (tester en direct, tracer le vrai code) plutôt que des justifications.
- **Presque toujours dans le vrai quand il insiste** après un "c'est fixé" de ma part qui s'avère faux — voir la section "Bugs trouvés" plus bas : plusieurs fois cette session, ce que je pensais corrigé ne l'était pas complètement (couleurs par défaut oubliées ailleurs, findIntersections qui ne trouvait plus rien). Quand il revient sur un sujet "déjà fixé", **retester en direct plutôt que de répéter l'explication précédente**.
- Règle de couleur explicite et non-négociable : **la couleur par défaut de TOUT ce qui peut être coloré doit être le bleu réservé `#60a5fa`** (`SYS.blue` dans `palette.js`, commenté "reserved — polygon fill, axis, arcsin and system UI") — sauf si une raison précise justifie une autre couleur par défaut (ex. highlight = jaune, distinction de deux catégories dans une même animation). Ne pas confondre avec `PALETTE.purple`/`red` etc. qui restent disponibles quand l'utilisateur choisit explicitement.
- Déteste le scope creep, mais **une règle donnée une fois s'applique PARTOUT où elle s'applique** — appliquer une correction à un seul endroit puis se faire reprendre parce qu'un autre endroit avec le même défaut existe encore est arrivé plusieurs fois ce tour-ci (voir couleurs par défaut). Faire un grep large (`#f87171`, `[248, 113, 113]`, `#a855f7`, etc.) avant de déclarer une règle de couleur "appliquée".
- Quand il donne un JSON de leçon cassé et demande "so will this work?", il veut une analyse précise ligne par ligne, pas une réponse générique. Quand il dit juste "bro just give me the json" après une explication déjà donnée, il veut le JSON corrigé directement, sans réexpliquer.
- A demandé explicitement : ne pas relancer une explication qu'on a déjà donnée si le bug revient — retracer avec `console.log`/`console.trace` temporaire, montrer la preuve, puis conclure. Il a lui-même proposé un mécanisme de fix pour le bug de sliders (voir plus bas) qui s'est avéré être la bonne piste.
- Toutes les instructions/questions peuvent arriver en français — répondre dans la langue utilisée, MAIS tout le contenu de leçon et l'UI restent en anglais (règle mémoire `feedback_no_narration_english_only`).

## Pièges d'environnement (toujours vrais, déjà documentés en mémoire)
- **`document.visibilityState` bascule sur `"hidden"` aléatoirement**, gelant les animations CSS de montage et parfois `computer{screenshot}` (timeout). Contournement : préférer l'inspection DOM/JS (`javascript_tool`, `read_page`, `get_page_text`) aux screenshots — beaucoup plus fiable dans cet environnement.
- **Le port réel du serveur preview varie** (5173 si libre, sinon 5174...). Toujours lire `preview_logs` pour le port RÉEL avant de naviguer — `preview_start` peut annoncer un port qui n'est plus le bon si Vite retombe sur un autre.
- **`resize_window` peut casser le rendu de la Browser pane** de façon persistante pour le reste de la session (l'app se retrouve confinée dans un minuscule rectangle en haut à gauche, `screenshot` devient quasi inutilisable même après reload) — évité cette session en évitant `resize_window` sauf nécessité absolue, et en se rabattant sur l'inspection DOM/JS si ça arrive.
- **`localStorage` garde des overrides d'exemples périmés** (`math-engine-ex-overrides`) — toujours faire `localStorage.removeItem('math-engine-ex-overrides')` avant de tester un exemple via l'onglet "Examples".
- **Vite peut perdre la connexion HMR en plein test** ("server connection lost. Polling for restart...") suite à mes propres édits de fichiers pendant qu'un test tourne — si un résultat de test paraît incohérent (page vide, rien ne s'affiche), refaire un `navigate force:true` complet et retester avant de creuser plus loin — ça a fait perdre du temps au moins deux fois ce tour-ci.
- **Les inputs texte contrôlés par React (Lesson Builder, Preview textarea) nécessitent le pattern natif-setter + `dispatchEvent`** pour être détectés par React (`Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set`) — un simple `.value = x` ne déclenche PAS le `onChange`, le bouton "Save"/"Apply" reste désactivé silencieusement. Toujours vérifier après coup (ex. lire le texte du bouton "· edited" ou `disabled` state) plutôt que de supposer que ça a marché.
- **Règle de test** (mémoire) : ne jamais éditer `builtinLessons.js`/`exampleLessons.js` "pour tester" — utiliser le Lesson Builder UI, ou coller du JSON dans l'onglet "Preview" (le plus rapide et fiable pour construire des scripts de test à plusieurs steps via JS direct sur le textarea).

---

## Ce qui a été fait cette session (dans l'ordre)

### 1. Classificateur "off-topic" pour le générateur IA (2 requêtes)
Le router (request 1, haiku) répond maintenant `{"status":"ok"|"off-topic"|"clarify"|"trivial", ...}` au lieu de juste `{"modules":[...]}`. Si `status !== 'ok'`, la request 2 (génération, sonnet) ne part jamais — économie de coût + réponse instantanée. Câblé dans `server.js`, `moduleCatalog.js` (prompt du router), `generateLesson.js` (transforme en erreur affichée via `aiError` existant, pas de nouveau composant).

### 2. Lesson Builder — le "+" entre les steps ne faisait RIEN de visible
Cliquait sur "+" changeait silencieusement la cible d'un dropdown "Add function" tout en bas, sans aucun feedback. Le "+" devient maintenant lui-même un `<select>` inline au clic (`LessonBuilder.jsx` — `InsertDivider`, `fnPickerOptions` partagé). `addFnStep` prend maintenant l'index cible en paramètre explicite au lieu de lire un état partagé (`insertAfterIdx`) potentiellement périmé.

### 3. Nouveau layout `grid-equation` (Table + Equation)
N'existait pas — seulement Table+Graph, Geo+Equation, Graph+Equation. Ajouté partout : `App.css` (CSS côte-à-côte), `LessonBuilder.jsx` (dropdown + `isFuncCompatible`), `server.js` (code compact `qe`), `moduleCatalog.js`.

### 4. Row highlighting pour les tables (`tab-highlight-row` / `tab-clear-row-highlight`)
N'existait pas du tout. Une seule barre de highlight par grille — un second appel la fait juste glisser vers la nouvelle ligne (pas besoin de clear entre chaque). Stack complet : `TableDisplay.jsx` (state + animation), `tableEngine.js`, `demoScripts.js`, `ActionExecutor.js`, `App.jsx`, `functions.js`. Utilisé pour reconstruire l'exemple "Correlation" (page 3) avec une vraie dérivation pas-à-pas synchronisée table+équation.

### 5. Labels de points (`showCoords`) — plusieurs itérations, la bonne solution est SIMPLE
Bug historique : positionnement radial depuis l'origine (`numX*1.4`), scatter total pour un point loin de l'origine. **Deux tentatives de fix ratées** avant la bonne :
- `labelOrientation: 'top_right'` → valeur invalide pour Desmos, retombe silencieusement sur son propre placement anti-collision (= le même scatter qu'avant).
- Point fantôme décalé + `labelOrientation:'right'` en plus → cumul des deux décalages, labels beaucoup trop loin du point.

**Solution finale, testée et fiable** : `labelOrientation: 'right'` SEUL sur le point lui-même (pas de point fantôme). Résultat vérifié : +10px à droite, parfaitement centré verticalement, identique sur tous les points testés. Ne pas re-complexifier ça sans une vraie raison.

### 6. Bug des sliders qui persistent entre pages/leçons — beaucoup de temps passé, statut incertain
Plusieurs correctifs appliqués (`pruneOrphanSliders` dans `desmosEngine.js` — resynchronise `sliders` avec l'union des `|name|` de tous les `fn::` actuellement enregistrés, appelé après chaque `plotFunction`/`removeFunction`). **Mais** : à chaque reproduction en direct que j'ai tentée (page→page dans une leçon, dots de pagination, changement de leçon complet via la Library, avec `console.trace` sur `clearAll`/`registerSlider`), le clear s'est TOUJOURS montré correct — `sliders` avant clear contenait bien les anciens noms, et 0 slider après. Le trace a été retiré après vérification.
**Si ça revient** : redemander à l'utilisateur la séquence de clics EXACTE (quel bouton, quelle page, dans quel ordre) plutôt que de re-deviner. Le point faible le plus probable si ça persiste : un scénario que je n'ai pas testé (HMR en dev, ou un chemin de navigation spécifique non couvert par `buildPage`/`handleLessonNav`/`handlePlayLesson`/`navigateToSegment`).

### 7. Badge d'équation live (auto, PAS une fonction séparée)
Première version : fonction séparée `showLiveEquation`/`hideLiveEquation` à ajouter manuellement. **L'utilisateur a explicitement rejeté ce design** ("it shouldn't be a function") — supprimée entièrement (catalogue, demoScripts, ActionExecutor, App.jsx, compact codec). Remplacé par un comportement automatique dans `plotFunction` : présence de `|name|` sliders → badge affiché ; absence → pas de badge, pas d'étape à retenir. Badge positionné en bas du graphe (demande explicite), même couleur que la courbe, re-render à chaque drag de slider (`onSliderChange`).

### 8. `graph-best-fit-line` (nouvelle fonction) — régression linéaire par moindres carrés
`pointIds` vide = utilise TOUS les points actuellement placés (demande explicite, pas juste "ne fait rien"). Ligne pointillée par défaut pour la distinguer des données. Enregistrée dans le même namespace `fn::` que `plotFunction` (participe à `ensureVisible`, `[id]expr`, etc.).

### 9. Bouton pan/zoom sur chaque graphe (coin haut-droit)
✋ = déverrouille `lockViewport` de Desmos + neutralise l'overlay bloquant les clics (`pointerEvents:none`). Sauvegarde le viewport avant. 🔒 = reverrouille + anime le retour exact au viewport sauvegardé. Auto-reset (via `onGraphClear`) si l'utilisateur quitte la page sans reverrouiller — sinon le viewport sauvegardé devient périmé et "verrouiller" sauterait à la mauvaise vue sur la page suivante.
**Effet de bord demandé et traité** : pendant le mode interactif, les lignes de connecteur des commentaires liés à un élément du GRAPHE (pas table/geo/equation) s'estompent (le commentaire lui-même reste visible) — `onGraphInteractiveChange` dans `desmosEngine.js`, consommé par `CommentLayer.jsx`.

### 10. Sweep complet des couleurs par défaut → bleu réservé
Après le signalement initial (header de table en violet), grep large sur `#f87171`/`[248,113,113]`/`#a855f7` a révélé le même problème à de nombreux endroits : `addPoint` (sans funcId), `addHorizontalLine`, `drawVector`, `batchAddPoints`, `bestFitLine`, `findIntersections`, `geo-add-text`, `divideSegmentGraph`, `geometryEngine.addText`, `cmt-grid`, `cmt-geo`. Tous passés à `#60a5fa`/`[96,165,250]`. **Pas touché** (intentionnel, pas des "défauts") : chrome UI (boutons d'erreur/suppression), couleurs de carte de leçon dans la Library, palettes multi-couleurs délibérées (confettis, roues de couleur), distinction degré+/degré- dans l'animation de combinaison de termes.

### 11. Bug de type array/string sur les couleurs (`rgbToHex`)
`rgbToHex([r,g,b])` déstructure un ARRAY ; `resolveColor(name)` retourne une STRING hex. Passer une string résolue à une fonction qui fait `rgbToHex(opts.color)` sans vérifier le type donne un résultat silencieusement faux (ex. `'#22c55e'` déstructuré en `['#','2','2']`). Trouvé et corrigé dans `findAndMarkIntersections` et `plotBestFitLine` — pattern de garde repris de `addPoint` : `Array.isArray(opts.color) ? rgbToHex(opts.color) : opts.color`.

### 12. Équations en forme générale (`-6x+3y=12`) — `makeEval` était aveugle à ça
`makeEval` coupait toujours au premier `=` et gardait la partie droite comme `f(x)` — marche pour `y=-x+3`, casse silencieusement pour toute équation où `y` n'est pas isolé seul à gauche (soit ça jette une variable réellement utile, soit ça laisse un `y` non déclaré qui fait planter l'éval à chaque appel, avalé par un try/catch). Ajout de `makeImplicitEval` : pour une ligne (linéaire en y), résout `y` à partir de deux échantillons du résidu LHS−RHS (`y=0` et `y=1`) — aucune algèbre de chaînes nécessaire. `makeEval` route automatiquement vers ça quand le côté gauche n'est pas déjà isolé (`isIsolatedLhs`). Bénéficie à TOUS les appelants existants (intersections, racines, tangentes, labels), pas juste au cas signalé.

### 13. `findIntersections` — la recherche dépendait de la caméra courante (bug réel, pas lié à mes changements)
La plage de recherche = viewport actuel ± 20%. Si la caméra avait déjà été auto-cadrée sur une plage étroite (`ensureVisible` sur les labels des courbes) AVANT que `findIntersections` tourne, une intersection réelle pouvait tomber hors de portée → 0 point trouvé, silencieusement. Trouvé en traçant en direct (`pts:[]` alors que le calcul manuel donnait un vrai point). Fix : recherche sur une plage FIXE généreuse (`max(span courant, 60)`, centrée sur le viewport courant), indépendante de la caméra. **Deuxième moitié du même bug** : même une fois trouvé, le point n'était jamais inclus dans `getVisibilityAnchors()` (pas de préfixe `int::` géré) — la caméra ne se déplaçait jamais pour le montrer. Les deux corrigés ; `int::` stocke maintenant les points bruts pour ça.
Au passage : couleur par défaut → bleu, nouveau paramètre `hideLabel` (coordonnées affichées par défaut, comme demandé).

### 14. Pagination `set-layout` — continuation au lieu de rejouer toute la page
Le design initial (session précédente) rejouait TOUJOURS depuis le step 0 à chaque changement de segment, même en avançant naturellement d'un cran — demande explicite de la session précédente pour que sauter directement à un point de pagination reste correct, mais ça rendait la navigation séquentielle normale lente et "recommence tout à chaque fois". Nouveau comportement (`navigateToSegment` dans `App.jsx`, utilisé par `handleLessonNav` ET le clic direct sur un dot) : avancer d'exactement un cran VERS le segment suivant DE LA MÊME PAGE (même référence `pg`) continue sans clear (`startFromStep` = où le segment précédent s'est arrêté, `clearCanvas:false`) — anime juste le changement de layout puis enchaîne. Tout le reste (arrière, saut de plusieurs segments, page différente) garde le replay complet déterministe d'avant. Vérifié en direct dans les deux sens, aucune erreur.

---

## Bugs connus, PAS corrigés (mentionnés à l'utilisateur, hors scope ou pas assez d'info)
- Persistance des sliders : voir section 6 — correctifs appliqués mais pas de reproduction en direct obtenue pour confirmer 100%. Redemander une séquence de clics exacte si ça revient.
- Parseur : toujours pas de support pour `baseˣ` (exposant variable) — pré-existant, non touché.
- `eq-replace-variable` ne fait QUE des substitutions numériques (ou `[id]v`), jamais d'expression algébrique (`y=-x+3` ne peut pas être injecté tel quel) — pas un bug, une limite du moteur. Pour une vraie substitution symbolique (méthode de substitution en systèmes d'équations), l'auteur doit taper l'équation déjà substituée via un nouveau `eq-create`, comme le fait l'exemple intégré "System by Substitution".

## Ce qui reste vrai des sessions d'avant (non re-vérifié mais non touché)
- Système de références `[id]token` (`valueRefs.js`), `eq-save-result`/`[name]v` pour faire persister une valeur numérique au-delà d'un `eq-create` suivant.
- Pages d'exercice, traduction complète anglais, cohérence des animations d'algèbre classique.
- Bugs non corrigés de longue date : `-3x=5` gelé, `x²/4=9` isole mal, `(x+3)(2x+1)=0` pas supporté.
