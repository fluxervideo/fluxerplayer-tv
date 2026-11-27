// FluxerPlayer: la entrada sin sesión. «¿Quién va a ver?» con los usuarios de
// Fluxer guardados en el aparato o, si no hay ninguno, la pantalla del código.

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator';
import Spotlight from '@enact/spotlight';
import {useAuth} from '../context/AuthContext';
import * as jellyfinApi from '../services/jellyfinApi';
import * as multiServerManager from '../services/multiServerManager';
import {CoreAlertDialog} from '../components/CoreDialog';
import ProfileCarousel, {PillButton, PillRow} from '../components/ProfileCarousel';
import {forgetFluxerUser, ownerOf} from './fluxerAccounts';
import {completeLogin, embyTokenValid, sessionFromHub} from './fluxerLogin';
import {fluxerUsers, hubToken} from './fluxerStore';
import {fs} from './fluxerStrings';
import FluxerLogin from './FluxerLoginScreen';

import logoAndText from '../views/Login/logo_and_text.png';
import loginCss from '../views/Login/Login.module.less';

const FocusArea = SpotlightContainerDecorator({enterTo: 'last-focused', restrict: 'self-first'}, 'div');

const focusLater = (id) => setTimeout(() => Spotlight.focus(`[data-spotlight-id="${id}"]`), 100);

const byRecent = (a, b) => (Date.parse(b.lastConnected || '') || 0) - (Date.parse(a.lastConnected || '') || 0);

