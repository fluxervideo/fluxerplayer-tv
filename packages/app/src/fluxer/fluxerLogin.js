// FluxerPlayer: entrar con un código aceptado en la cuenta de Fluxer.

import * as jellyfinApi from '../services/jellyfinApi';
import {platformFetch} from '../services/secureFetch';
import {hubFetch, hubSession} from './fluxerHub';
import {addFluxerUser, ownerKey, saveHubToken} from './fluxerStore';

// Igual que la cabecera que la app manda a Emby: el Hub recibe los mismos
// datos de aparato, ya limpiados, para que Emby vea un solo dispositivo.
const sanitize = (value) => {
	const cleaned = String(value == null ? '' : value)
		.replace(/[^\x20-\x7E]/g, ' ')
		.replace(/["\\]/g, '')
		.replace(/,/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return cleaned || 'Unknown';
};
const clamp = (value, max) => (value.length <= max ? value : value.slice(0, max));

/** Pide un código nuevo: {code, secret, approveUrl, interval (ms), expiresAt (ms)}. */
export const startLogin = async () => {
	const device = jellyfinApi.getDeviceInfo();
	const data = await hubFetch('app-login/start', {
		method: 'POST',
		body: {
			device_id: sanitize(device.deviceId),
			device_name: clamp(sanitize(device.deviceName), 80),
			client_name: clamp(sanitize(device.appName), 60),
			app_version: clamp(sanitize(device.appVersion), 30)
		}
	});
	const seconds = Number(data?.interval) || 5;
	const expires = Date.parse(data?.expires_at || '');
	return {
		code: data.code,
		secret: data.secret,
		approveUrl: data.approve_url,
		interval: Math.max(seconds, 2) * 1000,
		expiresAt: Number.isNaN(expires) ? Date.now() + 10 * 60 * 1000 : expires
	};
};

const toSession = (data) => ({
	serverUrl: String(data.server_url || '').replace(/\/+$/, ''),
	serverName: data.server_name || '',
	userId: data.user_id,
	userName: data.user_name || '',
	accessToken: data.access_token,
	hubToken: data.hub_token || null
});

/** ¿Ya lo ha aceptado el cliente? {status: 'pending'|'approved'|'expired', session}. */
export const pollLogin = async (secret) => {
	const data = await hubFetch('app-login/status', {method: 'POST', body: {secret}});
	if (data?.status === 'approved') return {status: 'approved', session: toSession(data)};
	if (data?.status === 'pending') return {status: 'pending'};
	return {status: 'expired'};
};

/** Sesión de Emby nueva desde el Hub (app ya vinculada). Null si no puede. */
export const sessionFromHub = async (owner) => {
	const data = await hubSession(owner);
	return data?.access_token ? toSession(data) : null;
};

const serverReachable = async (url) => {
	try {
		const response = await platformFetch(`${url}/System/Info/Public`, {}, 10000);
		return response.ok;
	} catch (e) {
		return false;
	}
};

/**
 * Guarda servidor + usuario y abre la sesión, con el loginWithToken de la app
 * (el de Emby Connect). Devuelve false si no se puede conectar con el servidor.
 */
export const completeLogin = async (session, loginWithToken) => {
	if (!session.serverUrl || !(await serverReachable(session.serverUrl))) return false;
	const owner = ownerKey(session.serverUrl, session.userId);
	// Antes de abrir la sesión: si no, FluxerLinkGate la vería sin token un momento.
	await addFluxerUser(owner);
	if (session.hubToken) await saveHubToken(owner, session.hubToken);
	await loginWithToken(
		session.serverUrl,
		{User: {Id: session.userId, Name: session.userName}, AccessToken: session.accessToken},
		{serverName: session.serverName || undefined, serverType: 'emby'}
	);
	return true;
};

/** ¿Sigue valiendo el token de Emby guardado de ese usuario? */
export const embyTokenValid = async (serverUrl, userId, accessToken) => {
	if (!accessToken) return false;
	try {
		const response = await platformFetch(`${serverUrl}/Users/${userId}`, {
			headers: {'X-Emby-Token': accessToken, Accept: 'application/json'}
		}, 10000);
		return response.ok;
	} catch (e) {
		// Sin conexión no se sabe: que lo intente la app.
		return true;
	}
};

/** Cierra la sesión de Emby de ese token (al quitar un usuario). */
export const embyLogout = async (serverUrl, accessToken) => {
	if (!accessToken) return;
	try {
		await platformFetch(`${serverUrl}/Sessions/Logout`, {
			method: 'POST',
			headers: {'X-Emby-Token': accessToken}
		}, 5000);
	} catch (e) { /* da igual */ }
};
