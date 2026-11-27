// FluxerPlayer: API de la app en FluxerHub (token propio, solo /api/app/*).

import * as jellyfinApi from '../services/jellyfinApi';
import {platformFetch} from '../services/secureFetch';
import {FLUXER_HUB_URL} from './fluxerConfig';
import {clearHubToken, hubToken, ownerKey} from './fluxerStore';

const TIMEOUT = 15000;

/** El usuario abierto ahora, como lo apunta fluxerStore. */
export const activeOwner = () => ownerKey(jellyfinApi.getServerUrl(), jellyfinApi.getUserId());

/** POST/GET a FluxerHub con JSON. Lanza un error con `status` si no es 2xx. */
export const hubFetch = async (path, {method = 'GET', body, token} = {}) => {
	const headers = {Accept: 'application/json'};
	if (body !== undefined) headers['Content-Type'] = 'application/json';
	if (token) headers['X-App-Token'] = token;
	const response = await platformFetch(`${FLUXER_HUB_URL}/api/${path}`, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body)
	}, TIMEOUT);
	let data = null;
	try {
		data = await response.json();
	} catch (e) { /* sin cuerpo */ }
	if (!response.ok) {
		const error = new Error(data?.message || `HTTP ${response.status}`);
		error.status = response.status;
		error.data = data;
		throw error;
	}
	return data;
};

// Con el token del usuario. Si el Hub lo rechaza (401), se borra: la app ya no
// está vinculada para ese usuario. Null si no hay token o se ha rechazado.
const appRequest = async (path, {owner = activeOwner(), rethrow = false, ...options} = {}) => {
	const token = await hubToken(owner);
	if (!token) return null;
	try {
		return await hubFetch(`app/${path}`, {...options, token});
	} catch (error) {
		if (error.status === 401) {
			await clearHubToken(owner);
			return null;
		}
		if (rethrow) throw error;
		return null;
	}
};

/**
 * Sesión de Emby nueva, sin contraseña, para la cuenta vinculada. Null si la
 * app no está vinculada o el Hub no puede dársela (cuenta inactiva…).
 */
export const hubSession = async (owner) => {
	try {
		return await appRequest('session', {method: 'POST', body: {}, owner, rethrow: true});
	} catch (e) {
		return null;
	}
};

/** Desvincula ese usuario en el Hub y borra su token. */
export const hubLogout = async (owner = activeOwner()) => {
	await appRequest('logout', {method: 'POST', body: {}, owner});
	await clearHubToken(owner);
};
