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

// «me» lo piden varias pantallas a la vez (avisos, Mi cuenta): 1 minuto de caché.
let meCache = null;

/**
 * Estado del plan, servidor, avisos y URLs del portal del usuario abierto.
 * Null si la app no está vinculada o no hay conexión.
 */
export const hubMe = async ({fresh = false} = {}) => {
	const owner = activeOwner();
	const token = await hubToken(owner);
	if (!token) return null;
	if (!fresh && meCache && meCache.token === token && Date.now() - meCache.at < 60 * 1000) return meCache.data;
	const data = await appRequest('me', {owner});
	meCache = data ? {token, at: Date.now(), data} : null;
	return data;
};

/** Marca como leído un aviso global de ventana. */
export const hubAcknowledgeNotice = (id) => appRequest(`notices/${id}/acknowledge`, {method: 'POST', body: {}});

/**
 * Enlace al portal con la sesión ya iniciada (un solo uso, 10 min).
 * `to`: plans, account o support. Null si no está vinculada o sin conexión.
 */
export const hubPortalLink = async (to) => {
	const data = await appRequest('portal-link', {method: 'POST', body: {to}});
	return data?.url || null;
};

/**
 * «Reportar un problema». Devuelve su número en FluxerHub; null si la app ya
 * no está vinculada. Lanza un error si no se ha podido enviar.
 */
export const hubReport = async (report) => {
	const body = {};
	Object.keys(report).forEach((key) => {
		if (report[key] !== undefined && report[key] !== null && report[key] !== '') body[key] = report[key];
	});
	const data = await appRequest('reports', {method: 'POST', body, rethrow: true});
	if (data === null) return null;
	return Number(data?.id) || 0;
};

/** «Tendencias de hoy» del servidor de la app: ids de Emby en orden. */
export const hubTrendingIds = async () => {
	const data = await appRequest('trending');
	return Array.isArray(data?.ids) ? data.ids.filter((id) => typeof id === 'string') : [];
};
