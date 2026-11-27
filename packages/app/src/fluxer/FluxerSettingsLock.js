// FluxerPlayer: opciones fijadas en cuentas de Fluxer. Con un usuario que entró
// con Fluxer, la app se dibuja como si esas opciones estuvieran guardadas
// (SettingsOverride de Moonfin): lo guardado no se toca, y con cualquier otra
// cuenta todo sigue como en Moonfin. En Ajustes no salen (fluxerFeatures.js).
//
// Para fijar otra: añadir su clave y valor a FLUXER_LOCKED y su fila a
// LOCKED_ROWS de fluxerFeatures.js.

import {useEffect, useMemo, useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {SettingsOverride} from '../context/SettingsContext';
import {fetchSections, saveHomeRows, savedHomeRows, translateSections} from './fluxerHome';
import {isFluxerUser, onFluxerChange, ownerKey} from './fluxerStore';

export const FLUXER_LOCKED = {
	navbarPosition: 'left',
	maxBitrate: 200000000,
	maxVideoResolution: 'auto',
	mergeRecentRowsByType: false,
	featuredBarStyle: 'moonfin',
	homeRowsStyle: 'carousel'
};

// Las filas de inicio se vuelven a leer de Emby cada tanto (y al entrar).
const HOME_REFRESH = 30 * 60 * 1000;

const FluxerSettingsLock = ({children}) => {
	const {isAuthenticated, serverUrl, user, accessToken} = useAuth();
	const owner = isAuthenticated ? ownerKey(serverUrl, user?.Id) : null;
	const [fluxer, setFluxer] = useState(false);
	const [homeRows, setHomeRows] = useState(null);

	useEffect(() => {
		let alive = true;
		const check = () => isFluxerUser(owner).then((yes) => alive && setFluxer(yes));
		check();
		const off = onFluxerChange(check);
		return () => {
			alive = false;
			off();
		};
	}, [owner]);

	// Filas de Emby: primero las guardadas (inicio al momento), luego las del servidor.
	useEffect(() => {
		setHomeRows(null);
		if (!fluxer || !owner || !accessToken) return undefined;
		let alive = true;
		let last = null;
		savedHomeRows(owner).then((rows) => {
			if (alive && rows && !last) setHomeRows(rows);
		});
		const refresh = async () => {
			const sections = await fetchSections(serverUrl, user.Id, accessToken);
			if (!alive || !sections) return; // sin conexión: se queda la última leída
			const rows = translateSections(sections, serverUrl);
			const json = JSON.stringify(rows);
			if (json === last) return;
			last = json;
			setHomeRows(rows);
			saveHomeRows(owner, rows);
		};
		refresh();
		const timer = setInterval(refresh, HOME_REFRESH);
		return () => {
			alive = false;
			clearInterval(timer);
		};
	}, [fluxer, owner, serverUrl, user?.Id, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

	const overrides = useMemo(() => {
		if (!fluxer) return null;
		return homeRows ? {...FLUXER_LOCKED, homeRows} : FLUXER_LOCKED;
	}, [fluxer, homeRows]);

	return <SettingsOverride overrides={overrides}>{children}</SettingsOverride>;
};

export default FluxerSettingsLock;
