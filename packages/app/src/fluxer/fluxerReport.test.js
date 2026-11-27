import {fluxerCanReport, reportBody, reportTitle} from './fluxerReport';

describe('reportar un problema', () => {
	const episode = {Id: 'e1', Type: 'Episode', SeriesName: 'Serie', ParentIndexNumber: 2, IndexNumber: 5, Name: 'Capítulo'};

	test('solo lo que se reproduce', () => {
		expect(fluxerCanReport(episode)).toBe(true);
		expect(fluxerCanReport({Type: 'Movie'})).toBe(true);
		expect(fluxerCanReport({Type: 'BoxSet'})).toBe(false);
		expect(fluxerCanReport(null)).toBe(false);
	});

	test('el título y lo que llega al Hub, como en FluxerPlayer', () => {
		expect(reportTitle(episode)).toBe('Serie · T2E5 · Capítulo');
		expect(reportTitle({Type: 'Movie', Name: 'Película', ProductionYear: 2021})).toBe('Película (2021)');
		expect(reportBody(episode, 'buffering')).toEqual({
			type: 'technical_issue', title: 'Serie · T2E5 · Capítulo', symptom: 'buffering',
			emby_item_id: 'e1', emby_item_type: 'Episode', season_number: 2, episode_number: 5
		});
		expect(reportBody({Id: 'm', Type: 'Movie', Name: 'P'}, 'other').season_number).toBeUndefined();
	});
});
