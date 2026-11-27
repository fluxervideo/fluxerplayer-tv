// FluxerPlayer: el diálogo de «Reportar un problema». Con el mando, elegir lo
// que pasa ya lo envía. Llega a FluxerHub como solicitud del cliente.

import {useCallback, useEffect, useState} from 'react';
import CoreDialog, {CoreDialogRow} from '../components/CoreDialog';
import {useFluxerDialog} from './fluxerDialogs';
import {activeOwner, hubReport} from './fluxerHub';
import {hubToken} from './fluxerStore';
import {SYMPTOMS, onFluxerReport, reportBody, reportTitle} from './fluxerReport';
import {fs} from './fluxerStrings';
import FluxerPortalDialog from './FluxerPortalDialog';

import css from './Fluxer.module.less';

const FluxerReportDialog = () => {
	const [item, setItem] = useState(null);
	// choose → sending → sent | failed; unlinked si la app no tiene sesión de Fluxer.
	const [phase, setPhase] = useState('choose');
	const [support, setSupport] = useState(false);
	useFluxerDialog(Boolean(item));

	useEffect(() => onFluxerReport(async (next) => {
		setPhase((await hubToken(activeOwner())) ? 'choose' : 'unlinked');
		setItem(next);
	}), []);

	const close = useCallback(() => {
		if (phase !== 'sending') setItem(null);
	}, [phase]);

	const send = useCallback(async (e) => {
		const symptom = e.currentTarget.dataset.symptom;
		if (!item || phase === 'sending') return;
		setPhase('sending');
		try {
			const id = await hubReport(reportBody(item, symptom));
			setPhase(id === null ? 'unlinked' : 'sent');
		} catch (err) {
			setPhase('failed');
		}
	}, [item, phase]);

	const openSupport = useCallback(() => {
		setItem(null);
		setSupport(true);
	}, []);

	const closeSupport = useCallback(() => setSupport(false), []);

	return (
		<>
			<CoreDialog
				open={Boolean(item)}
				onClose={close}
				title={fs.reportProblem}
				subtitle={reportTitle(item)}
				spotlightId="fluxer-report-dialog"
				showCancel={phase !== 'sending'}
			>
				{phase === 'choose' && (
					<>
						<div className={css.centerLabel}>{fs.reportWhatHappens}</div>
						{SYMPTOMS.map((key) => (
							<CoreDialogRow
								key={key}
								label={fs.symptoms[key]}
								data-symptom={key}
								onClick={send}
							/>
						))}
					</>
				)}
				{phase === 'sending' && <div className={css.centerLabel}>{fs.reportSending}</div>}
				{phase === 'sent' && <div className={css.centerLabel}>{fs.reportSent}</div>}
				{phase === 'failed' && <div className={css.error}>{fs.reportFailed}</div>}
				{phase === 'unlinked' && (
					<>
						<div className={css.centerLabel}>{fs.reportNeedsFluxerLogin}</div>
						<CoreDialogRow label={fs.openSupport} onClick={openSupport} />
					</>
				)}
			</CoreDialog>
			<FluxerPortalDialog open={support} to="support" title={fs.openSupport} onClose={closeSupport} />
		</>
	);
};

export default FluxerReportDialog;
