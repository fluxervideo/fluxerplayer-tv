// FluxerPlayer: entrar con Fluxer. La tele enseña un código y un QR, el
// cliente lo acepta desde el móvil en FluxerHub y la app entra sola.
//
// Con `relinkUser`, «Vuelve a entrar con Fluxer»: el usuario abierto ya no
// tiene sesión de Fluxer en el aparato (FluxerLinkGate).

import {useCallback, useEffect, useRef, useState} from 'react';
import Spottable from '@enact/spotlight/Spottable';
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator';
import Spotlight from '@enact/spotlight';
import {useAuth} from '../context/AuthContext';
import {drawQrCode} from '../utils/qrCanvas';
import {completeLogin, pollLogin, startLogin} from './fluxerLogin';
import {fs} from './fluxerStrings';

import logoAndText from '../views/Login/logo_and_text.png';
import loginCss from '../views/Login/Login.module.less';
import css from './Fluxer.module.less';

const SpottableButton = Spottable('button');
const FocusArea = SpotlightContainerDecorator({enterTo: 'last-focused', restrict: 'self-first'}, 'div');

// Tras tantos fallos seguidos al preguntar, se avisa (pero se sigue preguntando).
const POLL_FAILURES_BEFORE_NOTICE = 3;

/** "K7Q2M9" → "K7Q 2M9": más fácil de leer en una tele. */
const pretty = (code) => (code && code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code || '');

