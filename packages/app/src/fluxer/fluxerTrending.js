// FluxerPlayer: barra de inicio con «Tendencias de hoy» del servidor de la app
// (api/app/trending), en su orden. Sin sesión de Fluxer o sin tendencias, la
// barra sigue como en Moonfin.

import {hubTrendingIds} from './fluxerHub';

// Tope de seguridad: la colección suele tener 10-30 títulos.
const MAX_TRENDING = 40;
const FIELDS = 'PrimaryImageAspectRatio,Overview,Genres,ProviderIds,RemoteTrailers,OfficialRating,ChildCount,Taglines';

const withTimeout = (promise, ms) => Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);

export const fluxerTrendingBarItems = async (api) => {
	try {
		const ids = (await withTimeout(hubTrendingIds(), 6000)) || [];
		if (!ids.length) return [];
		const result = await withTimeout(api.getItems({
			Ids: ids.slice(0, MAX_TRENDING).join(','),
			Fields: FIELDS,
			EnableImageTypes: 'Primary,Backdrop,Logo,Thumb,Banner',
			ImageTypeLimit: 1,
			EnableTotalRecordCount: false
		}), 10000);
		// Emby no garantiza el orden de los ids: se ordena por el de las tendencias.
		// Lo que el usuario no puede ver no viene, y sin fondo no luce en la barra.
		const rank = new Map(ids.map((id, i) => [id, i]));
		return (result?.Items || [])
			.filter((item) => item.BackdropImageTags?.length > 0)
			.sort((a, b) => (rank.get(a.Id) ?? MAX_TRENDING) - (rank.get(b.Id) ?? MAX_TRENDING));
	} catch (e) {
		return [];
	}
};
