# Résumé pour le prochain agent — moteur d'équations (math-engine)

## Contexte général
L'utilisateur (Xecto75) est très exigeant sur la cohérence visuelle et déteste les "bandaid fixes" spécifiques à un cas. Sa demande centrale cette session : **un seul système générique** qui résout N'IMPORTE QUELLE équation (algèbre simple, parenthèses, fractions, quadratique) de la même façon, avec des animations qui ont l'air délibérées, jamais abruptes. Il teste TOUJOURS lui-même en live et corrige au pixel près — s'attendre à des allers-retours fins sur le timing.

**Règle de test (mémoire) : ne JAMAIS éditer `builtinLessons.js`/`exampleLessons.js` pour tester.** Utiliser le Lesson Builder UI (bouton "Lesson Builder" → "+" → choisir layout → `ADD FUNCTION` → `eq-create` avec le texte d'équation, puis `eq-full-solve`). Les variables remplaçables s'écrivent `|B|`, `|h|`, etc.

## Ce qui a été construit : le système d'arbre d'expression générique

### Nouveau fichier : `src/engine/exprTree.js`
Remplace l'ancien modèle `.factors` / `.isFraction`+`numeratorTerms`/`denominatorTerms` par un vrai arbre :
- Nœuds : `num(v)`, `label(name)`, `bin(op, a, b)`, `pw(base, exp)`, `sqrtN(arg)`, `negN(arg)`, `pm(a, b)` (le "±" de la formule quadratique — ne devient JAMAIS "ready" seul, c'est un choix de branche, pas une opération).
- `findReady(tree)` : trouve l'opération la plus profonde/à gauche prête à être évaluée (les deux opérandes sont des `num`) — **cette seule fonction EST l'ordre des opérations** (parenthèses = imbrication, priorité */ sur +- vient de la construction de l'arbre par le parser).
- `applyReady(node)` : mute le nœud EN PLACE (même `id`) en `{t:'num', v:résultat}` — permet à React/GSAP de réutiliser le même élément DOM.
- Un `num` égal exactement à `Math.PI` (`substitutePi` dans `parseEquation.js` remplace "pi"/π par ce littéral AVANT le parsing) est traité comme "pas encore révélé" — `findReady` le retourne en premier, `applyReady` l'arrondit à 4 décimales. C'est CE mécanisme qui fait apparaître π puis le transforme en 3.1416 comme première étape.
- `substituteLabel`/`collectLabels`/`collectLabelNodeIds` : pour `eq-replace-variable`.
- `findPm`/`choosePmBranch` : résolution du ± en + ou − **en place** (mêmes enfants, même id) pour que x₁/x₂ continuent EXACTEMENT où la formule générale s'est arrêtée, au lieu de tout re-dériver depuis Δ.
- `parseTermExpr(content, labels)` : parseur récursif-descendant (addSub > mulDiv > pow > atom) qui construit l'arbre pour tout contenu contenant `(`, `/`, `*` — `needsExprTree(content)` décide si un terme a besoin de l'arbre ou reste sur le chemin simple (algèbre classique, inchangé).

### Parser (`parseEquation.js`)
`parseRichSide` route désormais tout terme "complexe" vers `parseTermExpr` au lieu des anciennes regex de détection de produits/fractions (supprimées). Les termes simples (`3x`, `5`, `|a|`) restent sur l'ancien chemin `parseRichAtom` — **l'algèbre simple n'a pas été touchée**.

### Rendu (`TermCell.jsx`)
`ExprNode`/`ExprLeaf`/`ExprTerm` : **chaque nombre est sa propre pastille `.term-cell` bordée** (jamais regroupées dans une seule boîte). Les opérateurs/parenthèses sont du texte neutre non-encadré (`.expr-group`, `.pg-open`/`.pg-close`). Les parenthèses ont été agrandies (3em normal, 5.5rem en layout `single-equation`). Une fraction top-level (`bin('/', ...)`) s'affiche en pile num/barre/dénom, sans boîte autour de l'ensemble.

### Solveur générique (`ActionExecutor.js`, case `full-solve-current`)
Boucle unique : `findReady` → animation → `applyReady` → répète, jusqu'à obtenir un nombre pur, qui est ensuite replié dans un terme MathObject normal (alimente combine/send/divide de l'algèbre classique sans changement).

**Dispatch par opérateur** (jamais par forme d'équation) :
- `+`, `−`, `÷` → `combineReveal`
- `×` → `countUpReveal` (voir plus bas)
- opération unaire (racine, exposant, révélation de π) → `revealStep` (ancien système, fade simple, inchangé)

**`flyTogether(anchor, secondary)`** — partagé par tous les combos binaires :
1. Surligne les DEUX opérandes en bleu.
2. Choisit l'ancre (le premier opérande), l'entoure d'un anneau bleu.
3. Le second opérande (et l'opérateur juste devant, ex "+") **rétrécissent (width/padding/margin → 0) ET se déplacent vers l'ancre ET fondent, dans le MÊME tween** — toujours dans le flux flex normal, **aucun ghost/clone/reparenting**. Les voisins (ex. la parenthèse fermante, "×3") glissent tout seuls car c'est un vrai rétrécissement animé, pas une suppression instantanée.

**`settleAfterMerge`** — après la fusion, 5 temps bien distincts et volontairement espacés (l'utilisateur veut des pauses visibles, pas tout en même temps) :
1. (fait dans flyTogether) le second opérande arrive et disparaît
2. L'ancre devient la nouvelle valeur **instantanément**, avec un pop — rien ne doit se passer AVANT ce changement de valeur (règle stricte de l'utilisateur)
3. Après une pause, la couleur repasse de bleu à blanc
4. Après une autre pause, les parenthèses/opérateurs restants fondent (opacité seule, gardent leur place)
5. Après une dernière pause, cet espace vide se referme (largeur → 0), les voisins glissent pour combler

**Piège technique important** : le vrai commit React (`applyReady` + `flushSync(setState(...))`) n'arrive qu'À LA FIN de `settleAfterMerge`, une fois que tout est déjà visuellement en place (texte de l'ancre déjà mis à jour via `anchor.textContent = ...` en manipulation DOM directe AVANT le commit React). Comme ça, le vrai swap React est invisible — aucun saut.

**`countUpReveal`** (×) : après `flyTogether`, au lieu de pop direct, compte visuellement par incréments (ex. 4×10 → 10,20,30,40) avant le pop final — repli sur pop simple si pas d'entiers ou trop d'étapes (>12).

## Bugs réels trouvés et corrigés cette session (pas des "faux positifs")
1. **`getComputedStyle()` retourne un objet LIVE** — le lire APRÈS un `appendChild`/reparenting donne la valeur post-reparent, pas celle capturée avant. A cassé la taille de police d'un chip lifté. Toujours extraire en string AVANT de reparenter.
2. **`appendChild` relance une animation CSS `@keyframes`** (le mount `termEnter`) — la même raison pour laquelle `combineTerms` (algèbre classique) fait déjà `el.style.animation = 'none'` avant de lift. Oublié dans la première version du nouveau code, corrigé.
3. Geler la largeur du parent pour "empêcher" le reflow pendant le vol était la MAUVAISE approche (ça causait un reflow instantané non animé au moment du dégel) — la bonne approche est de LAISSER flexbox reflow tout seul en animant `width`/`padding` vers 0, jamais geler.

## Autre travail cette session (avant le rework de l'arbre)
- Quadratique (`solveScript.js`) : Δ = b²-4ac et x = (-b±√Δ)/2a s'affichent maintenant SYMBOLIQUEMENT (vraies lettres a,b,c,Δ) avant substitution des vrais nombres — même logique partout, plus de saut direct aux nombres.
- Le "0" littéral d'un côté (`x²-5x+6=0`) n'est plus déplacé inutilement (`solveScript.js`, filtre `t.value !== 0`).
- Highlight du résultat final : boîte dimensionnée au contenu réel de l'équation (via `equationRef.getCellRects`), coins à 13px (comme un term-cell), pas un pilule pleine largeur. Les DEUX côtés de l'équation passent en bleu (pas juste le résultat).
- Couleur de base des commentaires : bleu réservé (`#60a5fa`) au lieu de violet, partout (`demoScripts.js`, `functions.js`, `CommentLayer.jsx`, `ActionExecutor.js`).
- Mesures 3D : lignes toujours en pointillés (jamais solides), rayon du cercle plus gros, hauteur affichée à droite de la ligne pointillée.

## Environnement de preview — PAS un bug de code
Le navigateur de preview se bloque régulièrement en `document.visibilityState === 'hidden'`, ce qui gèle complètement le ticker GSAP (`gsap.globalTimeline.time()` reste à 0) et même les captures d'écran. **Vérifié indépendamment du code.** Solution : `preview_stop` puis `preview_start` (parfois 2-3 fois). Ne pas perdre de temps à déboguer le code si l'équation reste figée sur son état initial ET que `document.visibilityState === 'hidden'`.

## Ce qui reste ouvert / pas fait
- **Division (`/`)** réutilise `combineReveal` (fly+pop simple) — l'utilisateur a dit "you decide, it will probably be shit" donc pas de traitement spécial demandé, mais si on cherche de la cohérence supplémentaire c'est le seul opérateur binaire sans animation dédiée.
- L'algèbre classique (`combineTerms`/`sendToOtherSide` dans `solveScript.js`/`ActionExecutor.js`) n'a PAS été touchée par ce rework — elle reste un système à part, qui marchait déjà bien selon l'utilisateur ("algebra its fine").
- Code mort restant : les branches `.isFraction`/`.factors` dans `TermCell.jsx` et les champs correspondants dans `MathObject.js`/`EquationState.js` ne sont plus jamais produits (tout passe par `.expr` maintenant) mais n'ont pas été supprimés — risque faible de les enlever, pas fait par prudence/temps.
- Pas de vérification poussée sur des équations à 3+ termes dans une même somme (le système reste binaire par construction de l'arbre, donc `3+4+5` devient `(3+4)+5` puis se résout en deux étapes binaires — pas testé explicitement mais devrait marcher par construction).
