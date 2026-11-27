// FluxerPlayer: usuarios que entraron con Fluxer y su token del Hub.
//
// Cada usuario se apunta como `<dirección del servidor>|<usuario>`: la app
// guarda los servidores por dirección, así que la clave existe antes de que
// el servidor tenga su id y no cambia al volver a entrar.

import {getFromStorage, saveToStorage} from '../services/storage';

const KEY = 'fluxer';

let state = null;
const listeners = new Set();

export const ownerKey = (serverUrl, userId) => (serverUrl && userId ? `${serverUrl}|${userId}` : null);

const load = async () => {
	if (state) return state;
	let stored = null;
	try {
		stored = await getFromStorage(KEY);
	} catch (e) { /* vacío */ }
	state = {
		users: Array.isArray(stored?.users) ? stored.users : [],
		tokens: stored?.tokens && typeof stored.tokens === 'object' ? stored.tokens : {},
		last: stored?.last || null
	};
	return state;
};

const save = async () => {
	try {
		await saveToStorage(KEY, state);
	} catch (e) { /* vale para esta sesión */ }
	listeners.forEach((fn) => {
		try {
			fn();
		} catch (e) { /* un oyente roto no para a los demás */ }
	});
};

/** Avisa cada vez que se guarda o se borra un token (FluxerLinkGate). */
export const onFluxerChange = (fn) => {
	listeners.add(fn);
	return () => listeners.delete(fn);
};

export const isFluxerUser = async (owner) => Boolean(owner) && (await load()).users.includes(owner);

export const fluxerUsers = async () => [...(await load()).users];

export const addFluxerUser = async (owner) => {
	const s = await load();
	if (!owner || s.users.includes(owner)) return;
	s.users.push(owner);
	await save();
};

export const removeFluxerUser = async (owner) => {
	const s = await load();
	const token = s.tokens[owner];
	s.users = s.users.filter((u) => u !== owner);
	delete s.tokens[owner];
	if (token && s.last === token) s.last = null;
	await save();
};

/** Token del Hub de ese usuario; sin usuario, el último vinculado. */
export const hubToken = async (owner) => {
	const s = await load();
	return owner ? s.tokens[owner] || null : s.last;
};

export const saveHubToken = async (owner, token) => {
	const s = await load();
	if (owner) s.tokens[owner] = token;
	s.last = token;
	await save();
};

export const clearHubToken = async (owner) => {
	const s = await load();
	const token = owner ? s.tokens[owner] : s.last;
	if (owner) delete s.tokens[owner];
	if (token && s.last === token) s.last = null;
	await save();
};
