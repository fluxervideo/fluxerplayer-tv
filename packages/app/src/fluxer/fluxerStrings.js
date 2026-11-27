// FluxerPlayer: textos propios en español e inglés.

const language = () => {
	try {
		const stored = localStorage.getItem('moonfin_uiLanguage') ||
			JSON.parse(localStorage.getItem('moonfin_settings') || '{}').uiLanguage;
		if (stored) return stored;
	} catch (e) { /* sin almacenamiento */ }
	return (typeof navigator !== 'undefined' && navigator.language) || 'en';
};

// El idioma solo cambia reiniciando la app, así que basta con leerlo una vez.
const es = String(language()).toLowerCase().startsWith('es');
const t = (spanish, english) => (es ? spanish : english);

export const fs = {
	signInWithFluxer: t('Entrar con Fluxer', 'Sign in with Fluxer'),
	loginTitle: t('Inicia sesión en Fluxer', 'Sign in to Fluxer'),
	loginSubtitleTv: t('Entra con tu móvil', 'Sign in with your phone'),
	relinkTitle: t('Vuelve a entrar con Fluxer', 'Sign in with Fluxer again'),
	relinkSubtitle: (user) => t(
		`Para seguir como ${user}, entra otra vez con tu cuenta de Fluxer`,
		`To keep watching as ${user}, sign in with your Fluxer account again`
	),
	relinkSwitchUser: t('Cambiar de usuario', 'Switch user'),
	relinkSignOut: t('Cerrar sesión', 'Sign out'),
	stepOpen: t('En tu móvil u ordenador, entra en', 'On your phone or computer, go to'),
	stepCode: t('Escribe este código', 'Enter this code'),
	stepAccept: t('Elige tu cuenta y pulsa «Dar acceso a la app»', 'Choose your account and tap “Give the app access”'),
	scanQr: t('o escanea con la cámara', 'or scan with the camera'),
	waiting: t('Esperando a que lo aceptes…', 'Waiting for you to accept…'),
	gettingCode: t('Pidiendo un código…', 'Getting a code…'),
	connecting: t('Conectando con tu servidor…', 'Connecting to your server…'),
	newCode: t('Pedir otro código', 'Get a new code'),
	back: t('Volver', 'Back'),
	hubUnreachable: t('No se ha podido contactar con Fluxer. Revisa tu conexión.', 'Could not reach Fluxer. Check your connection.'),
	stillTrying: t('Sin conexión con Fluxer, reintentando…', 'No connection to Fluxer, retrying…'),
	serverUnreachable: (name) => t(
		`Acceso aceptado, pero no se ha podido conectar con ${name}. Inténtalo de nuevo.`,
		`Access granted, but ${name} could not be reached. Please try again.`
	),
	sessionFailed: t('No se ha podido abrir la sesión. Inténtalo de nuevo.', 'Could not open the session. Please try again.'),
	hubSessionFailed: t(
		'No se ha podido entrar con tu cuenta. Usa el código para volver a vincular la app.',
		'Could not sign in with your account. Use the code to link the app again.'
	),
	whoIsWatching: t('¿Quién va a ver?', 'Who is watching?'),
	addUser: t('Añadir usuario', 'Add user'),
	removeUser: t('Quitar este usuario', 'Remove this user'),
	removeUserConfirm: (name) => t(
		`${name} dejará de estar en este aparato. Para volver tendrá que entrar con su cuenta de Fluxer.`,
		`${name} will be removed from this device. Signing in with their Fluxer account brings them back.`
	),
	remove: t('Quitar', 'Remove'),
	cancel: t('Cancelar', 'Cancel'),
	autoLoginTitle: t('Al abrir la app', 'When the app opens'),
	autoLoginLastUser: t('Entrar con el último usuario', 'Continue as the last user'),
	autoLoginThisUser: t('Entrar con este usuario', 'Continue as this user'),
	autoLoginAsk: t('Preguntar quién va a ver', 'Ask who is watching'),

	// Avisos de la cuenta (FluxerHubNotices)
	later: t('Más tarde', 'Later'),
	ok: t('Entendido', 'OK'),
	renew: t('Renovar', 'Renew'),
	choosePlan: t('Elegir plan', 'Choose a plan'),
	planTitle: t('Tu plan de Fluxer', 'Your Fluxer plan'),
	planNotActive: (label) => t(
		`Tu plan está «${label}». Renuévalo para seguir viendo Fluxer.`,
		`Your plan is “${label}”. Renew it to keep watching Fluxer.`
	),
	planEndsSoon: (date, days) => (days <= 1
		? t(`Tu plan caduca hoy o mañana (${date}). Renuévalo para no quedarte sin Fluxer.`, `Your plan ends today or tomorrow (${date}). Renew it to keep watching.`)
		: t(`Tu plan caduca en ${days} días (${date}). Renuévalo para no quedarte sin Fluxer.`, `Your plan ends in ${days} days (${date}). Renew it to keep watching.`)),
	serverIncidentTitle: t('Incidencia en tu servidor', 'Problem with your server'),
	serverIncident: (name) => t(
		`Estamos teniendo problemas con ${name}. Ya lo estamos arreglando: si algo no carga, inténtalo en un rato.`,
		`We are having problems with ${name}. We are already fixing it: if something does not load, try again shortly.`
	),
	yourServer: t('tu servidor', 'your server'),

	// Portal por QR (FluxerPortalDialog)
	scanWithPhone: t('Escanéalo con la cámara del móvil', 'Scan it with your phone camera'),
	portalLinkHint: t('Entrarás ya con tu cuenta. El código vale 10 minutos.', 'You will be signed in already. The code is valid for 10 minutes.'),
	portalLoading: t('Preparando el enlace…', 'Preparing the link…'),
	portalFailed: t('No se ha podido preparar el enlace. Inténtalo en un momento.', 'Could not prepare the link. Please try again shortly.'),
	close: t('Cerrar', 'Close')
};
