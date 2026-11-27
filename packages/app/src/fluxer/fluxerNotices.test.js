import {noticesFor} from './fluxerNotices';

const DAY = 24 * 60 * 60 * 1000;
const fresh = () => ({planDay: null, maintenances: [], incidentAt: 0});

describe('avisos de la cuenta de Fluxer', () => {
	const now = Date.parse('2026-11-27T12:00:00Z');

	test('el plan avisa si caduca en 5 días o menos sin renovarse solo, y una vez al día', () => {
		const seen = fresh();
		const me = {plan: {status: 'active', ends_at: new Date(now + 3 * DAY).toISOString(), auto_renew: false}, urls: {plans: 'https://hub/p'}};
		const cards = noticesFor(me, seen, now);
		expect(cards).toHaveLength(1);
		expect(cards[0]).toMatchObject({key: 'plan', plansUrl: 'https://hub/p'});
		expect(noticesFor(me, seen, now)).toHaveLength(0);
	});

	test('no avisa del plan si se renueva solo con saldo, o si queda tiempo', () => {
		const renews = {plan: {status: 'active', ends_at: new Date(now + 2 * DAY).toISOString(), auto_renew: true, balance_covers_next_renewal: true}};
		const far = {plan: {status: 'active', ends_at: new Date(now + 20 * DAY).toISOString()}};
		expect(noticesFor(renews, fresh(), now)).toHaveLength(0);
		expect(noticesFor(far, fresh(), now)).toHaveLength(0);
		expect(noticesFor({plan: {status: 'expired', status_label: 'Caducado'}}, fresh(), now)[0].text).toContain('Caducado');
	});

	test('incidencias cada 6 h, mantenimientos una vez y avisos de ventana sin cerrar', () => {
		const seen = fresh();
		const me = {
			server: {status: 'incident', name: 'Nube 1'},
			notices: [
				{id: 4, kind: 'maintenance', title: 'Mantenimiento', body: ''},
				{id: 5, kind: 'global', modal: true, title: 'Aviso', body: 'Hola'},
				{id: 6, kind: 'global', modal: true, acknowledged: true, title: 'Visto'},
				{id: 7, kind: 'global', modal: false, title: 'Banda'}
			]
		};
		expect(noticesFor(me, seen, now).map((card) => card.key)).toEqual(['incident', 'maintenance-4', 'notice-5']);
		expect(noticesFor(me, seen, now + 60 * 1000).map((card) => card.key)).toEqual(['notice-5']);
		expect(noticesFor(me, seen, now + 7 * 60 * 60 * 1000).map((card) => card.key)).toEqual(['incident', 'notice-5']);
	});
});
