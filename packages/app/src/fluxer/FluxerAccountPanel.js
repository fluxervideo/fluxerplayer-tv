// FluxerPlayer: Ajustes → «Mi cuenta Fluxer»: plan, saldo, servidor, renovar
// (portal por QR, con la sesión ya iniciada) e Invita y gana.

import {useCallback, useEffect, useState} from 'react';
import {InfoRow} from '../views/Settings/settingsRows';
import {SpottableButton} from '../views/Settings/settingsSpottables';
import {hubMe} from './fluxerHub';
import {fs} from './fluxerStrings';
import FluxerPortalDialog from './FluxerPortalDialog';

import settingsCss from '../views/Settings/Settings.module.less';

const date = (value) => {
	const d = value ? new Date(value) : null;
	if (!d || Number.isNaN(d.getTime())) return null;
	return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const daysLeft = (value) => {
	const d = value ? new Date(value) : null;
	if (!d || Number.isNaN(d.getTime())) return null;
	return Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
};

/** "https://fluxer.video/i/ABC123" → "ABC123". */
const inviteCode = (url) => {
	const parts = String(url || '').split(/[?#]/)[0].split('/').filter(Boolean);
	return parts.length ? parts[parts.length - 1] : url;
};

const FluxerAccountPanel = () => {
	// undefined cargando, null sin vincular o sin conexión.
	const [me, setMe] = useState(undefined);
	const [dialog, setDialog] = useState(null);

	useEffect(() => {
		let alive = true;
		hubMe({fresh: true}).then((data) => alive && setMe(data || null));
		return () => {
			alive = false;
		};
	}, []);

	const closeDialog = useCallback(() => setDialog(null), []);
	const planAction = me?.plan?.is_trial || me?.plan?.status !== 'active' ? fs.choosePlan : fs.renew;
	const openPlans = useCallback(() => setDialog({to: 'plans', title: planAction, fallbackUrl: me?.urls?.plans}), [planAction, me]);
	const openAccount = useCallback(() => setDialog({to: 'account', title: fs.myAccount, fallbackUrl: me?.urls?.account}), [me]);
	const openInvite = useCallback(() => setDialog({title: fs.inviteTitle, url: me?.referral?.share_url}), [me]);

	if (me === undefined) return <div className={settingsCss.viewDescription}>{fs.portalLoading}</div>;
	if (me === null) return <div className={settingsCss.viewDescription}>{fs.fluxerAccountUnavailable}</div>;

	const plan = me.plan || {};
	const customer = me.customer || {};
	const server = me.server || null;
	const referral = me.referral || null;
	const active = plan.status === 'active';
	const autoRenew = plan.auto_renew === true;
	const renewsAlone = autoRenew && plan.balance_covers_next_renewal === true;
	const ends = date(plan.ends_at);
	const days = daysLeft(plan.ends_at);

	let state = fs.subscriptionActive;
	if (!active) state = plan.status_label || fs.noPlan;
	else if (days !== null && days <= 7 && !renewsAlone) state = fs.subscriptionEndsInDays(days);

	const notice = plan.is_trial ? fs.trialNotice : (!active ? fs.noPlanNotice : null);
	const balance = Number(customer.balance);


	return (
		<>
			{notice && <div className={settingsCss.viewDescription}>{notice}</div>}
			<InfoRow id="fluxerPlan" icon="stars" label={plan.name || fs.noPlan} value={state} />
			{ends && <InfoRow id="fluxerEnds" icon="schedule" label={autoRenew ? fs.renewsOn(ends) : fs.endsOn(ends)} />}
			<InfoRow id="fluxerAutoRenew" icon="sync" label={autoRenew ? fs.autoRenewYes : fs.autoRenewNo} />
			{Number.isFinite(balance) && <InfoRow id="fluxerBalance" icon="storefront" label={fs.availableBalance} value={fs.money(balance)} />}
			{customer.email && <InfoRow id="fluxerEmail" icon="account_circle" label={customer.email} />}
			{server?.name && <InfoRow id="fluxerServer" icon="dns" label={server.name} value={server.status_label || ''} />}
			<div className={settingsCss.actionBarInline}>
				<SpottableButton className={settingsCss.actionButton} onClick={openPlans} spotlightId="fluxer-account-plans">
					{planAction}
				</SpottableButton>
				<SpottableButton className={settingsCss.actionButton} onClick={openAccount} spotlightId="fluxer-account-portal">
					{fs.myAccount}
				</SpottableButton>
			</div>
			{referral?.share_url && (
				<InfoRow
					id="fluxerInvite"
					icon="groups"
					label={fs.inviteCode(inviteCode(referral.share_url))}
					value={`${fs.inviteHelp(Number(referral.reward_amount))} ${fs.inviteTapForQr}`}
					onClick={openInvite}
				/>
			)}
			<FluxerPortalDialog
				open={Boolean(dialog)}
				to={dialog?.to}
				url={dialog?.url}
				title={dialog?.title}
				fallbackUrl={dialog?.fallbackUrl}
				onClose={closeDialog}
			/>
		</>
	);
};

export default FluxerAccountPanel;
