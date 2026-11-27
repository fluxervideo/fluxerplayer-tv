// FluxerPlayer: un usuario de Fluxer sin sesión de Fluxer en el aparato no
// puede seguir: «Vuelve a entrar con Fluxer» por encima de toda la app. Pasa
// al abrir la app o cambiar a un usuario sin token, y cuando el Hub lo rechaza
// (aparato desvinculado: fluxerHub borra el token con un 401). Sin conexión
// con el Hub no se tapa nada: solo cuenta lo guardado y lo que el Hub conteste.

import {useCallback, useEffect, useState} from 'react';
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator';
import {useAuth} from '../context/AuthContext';
import * as remoteControl from '../services/remoteControl';
import {useFluxerSignOut} from './fluxerAccounts';
import {hubToken, isFluxerUser, onFluxerChange, ownerKey} from './fluxerStore';
import FluxerLogin from './FluxerLoginScreen';

import css from './Fluxer.module.less';

const GateArea = SpotlightContainerDecorator({
	enterTo: 'last-focused',
	restrict: 'self-only',
	leaveFor: {left: '', right: '', up: '', down: ''}
}, 'div');

/**
 * `activeRef.current` queda a true mientras tapa la app, para que App no haga
 * nada con Atrás. `onLoggedIn` al volver a entrar; `onSwitchUser` tras dejar
 * la sesión para elegir otro usuario.
 */
const FluxerLinkGate = ({activeRef, onLoggedIn, onSwitchUser}) => {
	const {isAuthenticated, serverUrl, user, leaveSession} = useAuth();
	const signOut = useFluxerSignOut();
	const [blocked, setBlocked] = useState(null);
	const owner = isAuthenticated ? ownerKey(serverUrl, user?.Id) : null;

	useEffect(() => {
		let alive = true;
		const check = async () => {
			let next = null;
			try {
				if (owner && (await isFluxerUser(owner)) && !(await hubToken(owner))) next = owner;
			} catch (e) {
				next = null;
			}
			if (alive) setBlocked(next);
		};
		check();
		const off = onFluxerChange(check);
		return () => {
			alive = false;
			off();
		};
	}, [owner]);

	const active = Boolean(blocked) && blocked === owner;

	useEffect(() => {
		if (activeRef) activeRef.current = active;
		// Que no siga sonando detrás.
		if (active) remoteControl.runPlayerCommand('stop');
	}, [active, activeRef]);

	const handleSwitchUser = useCallback(() => {
		leaveSession();
		onSwitchUser?.();
	}, [leaveSession, onSwitchUser]);

	const handleSignOut = useCallback(async () => {
		await signOut();
		onSwitchUser?.();
	}, [signOut, onSwitchUser]);

	if (!active) return null;

	return (
		<GateArea className={css.overlay} spotlightId="fluxer-gate">
			<FluxerLogin
				key={blocked}
				relinkUser={user?.Name || ''}
				onLoggedIn={onLoggedIn}
				onSwitchUser={handleSwitchUser}
				onSignOut={handleSignOut}
			/>
		</GateArea>
	);
};

export default FluxerLinkGate;
