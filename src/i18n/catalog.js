// Content strings that used to be hardcoded inside view components: tool cards,
// grade names, stat labels, plan features.
//
// Deliberately KEY-MAJOR (one concept per row, all languages on that row)
// rather than language-major like uiText.js. With six languages, a
// language-major block makes a missing or misaligned entry invisible — you'd
// have to count down two lists to notice. Here a gap is visible on the line
// itself, and `tr` falls back to English per key rather than per whole group.

export const CAT_LABELS = {
  nombres:    { en: 'Numbers & Operations', fr: 'Nombres et opérations', de: 'Zahlen & Rechnen',       es: 'Números y operaciones', it: 'Numeri e operazioni',  pt: 'Números e operações' },
  mesures:    { en: 'Measurements & Time',  fr: 'Mesures et temps',      de: 'Maße & Zeit',            es: 'Medidas y tiempo',      it: 'Misure e tempo',       pt: 'Medidas e tempo' },
  geometrie:  { en: 'Geometry',             fr: 'Géométrie',             de: 'Geometrie',              es: 'Geometría',             it: 'Geometria',            pt: 'Geometria' },
  algebra:    { en: 'Algebra & Equations',  fr: 'Algèbre et équations',  de: 'Algebra & Gleichungen',  es: 'Álgebra y ecuaciones',  it: 'Algebra ed equazioni', pt: 'Álgebra e equações' },
  graphiques: { en: 'Graphs & Functions',   fr: 'Graphiques et fonctions', de: 'Graphen & Funktionen', es: 'Gráficas y funciones',  it: 'Grafici e funzioni',   pt: 'Gráficos e funções' },
}

export const TOOL_NAMES = {
  'numbers':        { en: 'Digits',         fr: 'Chiffres',      de: 'Ziffern',            es: 'Dígitos',              it: 'Cifre',                  pt: 'Dígitos' },
  'mult':           { en: 'Times Table',    fr: 'Table de mult.', de: 'Einmaleins',        es: 'Tabla de multiplicar', it: 'Tabelline',              pt: 'Tabuada' },
  'mdas':           { en: 'Order of Ops',   fr: 'Priorités',     de: 'Rechenreihenfolge',  es: 'Orden de operaciones', it: 'Ordine delle operazioni', pt: 'Ordem das operações' },
  'fractions-tool': { en: 'Fractions',      fr: 'Fractions',     de: 'Brüche',             es: 'Fracciones',           it: 'Frazioni',               pt: 'Frações' },
  'clock':          { en: 'Clock',          fr: 'Horloge',       de: 'Uhr',                es: 'Reloj',                it: 'Orologio',               pt: 'Relógio' },
  'unit-convert':   { en: 'Conversions',    fr: 'Conversions',   de: 'Umrechnungen',       es: 'Conversiones',         it: 'Conversioni',            pt: 'Conversões' },
  'calendar':       { en: 'Calendar',       fr: 'Calendrier',    de: 'Kalender',           es: 'Calendario',           it: 'Calendario',             pt: 'Calendário' },
  'perimeter-tool': { en: 'Perimeter',      fr: 'Périmètre',     de: 'Umfang',             es: 'Perímetro',            it: 'Perimetro',              pt: 'Perímetro' },
  'area-tool':      { en: 'Area',           fr: 'Aire',          de: 'Fläche',             es: 'Área',                 it: 'Area',                   pt: 'Área' },
  'angles-tool':    { en: 'Angles',         fr: 'Angles',        de: 'Winkel',             es: 'Ángulos',              it: 'Angoli',                 pt: 'Ângulos' },
  'pythagore-tool': { en: 'Pythagoras',     fr: 'Pythagore',     de: 'Pythagoras',         es: 'Pitágoras',            it: 'Pitagora',               pt: 'Pitágoras' },
  'equation-tool':  { en: 'Equations',      fr: 'Équations',     de: 'Gleichungen',        es: 'Ecuaciones',           it: 'Equazioni',              pt: 'Equações' },
  'expression':     { en: 'Expressions',    fr: 'Expressions',   de: 'Terme',              es: 'Expresiones',          it: 'Espressioni',            pt: 'Expressões' },
  'graph-tool':     { en: 'Functions',      fr: 'Fonctions',     de: 'Funktionen',         es: 'Funciones',            it: 'Funzioni',               pt: 'Funções' },
  'stats-tool':     { en: 'Statistics',     fr: 'Statistiques',  de: 'Statistik',          es: 'Estadística',          it: 'Statistica',             pt: 'Estatística' },
}

