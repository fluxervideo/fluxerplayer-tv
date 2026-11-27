// FluxerPlayer: «Reportar un problema» con un título. Lo abren el menú del
// título y el reproductor; lo enseña FluxerReportDialog (montado en App).

/** Solo para lo que se reproduce (películas, capítulos, vídeos). */
const REPORTABLE = ['Movie', 'Episode', 'Video', 'MusicVideo', 'Series', 'Season'];
export const fluxerCanReport = (item) => Boolean(item) && REPORTABLE.includes(item.Type);

/** Los mismos que en la cuenta de Fluxer. */
export const SYMPTOMS = ['wont_start', 'buffering', 'cuts', 'bad_quality', 'audio', 'other'];

/** «Serie · T2E5 · Título» o «Película (2021)». */
export const reportTitle = (item) => {
	if (!item) return '';
	if (item.Type === 'Episode') {
		const se = `${item.ParentIndexNumber != null ? `T${item.ParentIndexNumber}` : ''}${item.IndexNumber != null ? `E${item.IndexNumber}` : ''}`;
		return [item.SeriesName, se, item.Name].filter(Boolean).join(' · ');
	}
	return item.ProductionYear ? `${item.Name} (${item.ProductionYear})` : item.Name || '';
};

/** Lo que llega a FluxerHub (api/app/reports). */
export const reportBody = (item, symptom) => ({
	type: 'technical_issue',
	title: reportTitle(item),
	symptom,
	emby_item_id: item.Id,
	emby_item_type: item.Type,
	season_number: item.Type === 'Episode' ? item.ParentIndexNumber : undefined,
	episode_number: item.Type === 'Episode' ? item.IndexNumber : undefined
});

let listener = null;

/** Abre el diálogo para ese título. */
export const openFluxerReport = (item) => {
	if (listener && fluxerCanReport(item)) listener(item);
};

export const onFluxerReport = (fn) => {
	listener = fn;
	return () => {
		if (listener === fn) listener = null;
	};
};
