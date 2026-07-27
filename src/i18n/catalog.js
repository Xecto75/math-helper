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

// Per-key English fallback: a language missing one row still renders that row in
// English instead of blanking it or falling back for the whole table.
export const tr = (lang, table, key) => table[key]?.[lang] ?? table[key]?.en ?? key