export const TOOL_DESCS = {
  'numbers':        { en: 'Explore digits 0 to 9',                 fr: 'Explore les chiffres de 0 à 9',        de: 'Entdecke die Ziffern 0 bis 9',           es: 'Explora los dígitos del 0 al 9',        it: 'Esplora le cifre da 0 a 9',             pt: 'Explora os dígitos de 0 a 9' },
  'mult':           { en: 'Enter a number and see its table',      fr: 'Entre un nombre et vois sa table',     de: 'Gib eine Zahl ein und sieh ihr Einmaleins', es: 'Escribe un número y ve su tabla',    it: 'Inserisci un numero e vedi la tabellina', pt: 'Escreve um número e vê a sua tabuada' },
  'mdas':           { en: 'Step-by-step calculation',              fr: 'Calcul étape par étape',               de: 'Schritt-für-Schritt-Rechnung',           es: 'Cálculo paso a paso',                   it: 'Calcolo passo dopo passo',              pt: 'Cálculo passo a passo' },
  'fractions-tool': { en: 'Visualize and simplify fractions',      fr: 'Visualise et simplifie des fractions', de: 'Brüche veranschaulichen und kürzen',     es: 'Visualiza y simplifica fracciones',     it: 'Visualizza e semplifica le frazioni',   pt: 'Visualiza e simplifica frações' },
  'clock':          { en: 'Enter a time and read the clock',       fr: 'Entre une heure et lis l\'horloge',    de: 'Gib eine Uhrzeit ein und lies die Uhr',  es: 'Escribe una hora y lee el reloj',       it: 'Inserisci un\'ora e leggi l\'orologio', pt: 'Escreve uma hora e lê o relógio' },
  'unit-convert':   { en: 'Convert cm, m, km, g, kg…',             fr: 'Convertis cm, m, km, g, kg…',          de: 'Rechne cm, m, km, g, kg um…',            es: 'Convierte cm, m, km, g, kg…',           it: 'Converti cm, m, km, g, kg…',            pt: 'Converte cm, m, km, g, kg…' },
  'calendar':       { en: 'Calculate durations and dates',         fr: 'Calcule des durées et des dates',      de: 'Zeitspannen und Daten berechnen',        es: 'Calcula duraciones y fechas',           it: 'Calcola durate e date',                 pt: 'Calcula durações e datas' },
  'perimeter-tool': { en: 'Calculate the perimeter of shapes',     fr: 'Calcule le périmètre de figures',      de: 'Den Umfang von Figuren berechnen',       es: 'Calcula el perímetro de figuras',       it: 'Calcola il perimetro delle figure',     pt: 'Calcula o perímetro de figuras' },
  'area-tool':      { en: 'Calculate the area of shapes',          fr: 'Calcule l\'aire de figures',           de: 'Den Flächeninhalt von Figuren berechnen', es: 'Calcula el área de figuras',           it: 'Calcola l\'area delle figure',          pt: 'Calcula a área de figuras' },
  'angles-tool':    { en: 'Explore and measure angles',            fr: 'Explore et mesure des angles',         de: 'Winkel erkunden und messen',             es: 'Explora y mide ángulos',                it: 'Esplora e misura gli angoli',           pt: 'Explora e mede ângulos' },
  'pythagore-tool': { en: 'Calculate a right triangle\'s sides',   fr: 'Calcule les côtés d\'un triangle rectangle', de: 'Seiten im rechtwinkligen Dreieck berechnen', es: 'Calcula los lados de un triángulo rectángulo', it: 'Calcola i lati di un triangolo rettangolo', pt: 'Calcula os lados de um triângulo retângulo' },
  'equation-tool':  { en: 'Solve one-variable equations',          fr: 'Résous des équations à une inconnue',  de: 'Gleichungen mit einer Unbekannten lösen', es: 'Resuelve ecuaciones de una incógnita',  it: 'Risolvi equazioni a un\'incognita',     pt: 'Resolve equações com uma incógnita' },
  'expression':     { en: 'Simplify and expand expressions',       fr: 'Simplifie et développe des expressions', de: 'Terme vereinfachen und ausmultiplizieren', es: 'Simplifica y desarrolla expresiones', it: 'Semplifica e sviluppa le espressioni',  pt: 'Simplifica e desenvolve expressões' },
  'graph-tool':     { en: 'Plot functions on a coordinate plane',  fr: 'Trace des fonctions dans un repère',   de: 'Funktionen im Koordinatensystem zeichnen', es: 'Representa funciones en un plano',     it: 'Traccia funzioni sul piano cartesiano', pt: 'Traça funções num plano cartesiano' },
  'stats-tool':     { en: 'Represent and analyze data',            fr: 'Représente et analyse des données',    de: 'Daten darstellen und auswerten',         es: 'Representa y analiza datos',            it: 'Rappresenta e analizza i dati',         pt: 'Representa e analisa dados' },
}

export const GRADES = {
  g1:    { en: 'Grade 1', fr: '1re année', de: 'Klasse 1', es: 'Grado 1', it: 'Classe 1', pt: 'Ano 1' },
  g2:    { en: 'Grade 2', fr: '2e année',  de: 'Klasse 2', es: 'Grado 2', it: 'Classe 2', pt: 'Ano 2' },
  g3:    { en: 'Grade 3', fr: '3e année',  de: 'Klasse 3', es: 'Grado 3', it: 'Classe 3', pt: 'Ano 3' },
  g4:    { en: 'Grade 4', fr: '4e année',  de: 'Klasse 4', es: 'Grado 4', it: 'Classe 4', pt: 'Ano 4' },
  g5:    { en: 'Grade 5', fr: '5e année',  de: 'Klasse 5', es: 'Grado 5', it: 'Classe 5', pt: 'Ano 5' },
  g6:    { en: 'Grade 6', fr: '6e année',  de: 'Klasse 6', es: 'Grado 6', it: 'Classe 6', pt: 'Ano 6' },
  s1:    { en: 'Sec 1',   fr: 'Sec 1',     de: 'Sek 1',    es: 'Sec 1',   it: 'Sec 1',    pt: 'Sec 1' },
  s2:    { en: 'Sec 2',   fr: 'Sec 2',     de: 'Sek 2',    es: 'Sec 2',   it: 'Sec 2',    pt: 'Sec 2' },
  s3:    { en: 'Sec 3',   fr: 'Sec 3',     de: 'Sek 3',    es: 'Sec 3',   it: 'Sec 3',    pt: 'Sec 3' },
  s4:    { en: 'Sec 4',   fr: 'Sec 4',     de: 'Sek 4',    es: 'Sec 4',   it: 'Sec 4',    pt: 'Sec 4' },
  s5:    { en: 'Sec 5',   fr: 'Sec 5',     de: 'Sek 5',    es: 'Sec 5',   it: 'Sec 5',    pt: 'Sec 5' },
  other: { en: 'Other',   fr: 'Autre',     de: 'Andere',   es: 'Otro',    it: 'Altro',    pt: 'Outro' },
}

