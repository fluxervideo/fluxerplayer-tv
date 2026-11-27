// FluxerPlayer: usuarios de Fluxer guardados en el aparato (quitar, cerrar sesión).

import {useCallback, useEffect, useState} from 'react';
import {useAuth} from '../context/AuthContext';
import * as multiServerManager from '../services/multiServerManager';
import * as remoteControl from '../services/remoteControl';
import {removeFromStorage} from '../services/storage';
import {hubLogout} from './fluxerHub';
import {embyLogout} from './fluxerLogin';
import {fluxerUsers, onFluxerChange, ownerKey, removeFluxerUser} from './fluxerStore';

/** Clave de fluxerStore de una entrada de multiServerManager. */
export const ownerOf = (entry) => ownerKey(entry?.url, entry?.userId);

/**
 * Quita un usuario del aparato: lo desvincula en el Hub, cierra su sesión de
 * Emby y lo borra. Con multiServerManager.removeServer y no con removeUser de
 * AuthContext, que abre otro usuario.
 */
export const forgetFluxerUser = async (entry) => {
	const owner = ownerOf(entry);
	await hubLogout(owner);
	await embyLogout(entry.url, entry.accessToken);
	await multiServerManager.removeServer(entry.serverId, entry.userId);
	await removeFluxerUser(owner);
	// Sin usuarios, que AuthContext no intente abrir la sesión vieja al arrancar.
	if ((await multiServerManager.getTotalUserCount()) === 0) await removeFromStorage('auth');
};

/**
 * Cierra la sesión del usuario abierto: lo quita del aparato y vuelve a
 * «¿Quién va a ver?» (o a la pantalla del código si no queda nadie).
 */
export const useFluxerSignOut = () => {
	const {leaveSession, loadServers} = useAuth();
	return useCallback(async () => {
		await remoteControl.runPlayerCommand('stop');
		const active = await multiServerManager.getActiveServer();
		if (active) await forgetFluxerUser(active);
		await loadServers();
		leaveSession();
	}, [leaveSession, loadServers]);
};

/** Cierra la sesión de todos los usuarios de Fluxer del aparato. */
export const useFluxerSignOutAll = () => {
	const {logoutAll} = useAuth();
	return useCallback(async () => {
		const all = await multiServerManager.getAllServersArray();
		const owners = await fluxerUsers();
		for (const entry of all) {
			// eslint-disable-next-line no-await-in-loop
			if (owners.includes(ownerOf(entry))) await forgetFluxerUser(entry);
		}
		await logoutAll();
	}, [logoutAll]);
};

/** Claves de los usuarios de Fluxer (Set), al día con fluxerStore. Null mientras carga. */
export const useFluxerUsers = () => {
	const [owners, setOwners] = useState(null);
	useEffect(() => {
		let alive = true;
		const refresh = () => fluxerUsers().then((list) => {
			if (alive) setOwners(new Set(list));
		});
		refresh();
		const off = onFluxerChange(refresh);
		return () => {
			alive = false;
			off();
		};
	}, []);
	return owners;
};
