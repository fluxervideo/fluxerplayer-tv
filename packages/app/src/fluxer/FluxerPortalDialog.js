// FluxerPlayer: abrir el portal de Fluxer desde la tele. Una tele no tiene
// navegador al que mandar a nadie: enlace de un solo uso con la sesión ya
// iniciada (api/app/portal-link), como QR para el móvil.

import {useEffect, useRef, useState} from 'react';
import CoreDialog from '../components/CoreDialog';
import {drawQrCode} from '../utils/qrCanvas';
import {useFluxerDialog} from './fluxerDialogs';
import {hubPortalLink} from './fluxerHub';
import {fs} from './fluxerStrings';

import qrCss from '../components/ServerMessagesDialog/ServerMessagesDialog.module.less';
import css from './Fluxer.module.less';

/**
 * `to`: plans, account o support. `fallbackUrl`: si no hay enlace con sesión, la del portal a secas.
 * Con `url`, ese enlace tal cual (sin pedir uno al Hub).
 */
const FluxerPortalDialog = ({open, to, url: directUrl, title, fallbackUrl, onClose}) => {
	const canvasRef = useRef(null);
	const [url, setUrl] = useState(null);
	const [failed, setFailed] = useState(false);
	useFluxerDialog(open);

	useEffect(() => {
		if (!open) return undefined;
		let alive = true;
		setFailed(false);
		if (directUrl) {
			setUrl(directUrl);
			return undefined;
		}
		setUrl(null);
		hubPortalLink(to).then((link) => {
			if (!alive) return;
			if (link || fallbackUrl) setUrl(link || fallbackUrl);
			else setFailed(true);
		});
		return () => {
			alive = false;
		};
	}, [open, to, directUrl, fallbackUrl]);

	useEffect(() => {
		if (open && url) drawQrCode(canvasRef.current, url);
	}, [open, url]);

	return (
		<CoreDialog open={open} onClose={onClose} title={title} showCancel spotlightId="fluxer-portal-dialog">
			<div className={qrCss.qr}>
				{url && (
					<>
						<div className={qrCss.qrBox}>
							<canvas ref={canvasRef} className={qrCss.qrCanvas} />
						</div>
						<div className={qrCss.qrHint}>{fs.scanWithPhone}</div>
						<div className={qrCss.qrUrl}>{directUrl || fs.portalLinkHint}</div>
					</>
				)}
				{!url && !failed && <div className={css.centerLabel}>{fs.portalLoading}</div>}
				{failed && <div className={css.error}>{fs.portalFailed}</div>}
			</div>
		</CoreDialog>
	);
};

export default FluxerPortalDialog;
