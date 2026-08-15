/**
 * @fileoverview Simple internationalization (i18n) system for the Bookmark Organizer.
 * Supports English and Spanish. Stores language preference in localStorage.
 * @module core/i18n
 */

// ---------------------------------------------------------------------------
// localStorage key
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'bookmarkOrganizer_language';

// ---------------------------------------------------------------------------
// Module‑level state
// ---------------------------------------------------------------------------
/** @type {'en'|'es'} */
let currentLanguage = 'en';

// ---------------------------------------------------------------------------
// Translation dictionaries
// ---------------------------------------------------------------------------

/**
 * All UI strings keyed by language → nested dot‑path segments.
 * Access via the `t()` helper rather than reading directly.
 *
 * @type {{ en: object, es: object }}
 */
export const translations = {
  // ── English ──────────────────────────────────────────────────────────────
  en: {
    app: {
      title: 'Bookmark Organizer',
      subtitle: 'Organize your bookmarks intelligently with AI',
    },
    header: {
      subtitle: 'Smart Organizer',
    },
    upload: {
      title: 'Upload Bookmarks',
      subtitle: 'Import your browser bookmarks file to get started',
      button: 'Choose File',
      dragDrop: 'or drag & drop your bookmarks HTML file here',
      formats: 'Supports Chrome, Firefox, Edge, Brave, Safari exports (.html)',
      or: 'or',
      demo: 'Try with sample bookmarks',
    },
    results: {
      title: 'Organized Bookmarks',
      totalBookmarks: 'Total Bookmarks',
      categories: 'Categories',
      uncategorized: 'Uncategorized',
      visualGrid: 'Gallery',
      searchPlaceholder: 'Search bookmarks…',
      expandAll: 'Expand All',
      collapseAll: 'Collapse All',
      export: 'Export',
      bookmarksIn: 'bookmarks in',
    },
    export: {
      title: 'Export Bookmarks',
      button: 'Export as HTML',
      downloading: 'Downloading…',
      downloadClear: 'Download & Clear Session (Secure)',
      filenameLabel: 'Filename',
      download: 'Download Organized Bookmarks',
      info: 'The exported file can be re-imported into any major browser.',
    },
    settings: {
      title: 'Settings',
      language: 'Language',
      apiKey: 'Gemini API Key',
      apiKeyPlaceholder: 'Enter your Gemini API key',
      apiKeyHelp: 'Get a free API key from Google AI Studio',
      apiKeyDescription:
        'Optional — enables AI‑powered categorization for more accurate results.',
      customCategories: 'Custom Categories',
      addCategory: 'Add Category',
      save: 'Save',
      cancel: 'Cancel',
      generalTab: 'General',
      aiTab: 'AI',
      categoriesTab: 'Categories',
      aiDescription:
        'Get smarter categorization by connecting Google AI. The Gemini API is free to use for reasonable volumes.',
      apiKeyLabel: 'Gemini API Key',
      saveKey: 'Save & Test',
      clearKey: 'Clear Key',
      connected: 'Connected',
      notConnected: 'Not connected',
      getKey: '🔑 Get a free API key from Google AI Studio →',
      categoriesDescription:
        'Add custom categories to better match your bookmark collection. Custom categories are checked before defaults.',
      nameEn: 'Name (English)',
      nameEs: 'Name (Español)',
      emoji: 'Emoji',
      color: 'Color',
      domains: 'Domains (one per line)',
      keywords: 'Keywords (one per line)',
      addBtn: 'Add Category',
      noCustom: 'No custom categories yet.',
    },
    category: {
      socialMedia: 'Social Media',
      shopping: 'Shopping',
      news: 'News & Media',
      development: 'Development',
      entertainment: 'Entertainment',
      education: 'Education',
      finance: 'Finance',
      productivity: 'Productivity',
      research: 'Research',
      gaming: 'Gaming',
      government: 'Government',
      health: 'Health & Wellness',
      travel: 'Travel',
      recipes: 'Recipes & Food',
      other: 'Other',
    },
    action: {
      organize: 'Organize',
      export: 'Export',
      reset: 'Reset',
      selectAll: 'Select All',
      deselectAll: 'Deselect All',
      expandAll: 'Expand All',
      collapseAll: 'Collapse All',
      moveToCategory: 'Move to Category',
      delete: 'Delete',
    },
    toast: {
      fileLoaded: 'Bookmarks file loaded successfully!',
      organized: 'Bookmarks organized successfully!',
      exported: 'Bookmarks exported!',
      error: 'An error occurred. Please try again.',
      apiKeySet: 'API key saved successfully!',
      categoryAdded: 'Custom category added!',
      categoryRemoved: 'Custom category removed.',
      sessionCleared: 'Session data securely cleared from browser memory.',
      linkScanComplete: 'Link scan complete!',
      deadLinksRemoved: 'Dead links removed.',
      duplicatesResolved: 'Duplicates resolved!',
      noDuplicates: 'No duplicates found.',
      backupCreated: 'Backup created successfully!',
      backupRestored: 'Backup restored successfully!',
      backupInvalid: 'Invalid backup file.',
      themeChanged: 'Theme applied!',
      rescued: 'Bookmark rescued via Wayback Machine!',
      rescueFailed: 'No Wayback snapshot available.',
      tagsMerged: 'Tags merged successfully!',
      tagRenamed: 'Tag renamed successfully!',
      bulkTagsAdded: 'Tag added to selected bookmarks.',
      bulkTagsRemoved: 'Tag removed from selected bookmarks.',
      detailsSaved: 'Bookmark details saved!',
      addedToReadLater: 'Added to Read Later queue.',
      success: 'Bookmarks organized successfully!',
      aiSuccess: 'Bookmarks organized with AI assistance!',
      demoLoaded: 'Demo bookmarks loaded!',
      testingKey: 'Testing API key…',
      keyValid: 'API key is valid!',
      keyCleared: 'API key cleared.',
      deleted: 'Bookmark removed.',
      moved: 'Bookmark moved.',
    },
    stats: {
      title: 'Statistics',
      breakdown: 'Category Breakdown',
      distribution: 'Distribution',
      bookmarks: 'Bookmarks',
    },
    linkChecker: {
      title: 'Link Health',
      checkLinks: 'Check Links',
      scanning: 'Scanning links…',
      alive: 'Alive',
      dead: 'Dead',
      unknown: 'Unknown',
      removeDead: 'Remove Dead Links',
      scanComplete: 'Scan complete',
      progress: 'Checked {checked} of {total}',
      filterAll: 'All',
      filterAlive: 'Alive',
      filterDead: 'Dead',
      filterUnknown: 'Unknown',
      cancel: 'Cancel Scan',
      rescue: 'Rescue',
    },
    duplicates: {
      title: 'Duplicate Bookmarks',
      findDuplicates: 'Find Duplicates',
      found: '{count} duplicate groups found',
      noneFound: 'No duplicates found!',
      keep: 'Keep',
      remove: 'Remove',
      autoMerge: 'Auto-Resolve All',
      review: 'Review Duplicates',
      group: 'Group {n}',
      original: 'Original',
      duplicate: 'Duplicate',
    },
    backup: {
      title: 'Backup & Restore',
      create: 'Create Backup',
      restore: 'Restore Backup',
      lastBackup: 'Last backup',
      never: 'Never',
      summary: '{total} bookmarks in {cats} categories',
      confirmRestore: 'Restore will replace current data. Continue?',
      selectFile: 'Select a .json backup file',
    },
    analytics: {
      title: 'Analytics',
      treemap: 'Treemap',
      timeline: 'Timeline',
      topDomains: 'Top Domains',
      insights: 'Insights',
      oldest: 'Oldest Bookmark',
      newest: 'Newest Bookmark',
      topDomain: 'Most Visited Domain',
      avgPerCategory: 'Avg. per Category',
      topCategory: 'Largest Category',
    },
    tags: {
      title: 'Tags',
      popular: 'Popular Tags',
      filterByTag: 'Filter by tag',
      clearFilter: 'Clear filter',
      noTags: 'No tags generated',
      managerTitle: 'Tag Manager',
      mergeBtn: 'Merge Tags',
      renameBtn: 'Rename Tag',
      sourceTag: 'Source Tag',
      targetTag: 'Target Tag',
      newTagName: 'New Tag Name',
      bulkTagTitle: 'Bulk Tagging',
    },
    themes: {
      title: 'Theme',
      midnight: 'Midnight',
      aurora: 'Aurora',
      ocean: 'Ocean',
      light: 'Light',
    },
    modal: {
      confirm: 'Confirm',
      cancel: 'Cancel',
      areYouSure: 'Are you sure?',
    },
    search: {
      placeholder: 'Search bookmarks…',
      noResults: 'No bookmarks found.',
      semanticToggle: 'Semantic (AI)',
      searching: 'Searching semantically…',
      noSemanticResults: 'No relevant bookmarks found.',
    },
    bookmark: {
      editDetails: 'Edit Bookmark Details',
      descriptionLabel: 'Notes / Description',
      ratingLabel: 'Rating',
      saveDetails: 'Save Details',
      title: 'Title',
      url: 'URL',
    },
    readLater: {
      title: 'Read Later',
      unread: 'Unread',
      reading: 'Reading',
      completed: 'Completed',
      estTime: '{time} min read',
      addToQueue: 'Add to Read Later',
      openReader: 'Open Reader',
      readerTitle: 'Reader Mode',
      closeReader: 'Close Reader',
    },
    cloud: {
      tabTitle: 'Cloud Sync',
      title: 'Cloud Storage Synchronization',
      description: 'Sync and back up your bookmark collection across devices using a GitHub repository.',
      provider: 'Sync Provider',
      githubToken: 'GitHub Personal Access Token',
      githubRepo: 'Repository Name',
      githubOwner: 'Username / Owner',
      saveConfig: 'Save Settings',
      push: 'Push to Cloud',
      pull: 'Pull from Cloud',
      pushing: 'Pushing data to cloud...',
      pulling: 'Pulling data from cloud...',
      pushed: 'Collection synced to cloud!',
      pulled: 'Collection restored from cloud!',
    },
    health: {
      title: 'Collection Health Audit',
      score: 'Health Score',
      autoClean: '1-Click Auto-Clean',
      cleaning: 'Cleaning collection...',
      cleaned: 'Cleaned {total} issues ({dead} dead links, {dups} duplicates)',
      optimal: 'Optimal',
      attention: 'Requires Attention',
      deadLinks: 'Dead Links',
      duplicates: 'Duplicates',
      uncategorized: 'Uncategorized',
      withoutTags: 'Without Tags',
    },
    smart: {
      collectionsTitle: 'Smart Collections',
      all: 'All Bookmarks',
    },
    pwa: {
      installApp: 'Install App',
      installBanner: 'Install BookmarkIQ on your device for fast offline access!',
    },
    aiSummary: {
      summarizeBtn: '✨ AI Summarize',
      summarizing: 'Generating AI summary...',
      generated: 'AI summary generated!',
    },
    context: {
      open: 'Open URL',
      move: 'Move to…',
      delete: 'Delete',
    },
    empty: {
      title: 'No bookmarks yet',
      text: 'Upload a bookmark file to get started',
    },
    processing: {
      reading: 'Reading file…',
      parsing: 'Parsing bookmarks…',
      categorizing: 'Categorizing bookmarks…',
      ai: 'Running AI classification…',
      organizing: 'Organizing…',
      done: 'Done!',
      wait: 'This may take a moment',
    },
    errors: {
      invalidFile: 'Please select an HTML bookmark file.',
      noBookmarks: 'No bookmarks found in the file.',
      processingFailed: 'Failed to process bookmarks.',
      noData: 'No data available.',
      exportFailed: 'Export failed.',
      emptyKey: 'Please enter an API key.',
      invalidKey: 'Invalid API key.',
      keyTestFailed: 'Could not verify key.',
      nameRequired: 'Category name (English) is required.',
      addFailed: 'Failed to add category.',
      removeFailed: 'Failed to remove category.',
      noOtherCats: 'No other categories available.',
    },
  },

  // ── Español ──────────────────────────────────────────────────────────────
  es: {
    app: {
      title: 'Organizador de Marcadores',
      subtitle: 'Organiza tus marcadores de forma inteligente con IA',
    },
    header: {
      subtitle: 'Organizador Inteligente',
    },
    upload: {
      title: 'Subir Marcadores',
      subtitle:
        'Importa el archivo de marcadores de tu navegador para comenzar',
      button: 'Elegir Archivo',
      dragDrop: 'o arrastra y suelta tu archivo HTML de marcadores aquí',
      formats: 'Compatible con exportaciones de Chrome, Firefox, Edge, Brave, Safari (.html)',
      or: 'o',
      demo: 'Probar con marcadores de ejemplo',
    },
    results: {
      title: 'Marcadores Organizados',
      totalBookmarks: 'Total de Marcadores',
      categories: 'Categorías',
      uncategorized: 'Sin Categorizar',
      visualGrid: 'Galería',
      searchPlaceholder: 'Buscar marcadores…',
      expandAll: 'Expandir Todo',
      collapseAll: 'Contraer Todo',
      export: 'Exportar',
      bookmarksIn: 'marcadores en',
    },
    export: {
      title: 'Exportar Marcadores',
      button: 'Exportar como HTML',
      downloading: 'Descargando…',
      downloadClear: 'Descargar y Limpiar Sesión (Seguro)',
      filenameLabel: 'Nombre de Archivo',
      download: 'Descargar Marcadores Organizados',
      info: 'El archivo exportado se puede reimportar en cualquier navegador principal.',
    },
    settings: {
      title: 'Configuración',
      language: 'Idioma',
      apiKey: 'Clave API de Gemini',
      apiKeyPlaceholder: 'Introduce tu clave API de Gemini',
      apiKeyHelp: 'Obtén una clave API gratuita en Google AI Studio',
      apiKeyDescription:
        'Opcional — habilita la categorización con IA para resultados más precisos.',
      customCategories: 'Categorías Personalizadas',
      addCategory: 'Añadir Categoría',
      save: 'Guardar',
      cancel: 'Cancelar',
      generalTab: 'General',
      aiTab: 'IA',
      categoriesTab: 'Categorías',
      aiDescription:
        'Obtén una categorización más inteligente conectando Google AI. La API de Gemini es gratuita para volúmenes razonables.',
      apiKeyLabel: 'Clave API de Gemini',
      saveKey: 'Guardar y Probar',
      clearKey: 'Borrar Clave',
      connected: 'Conectado',
      notConnected: 'No conectado',
      getKey: '🔑 Obtén una clave API gratuita en Google AI Studio →',
      categoriesDescription:
        'Añade categorías personalizadas para ajustarse mejor a tu colección. Las categorías personalizadas se comprueban antes que las predeterminadas.',
      nameEn: 'Nombre (Inglés)',
      nameEs: 'Nombre (Español)',
      emoji: 'Emoji',
      color: 'Color',
      domains: 'Dominios (uno por línea)',
      keywords: 'Palabras clave (una por línea)',
      addBtn: 'Añadir Categoría',
      noCustom: 'Aún no hay categorías personalizadas.',
    },
    category: {
      socialMedia: 'Redes Sociales',
      shopping: 'Compras',
      news: 'Noticias y Medios',
      development: 'Desarrollo',
      entertainment: 'Entretenimiento',
      education: 'Educación',
      finance: 'Finanzas',
      productivity: 'Productividad',
      research: 'Investigación',
      gaming: 'Videojuegos',
      government: 'Gobierno',
      health: 'Salud y Bienestar',
      travel: 'Viajes',
      recipes: 'Recetas y Cocina',
      other: 'Otros',
    },
    action: {
      organize: 'Organizar',
      export: 'Exportar',
      reset: 'Reiniciar',
      selectAll: 'Seleccionar Todo',
      deselectAll: 'Deseleccionar Todo',
      expandAll: 'Expandir Todo',
      collapseAll: 'Contraer Todo',
      moveToCategory: 'Mover a Categoría',
      delete: 'Eliminar',
    },
    toast: {
      fileLoaded: '¡Archivo de marcadores cargado exitosamente!',
      organized: '¡Marcadores organizados exitosamente!',
      exported: '¡Marcadores exportados!',
      error: 'Ocurrió un error. Por favor, inténtalo de nuevo.',
      apiKeySet: '¡Clave API guardada exitosamente!',
      categoryAdded: '¡Categoría personalizada añadida!',
      categoryRemoved: 'Categoría personalizada eliminada.',
      sessionCleared: 'Datos de la sesión eliminados de forma segura de la memoria del navegador.',
      linkScanComplete: '¡Escaneo de enlaces completado!',
      deadLinksRemoved: 'Enlaces rotos eliminados.',
      duplicatesResolved: '¡Duplicados resueltos!',
      noDuplicates: 'No se encontraron duplicados.',
      backupCreated: '¡Copia de seguridad creada!',
      backupRestored: '¡Copia de seguridad restaurada!',
      backupInvalid: 'Archivo de copia inválido.',
      themeChanged: '¡Tema aplicado!',
      rescued: '¡Marcador rescatado con Wayback Machine!',
      rescueFailed: 'No hay copia disponible en Wayback Machine.',
      tagsMerged: '¡Etiquetas fusionadas correctamente!',
      tagRenamed: '¡Etiqueta renombrada correctamente!',
      bulkTagsAdded: 'Etiqueta añadida a los marcadores seleccionados.',
      bulkTagsRemoved: 'Etiqueta eliminada de los marcadores seleccionados.',
      detailsSaved: '¡Detalles del marcador guardados!',
      addedToReadLater: 'Añadido a la cola de Lectura Pendiente.',
      success: '¡Marcadores organizados exitosamente!',
      aiSuccess: '¡Marcadores organizados con ayuda de IA!',
      demoLoaded: '¡Marcadores de ejemplo cargados!',
      testingKey: 'Probando clave API…',
      keyValid: '¡La clave API es válida!',
      keyCleared: 'Clave API borrada.',
      deleted: 'Marcador eliminado.',
      moved: 'Marcador movido.',
    },
    stats: {
      title: 'Estadísticas',
      breakdown: 'Desglose por Categoría',
      distribution: 'Distribución',
      bookmarks: 'Marcadores',
    },
    linkChecker: {
      title: 'Estado de Enlaces',
      checkLinks: 'Verificar Enlaces',
      scanning: 'Escaneando enlaces…',
      alive: 'Activo',
      dead: 'Roto',
      unknown: 'Desconocido',
      removeDead: 'Eliminar Enlaces Rotos',
      scanComplete: 'Escaneo completado',
      progress: 'Verificados {checked} de {total}',
      filterAll: 'Todos',
      filterAlive: 'Activos',
      filterDead: 'Rotos',
      filterUnknown: 'Desconocidos',
      cancel: 'Cancelar Escaneo',
      rescue: 'Rescatar',
    },
    duplicates: {
      title: 'Marcadores Duplicados',
      findDuplicates: 'Buscar Duplicados',
      found: '{count} grupos de duplicados encontrados',
      noneFound: '¡No se encontraron duplicados!',
      keep: 'Mantener',
      remove: 'Eliminar',
      autoMerge: 'Resolver Todos',
      review: 'Revisar Duplicados',
      group: 'Grupo {n}',
      original: 'Original',
      duplicate: 'Duplicado',
    },
    backup: {
      title: 'Respaldo y Restauración',
      create: 'Crear Respaldo',
      restore: 'Restaurar Respaldo',
      lastBackup: 'Último respaldo',
      never: 'Nunca',
      summary: '{total} marcadores en {cats} categorías',
      confirmRestore: '¿Restaurar reemplazará los datos actuales. ¿Continuar?',
      selectFile: 'Selecciona un archivo .json de respaldo',
    },
    analytics: {
      title: 'Analíticas',
      treemap: 'Mapa de Árbol',
      timeline: 'Línea de Tiempo',
      topDomains: 'Dominios Principales',
      insights: 'Estadísticas',
      oldest: 'Marcador más Antiguo',
      newest: 'Marcador más Reciente',
      topDomain: 'Dominio Más Visitado',
      avgPerCategory: 'Prom. por Categoría',
      topCategory: 'Categoría Principal',
    },
    tags: {
      title: 'Etiquetas',
      popular: 'Etiquetas Populares',
      filterByTag: 'Filtrar por etiqueta',
      clearFilter: 'Limpiar filtro',
      noTags: 'Sin etiquetas generadas',
      managerTitle: 'Gestor de Etiquetas',
      mergeBtn: 'Fusionar Etiquetas',
      renameBtn: 'Renombrar Etiqueta',
      sourceTag: 'Etiqueta Origen',
      targetTag: 'Etiqueta Destino',
      newTagName: 'Nuevo Nombre',
      bulkTagTitle: 'Etiquetado Masivo',
    },
    themes: {
      title: 'Tema',
      midnight: 'Medianoche',
      aurora: 'Aurora',
      ocean: 'Océano',
      light: 'Claro',
    },
    modal: {
      confirm: 'Confirmar',
      cancel: 'Cancelar',
      areYouSure: '¿Estás seguro?',
    },
    search: {
      placeholder: 'Buscar marcadores…',
      noResults: 'No se encontraron marcadores.',
      semanticToggle: 'Semántica (IA)',
      searching: 'Buscando semánticamente…',
      noSemanticResults: 'No se encontraron marcadores relevantes.',
    },
    bookmark: {
      editDetails: 'Editar Detalles del Marcador',
      descriptionLabel: 'Notas / Descripción',
      ratingLabel: 'Calificación',
      saveDetails: 'Guardar Detalles',
      title: 'Título',
      url: 'URL',
    },
    readLater: {
      title: 'Lectura Pendiente',
      unread: 'Sin leer',
      reading: 'Leyendo',
      completed: 'Completado',
      estTime: '{time} min de lectura',
      addToQueue: 'Añadir a Lectura Pendiente',
      openReader: 'Abrir Lector',
      readerTitle: 'Modo Lector',
      closeReader: 'Cerrar Lector',
    },
    cloud: {
      tabTitle: 'Sincro Cloud',
      title: 'Sincronización en la Nube',
      description: 'Respalda y sincroniza tu colección de marcadores entre dispositivos mediante un repositorio de GitHub.',
      provider: 'Proveedor de Sincro',
      githubToken: 'Token de Acceso Personal de GitHub',
      githubRepo: 'Nombre del Repositorio',
      githubOwner: 'Usuario / Propietario',
      saveConfig: 'Guardar Configuración',
      push: 'Subir a la Nube',
      pull: 'Descargar de la Nube',
      pushing: 'Subiendo datos a la nube...',
      pulling: 'Descargando datos de la nube...',
      pushed: '¡Colección sincronizada en la nube!',
      pulled: '¡Colección restaurada desde la nube!',
    },
    health: {
      title: 'Auditoría de Salud',
      score: 'Salud General',
      autoClean: 'Auto-Limpieza en 1 Clic',
      cleaning: 'Limpiando colección...',
      cleaned: 'Se limpiaron {total} elementos ({dead} enlaces rotos, {dups} duplicados)',
      optimal: 'Óptimo',
      attention: 'Requiere Atención',
      deadLinks: 'Enlaces Rotos',
      duplicates: 'Duplicados',
      uncategorized: 'Sin Categorizar',
      withoutTags: 'Sin Etiquetas',
    },
    smart: {
      collectionsTitle: 'Colecciones Inteligentes',
      all: 'Todos los Marcadores',
    },
    pwa: {
      installApp: 'Instalar App',
      installBanner: '¡Instala BookmarkIQ en tu dispositivo para un acceso rápido sin conexión!',
    },
    aiSummary: {
      summarizeBtn: '✨ Resumir con IA',
      summarizing: 'Generando resumen con IA...',
      generated: '¡Resumen generado con IA!',
    },
    context: {
      open: 'Abrir URL',
      move: 'Mover a…',
      delete: 'Eliminar',
    },
    empty: {
      title: 'Aún no hay marcadores',
      text: 'Sube un archivo de marcadores para comenzar',
    },
    processing: {
      reading: 'Leyendo archivo…',
      parsing: 'Analizando marcadores…',
      categorizing: 'Categorizando marcadores…',
      ai: 'Ejecutando clasificación con IA…',
      organizing: 'Organizando…',
      done: '¡Listo!',
      wait: 'Esto puede tardar un momento',
    },
    errors: {
      invalidFile: 'Por favor selecciona un archivo HTML de marcadores.',
      noBookmarks: 'No se encontraron marcadores en el archivo.',
      processingFailed: 'No se pudieron procesar los marcadores.',
      noData: 'No hay datos disponibles.',
      exportFailed: 'La exportación falló.',
      emptyKey: 'Por favor introduce una clave API.',
      invalidKey: 'Clave API inválida.',
      keyTestFailed: 'No se pudo verificar la clave.',
      nameRequired: 'El nombre de la categoría (Inglés) es obligatorio.',
      addFailed: 'No se pudo añadir la categoría.',
      removeFailed: 'No se pudo eliminar la categoría.',
      noOtherCats: 'No hay otras categorías disponibles.',
    },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a dot‑separated key against a nested object.
 * @param {object} obj  - Root object to traverse.
 * @param {string} path - Dot‑separated key, e.g. "app.title".
 * @returns {string|undefined}
 */
function resolve(obj, path) {
  return path.split('.').reduce((acc, segment) => {
    return acc && typeof acc === 'object' ? acc[segment] : undefined;
  }, obj);
}

/**
 * Converts a dot-notation key into a human-readable label as a last-resort
 * fallback, so a missing translation never surfaces a raw key like
 * "results.expandAll" in the UI (renders "Expand All" instead).
 * @param {string} key - Dot-separated key.
 * @returns {string}
 */
function humanizeKey(key) {
  const last = String(key).split('.').pop() || '';
  const spaced = last
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the translated string for the current language.
 * Falls back to the key itself if no translation is found.
 *
 * @param {string} key - Dot‑notation key, e.g. "upload.button".
 * @returns {string}
 */
export function t(key) {
  const value = resolve(translations[currentLanguage], key);
  if (value !== undefined && typeof value === 'string') {
    return value;
  }
  // Fallback: try the other language, then a humanized version of the key.
  const fallback = resolve(
    translations[currentLanguage === 'en' ? 'es' : 'en'],
    key,
  );
  if (typeof fallback === 'string') return fallback;
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(`[i18n] Missing translation for key "${key}"`);
  }
  return humanizeKey(key);
}

/**
 * Sets the active language and persists the choice to localStorage.
 *
 * @param {'en'|'es'} lang
 */
export function setLanguage(lang) {
  if (lang !== 'en' && lang !== 'es') {
    console.warn(`[i18n] Unsupported language "${lang}". Falling back to "en".`);
    lang = 'en';
  }
  currentLanguage = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // localStorage may be unavailable (e.g. SSR, private browsing quota).
  }
}

/**
 * Returns the current language code.
 * @returns {'en'|'es'}
 */
export function getLanguage() {
  return currentLanguage;
}

/**
 * Initializes the language from localStorage or the browser's preferred
 * language.  Call this once at application startup.
 */
export function initLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'es') {
      currentLanguage = stored;
      return;
    }
  } catch {
    // localStorage unavailable — fall through to browser detection.
  }

  // Detect from browser
  try {
    const browserLang =
      (typeof navigator !== 'undefined' && navigator.language) || 'en';
    currentLanguage = browserLang.toLowerCase().startsWith('es') ? 'es' : 'en';
  } catch {
    currentLanguage = 'en';
  }
}