export const STATS = {
  lessonsDone: { en: 'Lessons done', fr: 'Leçons faites',   de: 'Lektionen',       es: 'Lecciones hechas', it: 'Lezioni fatte',   pt: 'Lições feitas' },
  toolsUsed:   { en: 'Tools used',   fr: 'Outils utilisés', de: 'Werkzeuge',       es: 'Herramientas',     it: 'Strumenti usati', pt: 'Ferramentas' },
  dayStreak:   { en: 'Day streak',   fr: 'Jours d\'affilée', de: 'Tage in Folge',  es: 'Días seguidos',    it: 'Giorni di fila',  pt: 'Dias seguidos' },
  points:      { en: 'Points',       fr: 'Points',          de: 'Punkte',          es: 'Puntos',           it: 'Punti',           pt: 'Pontos' },
}

export const EX_CATS = {
  geometry:   { en: 'Geometry',   fr: 'Géométrie',   de: 'Geometrie',  es: 'Geometría',  it: 'Geometria',  pt: 'Geometria' },
  arithmetic: { en: 'Arithmetic', fr: 'Arithmétique', de: 'Arithmetik', es: 'Aritmética', it: 'Aritmetica', pt: 'Aritmética' },
  extras:     { en: 'Extras',     fr: 'Extras',      de: 'Extras',     es: 'Extras',     it: 'Extra',      pt: 'Extras' },
}

export const EX_DESCS = {
  geometry:   { en: 'Shapes, angles, perimeter & area',     fr: 'Figures, angles, périmètre et aire',    de: 'Figuren, Winkel, Umfang & Fläche',        es: 'Figuras, ángulos, perímetro y área',    it: 'Figure, angoli, perimetro e area',      pt: 'Figuras, ângulos, perímetro e área' },
  arithmetic: { en: 'Numbers, operations & fractions',      fr: 'Nombres, opérations et fractions',      de: 'Zahlen, Rechnen & Brüche',                es: 'Números, operaciones y fracciones',     it: 'Numeri, operazioni e frazioni',         pt: 'Números, operações e frações' },
  extras:     { en: 'Algebra, stats & advanced topics',     fr: 'Algèbre, stats et sujets avancés',      de: 'Algebra, Statistik & weitere Themen',     es: 'Álgebra, estadística y temas avanzados', it: 'Algebra, statistica e argomenti avanzati', pt: 'Álgebra, estatística e temas avançados' },
}

export const PLANS = {
  free:        { en: 'Free',         fr: 'Gratuit',       de: 'Kostenlos',    es: 'Gratis',        it: 'Gratis',       pt: 'Grátis' },
  pro:         { en: 'Pro',          fr: 'Pro',           de: 'Pro',          es: 'Pro',           it: 'Pro',          pt: 'Pro' },
  currentPlan: { en: 'Current plan', fr: 'Forfait actuel', de: 'Aktueller Plan', es: 'Plan actual', it: 'Piano attuale', pt: 'Plano atual' },
  perMonth:    { en: '/mo',          fr: '/mois',         de: '/Mon.',        es: '/mes',          it: '/mese',        pt: '/mês' },
}

export const PLAN_FEATURES = {
  lessons4:    { en: '4 included lessons',       fr: '4 leçons incluses',        de: '4 Lektionen inklusive',     es: '4 lecciones incluidas',      it: '4 lezioni incluse',        pt: '4 lições incluídas' },
  tools4:      { en: '4 basic tools',            fr: '4 outils de base',         de: '4 Basis-Werkzeuge',         es: '4 herramientas básicas',     it: '4 strumenti di base',      pt: '4 ferramentas básicas' },
  custom3:     { en: 'Custom lessons (3/mo)',    fr: 'Leçons perso (3/mois)',    de: 'Eigene Lektionen (3/Mon.)', es: 'Lecciones propias (3/mes)',  it: 'Lezioni personali (3/mese)', pt: 'Lições próprias (3/mês)' },
  allLessons:  { en: 'All lessons',              fr: 'Toutes les leçons',        de: 'Alle Lektionen',            es: 'Todas las lecciones',        it: 'Tutte le lezioni',         pt: 'Todas as lições' },
  allTools:    { en: 'All tools',                fr: 'Tous les outils',          de: 'Alle Werkzeuge',            es: 'Todas las herramientas',     it: 'Tutti gli strumenti',      pt: 'Todas as ferramentas' },
  customUnlim: { en: 'Unlimited custom lessons', fr: 'Leçons perso illimitées',  de: 'Unbegrenzt eigene Lektionen', es: 'Lecciones propias ilimitadas', it: 'Lezioni personali illimitate', pt: 'Lições próprias ilimitadas' },
  progress:    { en: 'Progress tracking',        fr: 'Suivi de progression',     de: 'Fortschritts-Tracking',     es: 'Seguimiento del progreso',   it: 'Monitoraggio dei progressi', pt: 'Acompanhamento do progresso' },
  adFree:      { en: 'Ad-free',                  fr: 'Sans publicité',           de: 'Werbefrei',                 es: 'Sin anuncios',               it: 'Senza pubblicità',         pt: 'Sem publicidade' },
}