/** "https://hub.fluxer.video/portal/vincular?codigo=X" → "hub.fluxer.video/portal/vincular". */
const shortUrl = (url) => {
	const match = /^[a-z]+:\/\/([^?#]*)/i.exec(url || '');
	return match ? match[1].replace(/\/+$/, '') : url || '';
};

const focusLater = (id) => setTimeout(() => Spotlight.focus(`[data-spotlight-id="${id}"]`), 100);

const FluxerLogin = ({relinkUser, onLoggedIn, onBack, onSwitchUser, onSignOut, backHandlerRef}) => {
	const {loginWithToken} = useAuth();
	// requesting → waiting → connecting; failed si algo sale mal.
	const [phase, setPhase] = useState('requesting');
	const [code, setCode] = useState(null);
	const [error, setError] = useState(null);
	const qrRef = useRef(null);
	const timerRef = useRef(null);
	const failuresRef = useRef(0);
	// Cada código nuevo invalida las esperas del anterior, y desmontar las de todos.
	const runRef = useRef(0);
	const relink = relinkUser != null;

	const stop = useCallback(() => {
		runRef.current += 1;
		clearTimeout(timerRef.current);
		timerRef.current = null;
	}, []);

	const complete = useCallback(async (session, run) => {
		setPhase('connecting');
		setError(null);
		let ok = false;
		try {
			ok = await completeLogin(session, loginWithToken);
		} catch (e) {
			ok = false;
		}
		if (run !== runRef.current) return;
		if (ok) {
			onLoggedIn?.();
			return;
		}
		setPhase('failed');
		setError(fs.serverUnreachable(session.serverName || session.serverUrl));
		focusLater('fluxer-new-code');
	}, [loginWithToken, onLoggedIn]);

	const requestCode = useCallback(async () => {
		stop();
		const run = runRef.current;
		setPhase('requesting');
		setError(null);
		setCode(null);
		failuresRef.current = 0;

		let current;
		try {
			current = await startLogin();
		} catch (e) {
			if (run !== runRef.current) return;
			setPhase('failed');
			setError(fs.hubUnreachable);
			focusLater('fluxer-new-code');
			return;
		}
		if (run !== runRef.current) return;
		setCode(current);
		setPhase('waiting');

		const poll = async () => {
			if (run !== runRef.current) return;
			try {
				const result = await pollLogin(current.secret);
				if (run !== runRef.current) return;
				failuresRef.current = 0;
				setError(null);
				if (result.status === 'approved') {
					stop();
					complete(result.session, runRef.current);
					return;
				}
				if (result.status === 'expired' || Date.now() > current.expiresAt) {
					requestCode();
					return;
				}
			} catch (e) {
				// Un fallo de red suelto no corta la espera.
				if (run !== runRef.current) return;
				failuresRef.current += 1;
				if (failuresRef.current >= POLL_FAILURES_BEFORE_NOTICE) setError(fs.stillTrying);
			}
			timerRef.current = setTimeout(poll, current.interval);
		};
		timerRef.current = setTimeout(poll, current.interval);
	}, [stop, complete]);

	useEffect(() => {
		requestCode();
		return stop;
	}, [requestCode, stop]);

	useEffect(() => {
		if (phase === 'waiting' && code) drawQrCode(qrRef.current, code.approveUrl);
	}, [phase, code]);

	// Algo con foco desde el principio, para que el mando responda.
	useEffect(() => {
		const timer = focusLater(relink ? 'fluxer-switch-user' : onBack ? 'fluxer-back' : 'fluxer-new-code');
		return () => clearTimeout(timer);
	}, [relink, onBack]);

	const handleBack = useCallback(() => {
		if (phase === 'connecting') return true;
		if (onBack) {
			stop();
			onBack();
			return true;
		}
		// Sin «Volver»: esta es la entrada (o la app está tapada); Atrás lo decide la app.
		return relink;
	}, [phase, onBack, stop, relink]);

	useEffect(() => {
		if (!backHandlerRef) return undefined;
		backHandlerRef.current = handleBack;
		return () => {
			if (backHandlerRef.current === handleBack) backHandlerRef.current = null;
		};
	}, [backHandlerRef, handleBack]);

	const handleSwitchUser = useCallback(() => {
		stop();
		onSwitchUser?.();
	}, [stop, onSwitchUser]);

	const handleSignOut = useCallback(() => {
		stop();
		onSignOut?.();
	}, [stop, onSignOut]);

	const waiting = phase === 'waiting' && code;

	const renderSteps = () => (
		<div className={css.steps}>
			<div className={css.step}>
				<span className={css.stepNumber}>1</span>
				{fs.stepOpen}
			</div>
			<div className={css.stepBody}>
				<span className={css.link}>{shortUrl(code.approveUrl)}</span>
			</div>
			<div className={css.step}>
				<span className={css.stepNumber}>2</span>
				{fs.stepCode}
			</div>
			<div className={css.stepBody}>
				<span className={css.code}>{pretty(code.code)}</span>
			</div>
			<div className={css.step}>
				<span className={css.stepNumber}>3</span>
				{fs.stepAccept}
			</div>
			<div className={css.stepBody}>
				<div className={css.waiting}>
					<span className={`${loginCss.spinner} ${loginCss.spinnerSmall}`} />
					{fs.waiting}
				</div>
			</div>
		</div>
	);

	const renderBusy = (label) => (
		<div className={css.center}>
			<div className={`${loginCss.spinner} ${loginCss.spinnerLarge}`} />
			<div className={css.centerLabel}>{label}</div>
		</div>
	);

	return (
		<div className={loginCss.page}>
			<div className={loginCss.spacerTop} />
			<div className={`${loginCss.frame} ${waiting ? loginCss.frameWide : loginCss.frameNarrow}`}>
				<div className={loginCss.logoSection}>
					<img src={logoAndText} alt="Fluxer" className={`${loginCss.logo} ${loginCss.logoSmall}`} />
				</div>
				<FocusArea className={`${loginCss.card} ${loginCss.cardCentered} ${waiting ? loginCss.cardWithQr : ''}`}>
					<div className={loginCss.signInMain}>
						<h1 className={loginCss.title}>{relink ? fs.relinkTitle : fs.loginTitle}</h1>
						<p className={css.subtitle}>{relink ? fs.relinkSubtitle(relinkUser) : fs.loginSubtitleTv}</p>

						{waiting && renderSteps()}
						{phase === 'requesting' && renderBusy(fs.gettingCode)}
						{phase === 'connecting' && renderBusy(fs.connecting)}

						{error && <div className={css.error}>{error}</div>}

						{phase !== 'connecting' && (
							<div className={loginCss.buttonWrap}>
								{onBack && (
									<SpottableButton data-spotlight-id="fluxer-back" className={loginCss.outlineButton} onClick={handleBack}>
										{fs.back}
									</SpottableButton>
								)}
								<SpottableButton
									data-spotlight-id="fluxer-new-code"
									className={loginCss.outlineButton}
									onClick={requestCode}
									disabled={phase === 'requesting'}
								>
									{fs.newCode}
								</SpottableButton>
							</div>
						)}

						{relink && phase !== 'connecting' && (
							<div className={loginCss.buttonWrap}>
								<SpottableButton data-spotlight-id="fluxer-switch-user" className={loginCss.outlineButton} onClick={handleSwitchUser}>
									{fs.relinkSwitchUser}
								</SpottableButton>
								<SpottableButton data-spotlight-id="fluxer-sign-out" className={loginCss.outlineButton} onClick={handleSignOut}>
									{fs.relinkSignOut}
								</SpottableButton>
							</div>
						)}
					</div>
					{waiting && (
						<div className={loginCss.qrAside}>
							<canvas ref={qrRef} className={loginCss.qrCanvas} />
							<div className={loginCss.qrCaption}>{fs.scanQr}</div>
						</div>
					)}
				</FocusArea>
			</div>
			<div className={loginCss.spacerBottom} />
		</div>
	);
};

export default FluxerLogin;
