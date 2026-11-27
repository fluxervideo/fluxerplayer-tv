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
	autoLoginAsk: t('Preguntar quién va a ver', 'Ask who is watching')
};