export const MISC = {
  customPrompt:      { en: 'Describe a lesson and let the magic happen!', fr: 'Décris une leçon et laisse la magie opérer !', de: 'Beschreibe eine Lektion und lass die Magie wirken!', es: '¡Describe una lección y deja que ocurra la magia!', it: 'Descrivi una lezione e lascia fare la magia!', pt: 'Descreve uma lição e deixa a magia acontecer!' },
  customPlaceholder: { en: 'E.g.: A lesson on the 7-times table for an 8-year-old…', fr: 'Ex. : une leçon sur la table de 7 pour un enfant de 8 ans…', de: 'Z. B.: eine Lektion zum 7er-Einmaleins für ein 8-jähriges Kind…', es: 'Ej.: una lección sobre la tabla del 7 para un niño de 8 años…', it: 'Es.: una lezione sulla tabellina del 7 per un bambino di 8 anni…', pt: 'Ex.: uma lição sobre a tabuada do 7 para uma criança de 8 anos…' },
  enter:             { en: 'Enter',       fr: 'Entrer',        de: 'Los',          es: 'Entrar',        it: 'Invio',          pt: 'Entrar' },
  editLesson:        { en: 'Edit lesson', fr: 'Modifier la leçon', de: 'Lektion bearbeiten', es: 'Editar lección', it: 'Modifica lezione', pt: 'Editar lição' },
  generating:        { en: 'Generating…', fr: 'Génération…',   de: 'Wird erstellt…', es: 'Generando…',   it: 'Generazione…',   pt: 'A gerar…' },
  generateLesson:    { en: 'Generate lesson', fr: 'Générer la leçon', de: 'Lektion erstellen', es: 'Generar lección', it: 'Genera lezione', pt: 'Gerar lição' },
  or:                { en: 'or',          fr: 'ou',            de: 'oder',         es: 'o',             it: 'oppure',         pt: 'ou' },
  createManually:    { en: 'Create manually (Lesson Builder)', fr: 'Créer manuellement (Lesson Builder)', de: 'Manuell erstellen (Lesson Builder)', es: 'Crear manualmente (Lesson Builder)', it: 'Crea manualmente (Lesson Builder)', pt: 'Criar manualmente (Lesson Builder)' },
}

// ── The Library shelves ─────────────────────────────────────────────────────
// Category names and every lesson title/description. These used to live as
// hardcoded English inside builtinLessons.js, which is why the Library read as
// French chrome wrapped around English cards.

export const LIB_CATS = {
  arithmetic:   { en: 'Numbers & Arithmetic',     fr: 'Nombres et arithmétique',  de: 'Zahlen & Arithmetik',       es: 'Números y aritmética',      it: 'Numeri e aritmetica',       pt: 'Números e aritmética' },
  algebra:      { en: 'Algebra',                  fr: 'Algèbre',                  de: 'Algebra',                   es: 'Álgebra',                   it: 'Algebra',                   pt: 'Álgebra' },
  trigonometry: { en: 'Trigonometry',             fr: 'Trigonométrie',            de: 'Trigonometrie',             es: 'Trigonometría',             it: 'Trigonometria',             pt: 'Trigonometria' },
  graphs:       { en: 'Functions & Graphs',       fr: 'Fonctions et graphiques',  de: 'Funktionen & Graphen',      es: 'Funciones y gráficas',      it: 'Funzioni e grafici',        pt: 'Funções e gráficos' },
  geometry:     { en: 'Geometry',                 fr: 'Géométrie',                de: 'Geometrie',                 es: 'Geometría',                 it: 'Geometria',                 pt: 'Geometria' },
  stats:        { en: 'Statistics & Probability', fr: 'Statistiques et probabilités', de: 'Statistik & Wahrscheinlichkeit', es: 'Estadística y probabilidad', it: 'Statistica e probabilità', pt: 'Estatística e probabilidade' },
}

export const LIB_CAT_SUBS = {
  arithmetic:   { en: 'Integers, fractions, ratios & percent', fr: 'Entiers, fractions, rapports et pourcentages', de: 'Ganze Zahlen, Brüche, Verhältnisse & Prozent', es: 'Enteros, fracciones, razones y porcentajes', it: 'Interi, frazioni, rapporti e percentuali', pt: 'Inteiros, frações, razões e percentagens' },
  algebra:      { en: 'Equations & expressions',              fr: 'Équations et expressions',                     de: 'Gleichungen & Terme',                         es: 'Ecuaciones y expresiones',                  it: 'Equazioni ed espressioni',                 pt: 'Equações e expressões' },
  trigonometry: { en: 'Angles, ratios & the unit circle',     fr: 'Angles, rapports et cercle unité',             de: 'Winkel, Verhältnisse & Einheitskreis',        es: 'Ángulos, razones y círculo unitario',       it: 'Angoli, rapporti e cerchio unitario',      pt: 'Ângulos, razões e círculo unitário' },
  graphs:       { en: 'Plotting, analysis & calculus intro',  fr: 'Tracés, analyse et intro au calcul',           de: 'Zeichnen, Analyse & Einstieg in die Analysis', es: 'Trazado, análisis e introducción al cálculo', it: 'Tracciati, analisi e introduzione al calcolo', pt: 'Traçado, análise e introdução ao cálculo' },
  geometry:     { en: 'Shapes, angles & proofs',              fr: 'Figures, angles et démonstrations',            de: 'Figuren, Winkel & Beweise',                   es: 'Figuras, ángulos y demostraciones',         it: 'Figure, angoli e dimostrazioni',           pt: 'Figuras, ângulos e demonstrações' },
  stats:        { en: 'Data, chance & correlation',           fr: 'Données, hasard et corrélation',               de: 'Daten, Zufall & Korrelation',                 es: 'Datos, azar y correlación',                 it: 'Dati, caso e correlazione',                pt: 'Dados, acaso e correlação' },
}

