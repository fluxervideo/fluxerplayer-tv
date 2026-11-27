// FluxerPlayer: qué avisos de la cuenta tocan con la respuesta de «me» del Hub
// (sin React, para poder probarlo). Los enseña FluxerHubNotices.

import {getFromStorage, saveToStorage} from '../services/storage';
import {fs} from './fluxerStrings';

const WARN_DAYS = 5;
const INCIDENT_EVERY = 6 * 60 * 60 * 1000;
const STORAGE_KEY = 'fluxerNotices';

const today = () => new Date().toISOString().slice(0, 10);
const shortDate = (date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;

export const loadSeen = async () => {
	try {
		const stored = await getFromStorage(STORAGE_KEY);
		return {planDay: stored?.planDay || null, maintenances: Array.isArray(stored?.maintenances) ? stored.maintenances : [], incidentAt: stored?.incidentAt || 0};
	} catch (e) {
		return {planDay: null, maintenances: [], incidentAt: 0};
	}
};

export const saveSeen = async (seen) => {
	try {
		await saveToStorage(STORAGE_KEY, {...seen, maintenances: seen.maintenances.slice(-50)});
	} catch (e) { /* vale para esta sesión */ }
};

/** Los avisos que tocan con este «me» (y apunta los ya enseñados). */
export const noticesFor = (me, seen, now = Date.now()) => {
	const cards = [];
	const server = me?.server;
	if (server?.status === 'incident' && now - seen.incidentAt >= INCIDENT_EVERY) {
		seen.incidentAt = now;
		cards.push({key: 'incident', title: fs.serverIncidentTitle, text: fs.serverIncident(server.name || fs.yourServer)});
	}

	const plan = me?.plan;
	if (plan && seen.planDay !== today()) {
		const status = plan.status || '';
		const endsAt = plan.ends_at ? new Date(plan.ends_at) : null;
		const renewsAlone = plan.auto_renew === true && plan.balance_covers_next_renewal === true;
		let text = null;
		if (status !== 'active') {
			text = fs.planNotActive(plan.status_label || status);
		} else if (endsAt && !Number.isNaN(endsAt.getTime()) && !renewsAlone) {
			const days = (endsAt.getTime() - now) / (24 * 60 * 60 * 1000);
			if (days <= WARN_DAYS) text = fs.planEndsSoon(shortDate(endsAt), Math.ceil(days));
		}
		if (text) {
			seen.planDay = today();
			cards.push({key: 'plan', title: fs.planTitle, text, action: plan.is_trial ? fs.choosePlan : fs.renew, plansUrl: me?.urls?.plans || null});
		}
	}

	for (const notice of Array.isArray(me?.notices) ? me.notices : []) {
		if (!notice) continue;
		const title = notice.title || '';
		const body = String(notice.body || '').trim() || title;
		if (notice.kind === 'maintenance') {
			const key = String(notice.id);
			if (seen.maintenances.includes(key)) continue;
			seen.maintenances.push(key);
			cards.push({key: `maintenance-${key}`, title, text: body});
			continue;
		}
		// Aviso global: solo los de ventana que aún no ha cerrado.
		if (notice.modal !== true || notice.acknowledged === true || typeof notice.id !== 'number') continue;
		cards.push({key: `notice-${notice.id}`, title, text: body, acknowledge: notice.id});
	}
	return cards;
};
