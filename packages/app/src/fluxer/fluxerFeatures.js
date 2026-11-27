// FluxerPlayer: funciones de Moonfin que no salen en FluxerPlayer. El código de
// Moonfin no se borra, solo se ocultan sus entradas, para que las
// actualizaciones no den conflictos. Al fusionar una versión nueva de Moonfin,
// revisar si trae funciones nuevas que convenga ocultar aquí.

import {isGameLibrary} from '../utils/gameLibrary';
import {fs} from './fluxerStrings';

export const FLUXER_FEATURES = {
	/** Asistente inicial y «Run setup again». */
	setupWizard: false,
	/** Seerr (peticiones, filas, botón, búsqueda). */
	seerr: false,
	/** Bibliotecas de juegos y RomM. */
	games: false,
	/** Bibliotecas de libros y sus opciones. */
	books: false,
	/** Bibliotecas de música y sus opciones. */
	music: false,
	/** Achievement Badges (logros y amigos). */
	achievements: false,
	/** Enlaces de la comunidad de Moonfin (Discord, donar, incidencias en GitHub). */
	moonfinLinks: false
};

const off = (feature) => !FLUXER_FEATURES[feature];

/** ¿Se oculta esta biblioteca (menú y barra de navegación)? */
export const fluxerHidesLibrary = (library) => {
	const type = String(library?.CollectionType || '').toLowerCase();
	if (off('books') && type === 'books') return true;
	if (off('music') && type === 'music') return true;
	if (off('games') && isGameLibrary(library?.Id, library?.CollectionType, library?.Name)) return true;
	return false;
};

export const fluxerLibraries = (libraries) => (libraries || []).filter((library) => !fluxerHidesLibrary(library));

// Ajustes: `<categoría>.<subcategoría>` y filas (por id o key) que no salen.
const HIDDEN_SUBCATEGORIES = {
	'integrations.seerr': 'seerr',
	'integrations.achievements': 'achievements',
	'integrations.romm': 'games'
};

const HIDDEN_ROWS = {
	runSetupAgain: 'setupWizard',
	reportIssue: 'moonfinLinks',
	joinDiscord: 'moonfinLinks',
	supportMoonfin: 'moonfinLinks',
	showSeerrButton: 'seerr',
	seerrHomeRows: 'seerr',
	externalCalendars: 'seerr',
	calendarRequestButton: 'seerr',
	showFriendsButton: 'achievements',
	showBookDiscoverTab: 'books',
	bookFoldersAsSeries: 'books',
	bookLibraryStyle: 'books',
	musicLibraryStyle: 'music',
	displayAudioRows: 'music',
	playbackTimeMusic: 'music',
	musicPlaybackTimeDisplay: 'music',
	screensaverDuringAudio: 'music'
};

// Opciones que fija FluxerSettingsLock (y lo que solo sirve para cambiarlas): no salen.
const LOCKED_ROWS = new Set([
	'navbarPosition', 'navbarAlwaysExpanded', 'maxBitrate', 'maxVideoResolution', 'mergeRecentRowsByType',
	'featuredBarStyle', 'homeRowsStyle',
	// Las filas de inicio son las de Emby.
	'homeRows', 'externalSources', 'imdbLists', 'externalTmdbLists', 'seasonalRow', 'externalCustomRows'
]);

const rowHidden = (row) => {
	if (LOCKED_ROWS.has(row.id) || LOCKED_ROWS.has(row.key)) return true;
	const feature = HIDDEN_ROWS[row.id] || HIDDEN_ROWS[row.key];
	return Boolean(feature) && off(feature);
};

// «Mi cuenta Fluxer», la primera sección de Ajustes (la pinta FluxerAccountPanel).
const FLUXER_ACCOUNT_CATEGORY = {
	id: 'fluxerAccount',
	label: () => fs.fluxerAccount,
	description: () => fs.fluxerAccountSubtitle,
	icon: 'account_circle',
	when: (ctx) => !ctx.settings.kidsModeEnabled,
	subcategories: [{
		id: 'fluxerAccount',
		clean: true,
		icon: 'account_circle',
		label: () => fs.fluxerAccount,
		description: () => fs.fluxerAccountSubtitle,
		rows: [{kind: 'custom', id: 'fluxerAccountPanel', render: 'fluxerAccount'}]
	}]
};

/** El esquema de Ajustes de Moonfin sin lo que FluxerPlayer no tiene, y con «Mi cuenta Fluxer». */
export const fluxerSchema = (schema) => [FLUXER_ACCOUNT_CATEGORY, ...schema].map((category) => ({
	...category,
	subcategories: category.subcategories
		.filter((sub) => {
			const feature = HIDDEN_SUBCATEGORIES[`${category.id}.${sub.id}`];
			return !feature || !off(feature);
		})
		.map((sub) => ({...sub, rows: (sub.rows || []).filter((row) => !rowHidden(row))}))
}));