export const LIB_NAMES = {
  'integers-operations':   { en: 'Integers & Order of Operations', fr: 'Entiers et priorité des opérations', de: 'Ganze Zahlen & Rechenreihenfolge', es: 'Enteros y orden de operaciones',    it: 'Interi e ordine delle operazioni', pt: 'Inteiros e ordem das operações' },
  'fractions-decimals':    { en: 'Fractions & Decimals',           fr: 'Fractions et décimaux',              de: 'Brüche & Dezimalzahlen',           es: 'Fracciones y decimales',            it: 'Frazioni e decimali',              pt: 'Frações e decimais' },
  'ratios-proportions':    { en: 'Ratios, Rates & Proportions',    fr: 'Rapports, taux et proportions',      de: 'Verhältnisse, Raten & Proportionen', es: 'Razones, tasas y proporciones',   it: 'Rapporti, tassi e proporzioni',    pt: 'Razões, taxas e proporções' },
  'percentages':           { en: 'Percentages',                    fr: 'Pourcentages',                       de: 'Prozentrechnung',                  es: 'Porcentajes',                       it: 'Percentuali',                      pt: 'Percentagens' },
  'linear-equations':      { en: 'Solving Linear Equations',       fr: 'Résoudre des équations linéaires',   de: 'Lineare Gleichungen lösen',        es: 'Resolver ecuaciones lineales',      it: 'Risolvere equazioni lineari',      pt: 'Resolver equações lineares' },
  'algebraic-expressions': { en: 'Algebraic Expressions',          fr: 'Expressions algébriques',            de: 'Algebraische Terme',               es: 'Expresiones algebraicas',           it: 'Espressioni algebriche',           pt: 'Expressões algébricas' },
  'factoring':             { en: 'Expanding & Factoring',          fr: 'Développer et factoriser',           de: 'Ausmultiplizieren & Faktorisieren', es: 'Desarrollar y factorizar',         it: 'Sviluppare e fattorizzare',        pt: 'Desenvolver e fatorizar' },
  'systems-equations':     { en: 'Systems of Equations',           fr: 'Systèmes d\'équations',              de: 'Gleichungssysteme',                es: 'Sistemas de ecuaciones',            it: 'Sistemi di equazioni',             pt: 'Sistemas de equações' },
  'inequalities':          { en: 'Inequalities',                   fr: 'Inéquations',                        de: 'Ungleichungen',                    es: 'Inecuaciones',                      it: 'Disequazioni',                     pt: 'Inequações' },
  'quadratic-equations':   { en: 'Quadratic Equations',            fr: 'Équations du second degré',          de: 'Quadratische Gleichungen',         es: 'Ecuaciones de segundo grado',       it: 'Equazioni di secondo grado',       pt: 'Equações do segundo grau' },
  'trig-ratios':           { en: 'Trig Ratios — SOH CAH TOA',      fr: 'Rapports trigo — SOH CAH TOA',       de: 'Trig. Verhältnisse — SOH CAH TOA', es: 'Razones trigonométricas — SOH CAH TOA', it: 'Rapporti trigonometrici — SOH CAH TOA', pt: 'Razões trigonométricas — SOH CAH TOA' },
  'metric-relations':      { en: 'Metric Relations in Right Triangles', fr: 'Relations métriques dans le triangle rectangle', de: 'Metrische Beziehungen im rechtwinkligen Dreieck', es: 'Relaciones métricas en el triángulo rectángulo', it: 'Relazioni metriche nel triangolo rettangolo', pt: 'Relações métricas no triângulo retângulo' },
  'trig-graphs':           { en: 'Graphs of sin, cos, tan',        fr: 'Graphiques de sin, cos, tan',        de: 'Graphen von sin, cos, tan',        es: 'Gráficas de sen, cos, tan',         it: 'Grafici di sin, cos, tan',         pt: 'Gráficos de sin, cos, tan' },
  'unit-circle':           { en: 'The Unit Circle',                fr: 'Le cercle unité',                    de: 'Der Einheitskreis',                es: 'El círculo unitario',               it: 'Il cerchio unitario',              pt: 'O círculo unitário' },
  'sine-cosine-laws':      { en: 'Sine & Cosine Laws',             fr: 'Lois des sinus et des cosinus',      de: 'Sinus- & Kosinussatz',             es: 'Leyes del seno y del coseno',       it: 'Teoremi dei seni e del coseno',    pt: 'Leis dos senos e dos cossenos' },
  'linear-functions':      { en: 'Linear Functions',               fr: 'Fonctions affines',                  de: 'Lineare Funktionen',               es: 'Funciones lineales',                it: 'Funzioni lineari',                 pt: 'Funções lineares' },
  'function-basics':       { en: 'What a Function Is',             fr: 'Qu\'est-ce qu\'une fonction',        de: 'Was eine Funktion ist',            es: 'Qué es una función',                it: 'Che cos\'è una funzione',          pt: 'O que é uma função' },
  'quadratic-graphs':      { en: 'Quadratic Functions',            fr: 'Fonctions quadratiques',             de: 'Quadratische Funktionen',          es: 'Funciones cuadráticas',             it: 'Funzioni quadratiche',             pt: 'Funções quadráticas' },
  'derivatives-intro':     { en: 'Introduction to Derivatives',    fr: 'Introduction aux dérivées',          de: 'Einführung in die Ableitung',      es: 'Introducción a las derivadas',      it: 'Introduzione alle derivate',       pt: 'Introdução às derivadas' },
  'exponential-functions': { en: 'Exponential Functions',          fr: 'Fonctions exponentielles',           de: 'Exponentialfunktionen',            es: 'Funciones exponenciales',           it: 'Funzioni esponenziali',            pt: 'Funções exponenciais' },
  'polygons':              { en: 'Polygons & Angles',              fr: 'Polygones et angles',                de: 'Vielecke & Winkel',                es: 'Polígonos y ángulos',               it: 'Poligoni e angoli',                pt: 'Polígonos e ângulos' },
  'pythagoras':            { en: 'Pythagorean Theorem',            fr: 'Théorème de Pythagore',              de: 'Satz des Pythagoras',              es: 'Teorema de Pitágoras',              it: 'Teorema di Pitagora',              pt: 'Teorema de Pitágoras' },
  'area-volume':           { en: 'Area, Perimeter & Volume',       fr: 'Aire, périmètre et volume',          de: 'Fläche, Umfang & Volumen',         es: 'Área, perímetro y volumen',         it: 'Area, perimetro e volume',         pt: 'Área, perímetro e volume' },
  'similar-figures':       { en: 'Similar & Congruent Figures',    fr: 'Figures semblables et isométriques', de: 'Ähnliche & kongruente Figuren',    es: 'Figuras semejantes y congruentes',  it: 'Figure simili e congruenti',       pt: 'Figuras semelhantes e congruentes' },
  'analytic-geometry':     { en: 'Analytic Geometry',              fr: 'Géométrie analytique',               de: 'Analytische Geometrie',            es: 'Geometría analítica',               it: 'Geometria analitica',              pt: 'Geometria analítica' },
  'stats-data':            { en: 'Data, Graphs & Averages',        fr: 'Données, graphiques et moyennes',    de: 'Daten, Diagramme & Mittelwerte',   es: 'Datos, gráficos y promedios',       it: 'Dati, grafici e medie',            pt: 'Dados, gráficos e médias' },
  'probability-basics':    { en: 'Probability Basics',             fr: 'Bases des probabilités',             de: 'Grundlagen der Wahrscheinlichkeit', es: 'Fundamentos de probabilidad',      it: 'Basi della probabilità',           pt: 'Noções de probabilidade' },
  'scatter-correlation':   { en: 'Scatter Plots & Correlation',    fr: 'Nuages de points et corrélation',    de: 'Streudiagramme & Korrelation',     es: 'Diagramas de dispersión y correlación', it: 'Grafici a dispersione e correlazione', pt: 'Diagramas de dispersão e correlação' },
}