const FluxerStart = ({onLoggedIn, backHandlerRef}) => {
	const {servers, switchUser, loginWithToken, loadServers} = useAuth();
	// null mientras carga.
	const [accounts, setAccounts] = useState(null);
	const [adding, setAdding] = useState(false);
	const [busy, setBusy] = useState(false);
	const [status, setStatus] = useState(null);
	const [error, setError] = useState(null);
	const [toRemove, setToRemove] = useState(null);
	const selectedRef = useRef(null);
	const loadRef = useRef(0);

	// Los usuarios de Fluxer guardados. El que ya no tiene su token del Hub no
	// cuenta como de Fluxer: se quita del aparato.
	const load = useCallback(async () => {
		const run = ++loadRef.current;
		const owners = await fluxerUsers();
		const all = await multiServerManager.getAllServersArray();
		const valid = [];
		let forgot = false;
		for (const entry of all) {
			const owner = ownerOf(entry);
			if (!owners.includes(owner)) continue;
			// eslint-disable-next-line no-await-in-loop
			if (await hubToken(owner)) {
				valid.push(entry);
			} else {
				// eslint-disable-next-line no-await-in-loop
				await forgetFluxerUser(entry);
				forgot = true;
			}
		}
		if (forgot) await loadServers();
		if (run !== loadRef.current) return;
		setAccounts(valid.sort(byRecent));
	}, [loadServers]);

	// Otra vez cada vez que cambian los guardados (otro usuario entra, se quita…).
	useEffect(() => {
		load();
	}, [load, servers]);

	const hasAccounts = Boolean(accounts?.length);

	useEffect(() => {
		if (hasAccounts && !adding) {
			const timer = focusLater('fluxer-profiles');
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [hasAccounts, adding]);

	const items = useMemo(() => (accounts || []).map((entry) => ({
		key: `${entry.serverId}-${entry.userId}`,
		id: entry.userId,
		name: entry.username,
		imageUrl: entry.primaryImageTag
			? jellyfinApi.getUserImageUrl(entry.url, entry.userId, entry.primaryImageTag, entry.serverType)
			: null,
		lines: [{text: entry.name}],
		removable: true,
		entry
	})), [accounts]);

	const handleSelect = useCallback((item) => {
		selectedRef.current = item?.entry || null;
	}, []);

	const enter = useCallback(async (entry) => {
		if (busy) return;
		setBusy(true);
		setError(null);
		setStatus(fs.connecting);
		try {
			if (await embyTokenValid(entry.url, entry.userId, entry.accessToken)) {
				// switchUser da por buena una sesión caducada: por eso se comprueba antes.
				if (await switchUser(entry.serverId, entry.userId)) {
					onLoggedIn?.();
					return;
				}
			}
			// La sesión de Emby ya no vale: una nueva desde el Hub, sin código.
			const owner = ownerOf(entry);
			const session = await sessionFromHub(owner);
			if (session && await completeLogin(session, loginWithToken)) {
				onLoggedIn?.();
				return;
			}
			if (!(await hubToken(owner))) {
				// El Hub lo ha desvinculado: fuera del aparato, y a vincular otra vez.
				await forgetFluxerUser(entry);
				await loadServers();
				setError(fs.hubSessionFailed);
			} else {
				setError(fs.sessionFailed);
			}
		} catch (e) {
			setError(fs.sessionFailed);
		} finally {
			setBusy(false);
			setStatus(null);
		}
	}, [busy, switchUser, loginWithToken, loadServers, onLoggedIn]);

	const handleActivate = useCallback((item) => enter(item.entry), [enter]);

	const handleAddUser = useCallback(() => {
		setError(null);
		setAdding(true);
	}, []);

	const handleAddBack = useCallback(() => {
		setAdding(false);
		load();
	}, [load]);

	const askRemove = useCallback((item) => {
		const entry = item?.entry || selectedRef.current;
		if (entry) setToRemove(entry);
	}, []);

	const handleRemovePill = useCallback(() => askRemove(null), [askRemove]);

	const closeRemove = useCallback(() => {
		setToRemove(null);
		focusLater('fluxer-profiles');
	}, []);

	const confirmRemove = useCallback(async () => {
		const entry = toRemove;
		setToRemove(null);
		if (!entry) return;
		setBusy(true);
		try {
			await forgetFluxerUser(entry);
			await loadServers();
			await load();
		} finally {
			setBusy(false);
		}
		focusLater('fluxer-profiles');
	}, [toRemove, loadServers, load]);

	// Atrás en «¿Quién va a ver?»: que lo decida la app (salir).
	useEffect(() => {
		if (!backHandlerRef || adding || !hasAccounts) return undefined;
		const handler = () => Boolean(toRemove);
		backHandlerRef.current = handler;
		return () => {
			if (backHandlerRef.current === handler) backHandlerRef.current = null;
		};
	}, [backHandlerRef, adding, hasAccounts, toRemove]);

	if (accounts === null) {
		return (
			<div className={loginCss.page}>
				<div className={loginCss.loading}>
					<div className={loginCss.spinner} />
				</div>
			</div>
		);
	}

	if (!hasAccounts || adding) {
		return (
			<FluxerLogin
				onLoggedIn={onLoggedIn}
				onBack={hasAccounts ? handleAddBack : undefined}
				backHandlerRef={backHandlerRef}
			/>
		);
	}

	return (
		<div className={`${loginCss.page} ${loginCss.pageUsers}`}>
			<FocusArea className={loginCss.usersScreen}>
				<div className={loginCss.usersTop}>
					<img src={logoAndText} alt="Fluxer" className={loginCss.usersLogo} />
				</div>

				<div className={loginCss.usersMain}>
					<h1 className={loginCss.usersTitle}>{fs.whoIsWatching}</h1>
					<ProfileCarousel
						items={items}
						spotlightId="fluxer-profiles"
						onActivate={handleActivate}
						onRemove={askRemove}
						onSelect={handleSelect}
					/>
					{status && <div className={`${loginCss.statusMessage} ${loginCss.usersStatus}`}>{status}</div>}
					{error && <div className={`${loginCss.errorText} ${loginCss.usersNote}`}>{error}</div>}
				</div>

				<PillRow>
					<PillButton data-spotlight-id="fluxer-add-user" icon="person" onClick={handleAddUser} disabled={busy}>
						{fs.addUser}
					</PillButton>
					<PillButton data-spotlight-id="fluxer-remove-user" icon="close" danger onClick={handleRemovePill} disabled={busy}>
						{fs.removeUser}
					</PillButton>
				</PillRow>
			</FocusArea>

			<CoreAlertDialog
				open={Boolean(toRemove)}
				onClose={closeRemove}
				title={fs.removeUser}
				spotlightId="fluxer-remove-dialog"
				actions={[
					{label: fs.cancel, onClick: closeRemove, spotlightId: 'fluxer-remove-cancel'},
					{label: fs.remove, onClick: confirmRemove, spotlightId: 'fluxer-remove-confirm'}
				]}
			>
				{toRemove && fs.removeUserConfirm(toRemove.username)}
			</CoreAlertDialog>
		</div>
	);
};

export default FluxerStart;
