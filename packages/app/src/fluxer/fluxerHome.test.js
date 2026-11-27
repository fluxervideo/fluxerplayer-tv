import {translateSections, fluxerRowItems} from './fluxerHome';

const SERVER = 'https://emby.example';

describe('fluxerHome', () => {
	test('las secciones de Emby se vuelven filas en el mismo orden, y las demás quedan apagadas', () => {
		const rows = translateSections([
			{Id: 's1', SectionType: 'boxset', ViewType: 'spotlight', ParentId: 'c0'},
			{Id: 's2', SectionType: 'resume'},
			{Id: 's3', SectionType: 'boxset', ParentId: 'c1', CustomName: 'Estrenos'},
			{Id: 's4', SectionType: 'nextup'},
			{Id: 's5', SectionType: 'items', Name: 'Anime', ItemTypes: ['Series'], Query: {TagIds: [7]}, SortBy: 'DateCreated', SortOrder: 'Descending'},
			{Id: 's6', SectionType: 'latestmedia'},
			{Id: 's7', SectionType: 'latestmedia'},
			{Id: 's8', SectionType: 'livetv'},
			{Id: 's9', SectionType: 'userviews'}
		], SERVER);
		const enabled = rows.filter((row) => row.enabled);
		expect(enabled.map((row) => row.id)).toEqual([
			'resume',
			`pluginDynamic:fluxer:${SERVER}:fluxer:s3`,
			'nextup',
			`pluginDynamic:fluxer:${SERVER}:fluxer:s5`,
			'latest-media',
			'library-tiles'
		]);
		expect(enabled.map((row) => row.order)).toEqual([0, 1, 2, 3, 4, 5]);
		expect(enabled[1]).toMatchObject({name: 'Estrenos', source: 'fluxer', serverUrl: SERVER, itemId: 's3', query: {kind: 'boxset', parentId: 'c1'}});
		expect(enabled[3].query).toEqual({kind: 'items', itemTypes: ['Series'], tagIds: ['7'], genreIds: [], studioIds: [], sortBy: 'DateCreated', sortOrder: 'Descending'});
		expect(rows.filter((row) => !row.enabled).some((row) => row.id === 'collections')).toBe(true);
		expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
	});

	test('una fila de Fluxer pide a Emby lo mismo que su web', async () => {
		const api = {getItems: jest.fn().mockResolvedValue({Items: [{Id: 'a'}]})};
		const row = {query: {kind: 'items', itemTypes: ['Movie', 'Series'], tagIds: ['7'], genreIds: [], studioIds: [], sortBy: 'Random'}};
		expect(await fluxerRowItems(api, row, 40)).toEqual({Items: [{Id: 'a'}]});
		const params = api.getItems.mock.calls[0][0];
		expect(params).toMatchObject({Limit: 40, Recursive: true, IncludeItemTypes: 'Movie,Series', TagIds: '7', SortBy: 'Random'});
		expect('GenreIds' in params).toBe(false);
		expect(await fluxerRowItems(api, {query: {kind: 'otra'}}, 40)).toEqual({Items: []});
	});
});