export const LIB_DESCS = {
  'integers-operations':   { en: 'Negative numbers, and which operation goes first', fr: 'Les nombres négatifs, et quelle opération passe en premier', de: 'Negative Zahlen, und welche Rechnung zuerst kommt', es: 'Los números negativos y qué operación va primero', it: 'I numeri negativi e quale operazione viene prima', pt: 'Os números negativos e que operação vem primeiro' },
  'fractions-decimals':    { en: 'Add, compare and convert between the two forms', fr: 'Additionner, comparer et convertir entre les deux formes', de: 'Addieren, vergleichen und zwischen beiden Formen umrechnen', es: 'Sumar, comparar y convertir entre ambas formas', it: 'Sommare, confrontare e convertire tra le due forme', pt: 'Somar, comparar e converter entre as duas formas' },
  'ratios-proportions':    { en: 'Equivalent ratios, unit rates, and solving a proportion', fr: 'Rapports équivalents, taux unitaires et résolution d\'une proportion', de: 'Gleichwertige Verhältnisse, Einheitsraten und Proportionen lösen', es: 'Razones equivalentes, tasas unitarias y resolver una proporción', it: 'Rapporti equivalenti, tassi unitari e risolvere una proporzione', pt: 'Razões equivalentes, taxas unitárias e resolver uma proporção' },
  'percentages':           { en: 'Percent of a number, increase, decrease and discounts', fr: 'Pourcentage d\'un nombre, hausse, baisse et rabais', de: 'Prozent einer Zahl, Zunahme, Abnahme und Rabatte', es: 'Porcentaje de un número, aumento, descuento y rebajas', it: 'Percentuale di un numero, aumento, diminuzione e sconti', pt: 'Percentagem de um número, aumento, diminuição e descontos' },
  'linear-equations':      { en: 'Isolate x step by step — send terms across, divide both sides', fr: 'Isoler x étape par étape — passer les termes, diviser des deux côtés', de: 'x Schritt für Schritt isolieren — Terme rüberbringen, beide Seiten teilen', es: 'Aislar x paso a paso — pasar términos, dividir ambos lados', it: 'Isolare x passo dopo passo — spostare i termini, dividere entrambi i membri', pt: 'Isolar x passo a passo — passar termos, dividir os dois lados' },
  'algebraic-expressions': { en: 'Building expressions, substituting a value, collecting like terms', fr: 'Construire des expressions, substituer une valeur, réduire les termes semblables', de: 'Terme aufstellen, Werte einsetzen, gleichartige Terme zusammenfassen', es: 'Construir expresiones, sustituir un valor, reducir términos semejantes', it: 'Costruire espressioni, sostituire un valore, ridurre i termini simili', pt: 'Construir expressões, substituir um valor, reduzir termos semelhantes' },
  'factoring':             { en: 'Distributivity, notable identities, and factoring expressions', fr: 'Distributivité, identités remarquables et factorisation', de: 'Distributivgesetz, binomische Formeln und Faktorisieren', es: 'Distributividad, identidades notables y factorización', it: 'Distributività, prodotti notevoli e fattorizzazione', pt: 'Distributividade, produtos notáveis e fatorização' },
  'systems-equations':     { en: 'Solve 2×2 linear systems — substitution and elimination', fr: 'Résoudre des systèmes 2×2 — substitution et élimination', de: '2×2-Systeme lösen — Einsetzen und Eliminieren', es: 'Resolver sistemas 2×2 — sustitución y eliminación', it: 'Risolvere sistemi 2×2 — sostituzione ed eliminazione', pt: 'Resolver sistemas 2×2 — substituição e eliminação' },
  'inequalities':          { en: 'Solving them, and why dividing by a negative flips the sign', fr: 'Les résoudre, et pourquoi diviser par un négatif inverse le sens', de: 'Lösen, und warum das Teilen durch eine negative Zahl das Zeichen dreht', es: 'Resolverlas y por qué dividir por un negativo invierte el signo', it: 'Risolverle e perché dividere per un negativo inverte il verso', pt: 'Resolvê-las e porque dividir por um negativo inverte o sinal' },
  'quadratic-equations':   { en: 'Discriminant Δ, real roots, factored form — ax² + bx + c = 0', fr: 'Discriminant Δ, racines réelles, forme factorisée — ax² + bx + c = 0', de: 'Diskriminante Δ, reelle Lösungen, faktorisierte Form — ax² + bx + c = 0', es: 'Discriminante Δ, raíces reales, forma factorizada — ax² + bx + c = 0', it: 'Discriminante Δ, radici reali, forma fattorizzata — ax² + bx + c = 0', pt: 'Discriminante Δ, raízes reais, forma fatorizada — ax² + bx + c = 0' },
  'trig-ratios':           { en: 'sin, cos, tan in a right triangle with labeled sides', fr: 'sin, cos, tan dans un triangle rectangle aux côtés nommés', de: 'sin, cos, tan im rechtwinkligen Dreieck mit beschrifteten Seiten', es: 'sen, cos, tan en un triángulo rectángulo con lados rotulados', it: 'sin, cos, tan in un triangolo rettangolo con i lati indicati', pt: 'sin, cos, tan num triângulo retângulo com lados identificados' },
  'metric-relations':      { en: 'The altitude to the hypotenuse, and the relations it creates', fr: 'La hauteur issue de l\'angle droit et les relations qu\'elle crée', de: 'Die Höhe auf die Hypotenuse und die Beziehungen daraus', es: 'La altura sobre la hipotenusa y las relaciones que crea', it: 'L\'altezza relativa all\'ipotenusa e le relazioni che genera', pt: 'A altura relativa à hipotenusa e as relações que cria' },
  'trig-graphs':           { en: 'Plot and compare the three trig functions on the same axes', fr: 'Tracer et comparer les trois fonctions trigo sur les mêmes axes', de: 'Die drei trigonometrischen Funktionen auf denselben Achsen vergleichen', es: 'Trazar y comparar las tres funciones trigonométricas en los mismos ejes', it: 'Tracciare e confrontare le tre funzioni trigonometriche sugli stessi assi', pt: 'Traçar e comparar as três funções trigonométricas nos mesmos eixos' },
  'unit-circle':           { en: 'cos θ and sin θ as coordinates on a circle of radius 1', fr: 'cos θ et sin θ comme coordonnées sur un cercle de rayon 1', de: 'cos θ und sin θ als Koordinaten auf einem Kreis mit Radius 1', es: 'cos θ y sen θ como coordenadas en un círculo de radio 1', it: 'cos θ e sin θ come coordinate su una circonferenza di raggio 1', pt: 'cos θ e sin θ como coordenadas num círculo de raio 1' },
  'sine-cosine-laws':      { en: 'Solving any triangle, not just the right-angled ones', fr: 'Résoudre n\'importe quel triangle, pas seulement les rectangles', de: 'Jedes Dreieck lösen, nicht nur rechtwinklige', es: 'Resolver cualquier triángulo, no solo los rectángulos', it: 'Risolvere qualsiasi triangolo, non solo quelli rettangoli', pt: 'Resolver qualquer triângulo, não só os retângulos' },
  'linear-functions':      { en: 'f(x) = ax + b — slope, y-intercept, and intersections', fr: 'f(x) = ax + b — pente, ordonnée à l\'origine et intersections', de: 'f(x) = ax + b — Steigung, y-Achsenabschnitt und Schnittpunkte', es: 'f(x) = ax + b — pendiente, ordenada al origen e intersecciones', it: 'f(x) = ax + b — pendenza, intercetta e intersezioni', pt: 'f(x) = ax + b — declive, ordenada na origem e interseções' },
  'function-basics':       { en: 'Notation, domain, range, and reading a graph', fr: 'Notation, domaine, image et lecture d\'un graphique', de: 'Schreibweise, Definitions- und Wertebereich, Graphen lesen', es: 'Notación, dominio, recorrido y lectura de una gráfica', it: 'Notazione, dominio, codominio e lettura di un grafico', pt: 'Notação, domínio, contradomínio e leitura de um gráfico' },
  'quadratic-graphs':      { en: 'Parabolas — vertex, axis of symmetry, roots', fr: 'Paraboles — sommet, axe de symétrie, racines', de: 'Parabeln — Scheitelpunkt, Symmetrieachse, Nullstellen', es: 'Parábolas — vértice, eje de simetría, raíces', it: 'Parabole — vertice, asse di simmetria, radici', pt: 'Parábolas — vértice, eixo de simetria, raízes' },
  'derivatives-intro':     { en: 'Slope at a point, tangent line, and the derivative function', fr: 'Pente en un point, tangente et fonction dérivée', de: 'Steigung in einem Punkt, Tangente und Ableitungsfunktion', es: 'Pendiente en un punto, recta tangente y función derivada', it: 'Pendenza in un punto, retta tangente e funzione derivata', pt: 'Declive num ponto, reta tangente e função derivada' },
  'exponential-functions': { en: 'Growth and decay, and how they beat any polynomial', fr: 'Croissance et décroissance, et pourquoi elles battent tout polynôme', de: 'Wachstum und Zerfall, und warum sie jedes Polynom schlagen', es: 'Crecimiento y decrecimiento, y por qué superan a cualquier polinomio', it: 'Crescita e decrescita, e perché battono qualsiasi polinomio', pt: 'Crescimento e decrescimento, e porque superam qualquer polinómio' },
  'polygons':              { en: 'Interior angles, perimeter, and properties of regular polygons', fr: 'Angles intérieurs, périmètre et propriétés des polygones réguliers', de: 'Innenwinkel, Umfang und Eigenschaften regelmäßiger Vielecke', es: 'Ángulos interiores, perímetro y propiedades de los polígonos regulares', it: 'Angoli interni, perimetro e proprietà dei poligoni regolari', pt: 'Ângulos internos, perímetro e propriedades dos polígonos regulares' },
  'pythagoras':            { en: 'a² + b² = c² — proof and applications in right triangles', fr: 'a² + b² = c² — démonstration et applications au triangle rectangle', de: 'a² + b² = c² — Beweis und Anwendungen im rechtwinkligen Dreieck', es: 'a² + b² = c² — demostración y aplicaciones en triángulos rectángulos', it: 'a² + b² = c² — dimostrazione e applicazioni nei triangoli rettangoli', pt: 'a² + b² = c² — demonstração e aplicações em triângulos retângulos' },
  'area-volume':           { en: 'Plane figures, then prisms, cylinders and pyramids', fr: 'Figures planes, puis prismes, cylindres et pyramides', de: 'Ebene Figuren, dann Prismen, Zylinder und Pyramiden', es: 'Figuras planas, luego prismas, cilindros y pirámides', it: 'Figure piane, poi prismi, cilindri e piramidi', pt: 'Figuras planas, depois prismas, cilindros e pirâmides' },
  'similar-figures':       { en: 'Scale factor, and what it does to lengths, areas and volumes', fr: 'Rapport de similitude, et son effet sur longueurs, aires et volumes', de: 'Streckfaktor und seine Wirkung auf Längen, Flächen und Volumen', es: 'Razón de semejanza y su efecto en longitudes, áreas y volúmenes', it: 'Rapporto di similitudine e il suo effetto su lunghezze, aree e volumi', pt: 'Razão de semelhança e o seu efeito em comprimentos, áreas e volumes' },
  'analytic-geometry':     { en: 'Distance, midpoint and slope between two points', fr: 'Distance, point milieu et pente entre deux points', de: 'Abstand, Mittelpunkt und Steigung zwischen zwei Punkten', es: 'Distancia, punto medio y pendiente entre dos puntos', it: 'Distanza, punto medio e pendenza tra due punti', pt: 'Distância, ponto médio e declive entre dois pontos' },
  'stats-data':            { en: 'Mean, median, mode, and choosing the right graph', fr: 'Moyenne, médiane, mode et choix du bon graphique', de: 'Mittelwert, Median, Modus und das passende Diagramm', es: 'Media, mediana, moda y elegir el gráfico adecuado', it: 'Media, mediana, moda e scegliere il grafico giusto', pt: 'Média, mediana, moda e escolher o gráfico certo' },
  'probability-basics':    { en: 'Counting outcomes, and independent vs dependent events', fr: 'Dénombrer les issues, événements indépendants et dépendants', de: 'Ergebnisse zählen, unabhängige und abhängige Ereignisse', es: 'Contar resultados, sucesos independientes y dependientes', it: 'Contare gli esiti, eventi indipendenti e dipendenti', pt: 'Contar resultados, acontecimentos independentes e dependentes' },
  'scatter-correlation':   { en: 'Reading a cloud of points and fitting a line through it', fr: 'Lire un nuage de points et y ajuster une droite', de: 'Eine Punktwolke lesen und eine Gerade hindurchlegen', es: 'Leer una nube de puntos y ajustar una recta', it: 'Leggere una nuvola di punti e tracciarvi una retta', pt: 'Ler uma nuvem de pontos e ajustar-lhe uma reta' },
}

// Per-key English fallback: a language missing one row still renders that row in
// English instead of blanking it or falling back for the whole table.
export const tr = (lang, table, key) => table[key]?.[lang] ?? table[key]?.en ?? key
