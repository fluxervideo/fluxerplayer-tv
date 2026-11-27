// FluxerPlayer: avisos de la cuenta de Fluxer, al abrir la app y cada 30 min:
// - el plan, si no está activo o caduca en ≤5 días sin renovarse solo (una vez al día);
// - incidencias en el servidor (una vez cada 6 h mientras duren);
// - mantenimientos (una vez cada uno) y avisos globales de ventana (hasta cerrarlos).
// Un fallo del Hub nunca molesta: se reintenta en la siguiente vuelta.

import {useCallback, useEffect, useRef, useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {CoreAlertDialog} from '../components/CoreDialog';
import {useFluxerDialog} from './fluxerDialogs';
import {hubAcknowledgeNotice, hubMe} from './fluxerHub';
import {loadSeen, noticesFor, saveSeen} from './fluxerNotices';
import {isFluxerUser, ownerKey} from './fluxerStore';
import {fs} from './fluxerStrings';
import FluxerPortalDialog from './FluxerPortalDialog';

const FIRST_CHECK = 8000;
const INTERVAL = 30 * 60 * 1000;

/** `hold`: no enseñar nada ahora (reproduciendo, tapada…); los avisos esperan. */
const FluxerHubNotices = ({hold}) => {
	const {isAuthenticated, serverUrl, user} = useAuth();
	const owner = isAuthenticated ? ownerKey(serverUrl, user?.Id) : null;
	const [cards, setCards] = useState([]);
	const [portal, setPortal] = useState(null);
	const runningRef = useRef(false);
	const current = hold || portal ? null : cards[0] || null;
	useFluxerDialog(Boolean(current));

	useEffect(() => {
		setCards([]);
		if (!owner) return undefined;
		let alive = true;
		const check = async () => {
			if (runningRef.current || !(await isFluxerUser(owner))) return;
			runningRef.current = true;
			try {
				const me = await hubMe({fresh: true});
				if (!alive || !me) return;
				const seen = await loadSeen();
				const next = noticesFor(me, seen);
				await saveSeen(seen);
				if (alive && next.length) {
					setCards((prev) => [...prev, ...next.filter((card) => !prev.some((p) => p.key === card.key))]);
				}
			} catch (e) {
				// Se reintenta en la siguiente vuelta.
			} finally {
				runningRef.current = false;
			}
		};
		const first = setTimeout(check, FIRST_CHECK);
		const timer = setInterval(check, INTERVAL);
		return () => {
			alive = false;
			clearTimeout(first);
			clearInterval(timer);
		};
	}, [owner]);

	const dismiss = useCallback(() => {
		const card = cards[0];
		if (card?.acknowledge) hubAcknowledgeNotice(card.acknowledge);
		setCards((prev) => prev.slice(1));
	}, [cards]);

	const handleAction = useCallback(() => {
		const card = cards[0];
		setCards((prev) => prev.slice(1));
		if (card) setPortal({title: card.action, fallbackUrl: card.plansUrl});
	}, [cards]);

	const closePortal = useCallback(() => setPortal(null), []);

	const actions = current?.action
		? [
			{label: fs.later, onClick: dismiss, spotlightId: 'fluxer-notice-later'},
			{label: current.action, onClick: handleAction, spotlightId: 'fluxer-notice-action'}
		]
		: [{label: fs.ok, onClick: dismiss, spotlightId: 'fluxer-notice-ok'}];

	return (
		<>
			<CoreAlertDialog open={Boolean(current)} onClose={dismiss} title={current?.title} actions={actions} spotlightId="fluxer-notice">
				{current?.text}
			</CoreAlertDialog>
			<FluxerPortalDialog
				open={Boolean(portal)}
				to="plans"
				title={portal?.title}
				fallbackUrl={portal?.fallbackUrl}
				onClose={closePortal}
			/>
		</>
	);
};

export default FluxerHubNotices;
