// FluxerPlayer: filas de inicio según las secciones de inicio del servidor Emby
// (/Users/{id}/HomeSections, las que configura Home Screen Companion), con su
// orden y su nombre:
//   resume, nextup, userviews/mymedia, latestmedia → filas propias de Moonfin;
//   boxset, collections, items → filas «de Fluxer» (fuente `fluxer` de
//   pickedRows), que se cargan como las pediría la web de Emby.
// La primera sección spotlight es la barra de medios, que ya está siempre puesta.

import {platformFetch} from '../services/secureFetch';
import {getFromStorage, saveToStorage} from '../services/storage';
import {DEFAULT_HOME_ROWS} from '../utils/homeLayout';

const STORAGE_KEY = 'fluxerHome';
export const FLUXER_ROW_SOURCE = 'fluxer';

const ITEM_FIELDS = 'PrimaryImageAspectRatio,BasicSyncInfo,Overview,ProductionYear,Genres,' +
	'CommunityRating,OfficialRating,ProviderIds,ChildCount,RecursiveItemCount';

const ids = (value) => (Array.isArray(value) ? value.map(String).filter(Boolean) : []);
const csv = (value) => {
	const list = ids(value);
	return list.length ? list.join(',') : undefined;
};

const fluxerRow = (serverUrl, section, query) => ({
	id: `pluginDynamic:${FLUXER_ROW_SOURCE}:${serverUrl}:fluxer:${section.Id}`,
	name: String(section.CustomName || section.Name || ''),
	source: FLUXER_ROW_SOURCE,
	serverUrl,
	itemId: String(section.Id),
	query
});

/** Secciones de Emby → lista de filas de Moonfin (las demás, apagadas). */
export const translateSections = (sections, serverUrl) => {
	const rows = [];
	const has = (id) => rows.some((row) => row.id === id);
	const builtin = (id) => {
		if (!has(id)) rows.push({...DEFAULT_HOME_ROWS.find((row) => row.id === id)});
	};
	let spotlightUsed = false;

	for (const section of Array.isArray(sections) ? sections : []) {
		const type = String(section?.SectionType || '').toLowerCase();
		const query = section?.Query || {};
		switch (type) {
			case 'boxset': {
				const parentId = String(section.ParentId || '');
				if (!parentId) break;
				if (!spotlightUsed && String(section.ViewType || '').toLowerCase() === 'spotlight') {
					spotlightUsed = true;
				} else {
					rows.push(fluxerRow(serverUrl, section, {kind: 'boxset', parentId}));
				}
				break;
			}
			case 'resume':
				builtin('resume');
				break;
			case 'nextup':
				builtin('nextup');
				break;
			case 'userviews':
			case 'mymedia':
				builtin('library-tiles');
				break;
			case 'latestmedia':
				builtin('latest-media');
				break;
			case 'collections':
				rows.push(fluxerRow(serverUrl, section, {kind: 'collections', sortBy: section.SortBy, sortOrder: section.SortOrder}));
				break;
			case 'items':
				rows.push(fluxerRow(serverUrl, section, {
					kind: 'items',
					itemTypes: ids(section.ItemTypes),
					tagIds: ids(query.TagIds),
					genreIds: ids(query.GenreIds),
					studioIds: ids(query.StudioIds),
					sortBy: section.SortBy,
					sortOrder: section.SortOrder
				}));
				break;
			default:
				// Tipos que Moonfin no sabe enseñar igual (TV en directo…): fuera.
				break;
		}
	}

	const enabled = rows.map((row, order) => ({...row, enabled: true, order}));
	const rest = DEFAULT_HOME_ROWS
		.filter((row) => !enabled.some((own) => own.id === row.id))
		.map((row, i) => ({...row, enabled: false, order: enabled.length + i}));
	return [...enabled, ...rest];
};

/** Lee las secciones de Emby del usuario. Null si no se puede. */
export const fetchSections = async (serverUrl, userId, accessToken) => {
	try {
		const response = await platformFetch(`${serverUrl}/Users/${userId}/HomeSections`, {
			headers: {'X-Emby-Token': accessToken, Accept: 'application/json'}
		}, 20000);
		if (!response.ok) return null;
		const data = await response.json();
		// Según la versión de Emby llega como lista o como {Items: [...]}.
		return Array.isArray(data) ? data : Array.isArray(data?.Items) ? data.Items : null;
	} catch (e) {
		return null;
	}
};

/** La última configuración guardada de ese usuario, o null. */
export const savedHomeRows = async (owner) => {
	try {
		const stored = await getFromStorage(STORAGE_KEY);
		return stored?.owner === owner && Array.isArray(stored.rows) ? stored.rows : null;
	} catch (e) {
		return null;
	}
};

export const saveHomeRows = async (owner, rows) => {
	try {
		await saveToStorage(STORAGE_KEY, {owner, rows});
	} catch (e) { /* vale para esta sesión */ }
};

/** Contenido de una fila «de Fluxer», como lo pediría la web de Emby. */
export const fluxerRowItems = async (api, row, limit) => {
	const query = row?.query || {};
	const params = {
		Limit: limit,
		Fields: ITEM_FIELDS,
		EnableImageTypes: 'Primary,Backdrop,Thumb,Logo',
		ImageTypeLimit: 1
	};
	switch (query.kind) {
		case 'boxset':
			params.ParentId = query.parentId;
			break;
		case 'collections':
			params.Recursive = true;
			params.IncludeItemTypes = 'BoxSet';
			params.SortBy = query.sortBy || 'SortName';
			params.SortOrder = query.sortOrder || 'Ascending';
			break;
		case 'items':
			params.Recursive = true;
			params.IncludeItemTypes = csv(query.itemTypes);
			params.TagIds = csv(query.tagIds);
			params.GenreIds = csv(query.genreIds);
			params.StudioIds = csv(query.studioIds);
			if (query.sortBy) params.SortBy = query.sortBy;
			if (query.sortOrder) params.SortOrder = query.sortOrder;
			break;
		default:
			return {Items: []};
	}
	Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);
	return (await api.getItems(params)) || {Items: []};
};
