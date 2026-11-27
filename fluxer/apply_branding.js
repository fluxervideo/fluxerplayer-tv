#!/usr/bin/env node
// FluxerPlayer TV: aplica la marca (fluxer/branding.json), la versión propia
// (fluxer/version.json) y las imágenes (fluxer/branding/overlay/) sobre los
// ficheros de Moonfin, justo antes de compilar. En git no se cambian, así que
// la marca nunca da conflictos al fusionar una versión nueva de Moonfin.
//
// Si Moonfin cambia un texto que esto busca, para con un error que dice qué
// fichero revisar.
//
//   node fluxer/apply_branding.js           aplicar
//   node fluxer/apply_branding.js --revert  deshacer (git checkout de lo tocado)

const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OVERLAY = path.join(__dirname, 'branding', 'overlay');
// Lista de lo tocado, para --revert. Fuera de git (.git/info/exclude).
const APPLIED = path.join(ROOT, '.fluxer-branding-applied');

const brand = JSON.parse(fs.readFileSync(path.join(__dirname, 'branding.json'), 'utf8'));
const {version} = JSON.parse(fs.readFileSync(path.join(__dirname, 'version.json'), 'utf8'));

const git = (...args) => execFileSync('git', args, {cwd: ROOT, encoding: 'utf8'});

if (process.argv.includes('--revert')) {
	if (!fs.existsSync(APPLIED)) {
		console.log('apply_branding: no hay nada aplicado.');
		process.exit(0);
	}
	const files = fs.readFileSync(APPLIED, 'utf8').split('\n').filter(Boolean);
	git('checkout', '--', ...files);
	fs.unlinkSync(APPLIED);
	console.log(`apply_branding: deshecho (${files.length} ficheros).`);
	process.exit(0);
}

if (fs.existsSync(APPLIED)) {
	console.error('apply_branding: ya está aplicada. Para volver a aplicarla: node fluxer/apply_branding.js --revert');
	process.exit(1);
}

const repoUrl = `https://github.com/${brand.githubRepo}`;
const webos = brand.webosAppId;
const tizenApp = `${brand.tizenPackageId}.${brand.tizenAppName}`;

// [fichero, buscar, reemplazar]. Cada «buscar» tiene que estar (todas sus apariciones se cambian).
const REPLACEMENTS = [
	// Samsung (Tizen). Primero el id completo de la app y después el paquete, que va también en el servicio.
	['packages/build-tizen/tizen/config.xml', 'id="http://moonfin.org/tizen"', `id="${brand.tizenWidgetId}"`],
	['packages/build-tizen/tizen/config.xml', 'MoonfinApp.moonfin', tizenApp],
	['packages/build-tizen/tizen/config.xml', 'MoonfinApp', brand.tizenPackageId],
	['packages/build-tizen/tizen/config.xml', '<name>Moonfin</name>', `<name>${brand.appName}</name>`],
	['packages/build-tizen/tizen/config.xml', 'Moonfin Smart Hub Preview Handler Service', `${brand.appName} Smart Hub Preview Handler Service`],
	['packages/build-tizen/tizen/config.xml', 'A beautiful Jellyfin media client for Samsung Smart TVs.', brand.description],
	['packages/build-tizen/tizen/config.xml', '<author email="contact@moonfin.org" href="https://github.com/Moonfin-Client/Tizen">Moonfin Contributors</author>', `<author href="${repoUrl}">${brand.publisher}</author>`],
	['packages/build-tizen/scripts/build-wgt.js', 'Moonfin_Tizen_', `${brand.filePrefix}_Tizen_`],
	['packages/build-tizen/scripts/build-wgt.js', 'MoonfinApp.moonfin', tizenApp],

	// LG (webOS). El servicio y la base de datos cuelgan del id de la app.
	['packages/build-webos/webos-meta/appinfo.json', '"id": "org.moonfin.webos"', `"id": "${webos}"`],
	['packages/build-webos/webos-meta/appinfo.json', '"vendor": "Moonfin"', `"vendor": "${brand.publisher}"`],
	['packages/build-webos/webos-meta/appinfo.json', '"title": "Moonfin"', `"title": "${brand.appName}"`],
	['packages/build-webos/webos-meta/appinfo.json', '"appDescription": "Jellyfin media client for LG webOS TV"', `"appDescription": "${brand.description}"`],
	['packages/build-webos/service/services.json', 'org.moonfin.webos', webos],
	['packages/build-webos/service/package.json', 'org.moonfin.webos', webos],
	['packages/build-webos/service/service.js', 'org.moonfin.webos', webos],
	['packages/build-webos/build.js', 'org.moonfin.webos_', `${webos}_`],
	['packages/build-webos/build.js', 'Moonfin_webOS_', `${brand.filePrefix}_webOS_`],
	['packages/build-webos/package.json', 'org.moonfin.webos', webos],
	['packages/build-webos/update-manifest.js', 'Moonfin_webOS_', `${brand.filePrefix}_webOS_`],
	['packages/app/src/services/secureFetch.js', 'luna://org.moonfin.webos.service', `luna://${webos}.service`],
	['packages/app/src/utils/appLifecycle.js', 'luna://org.moonfin.webos.service', `luna://${webos}.service`],
	['packages/platform-webos/src/storage.js', 'org.moonfin.webos', webos],
	// Manifiesto del Homebrew Channel (repo propio de actualizaciones en LG).
	['packages/build-webos/org.moonfin.webos.manifest.json', '"id": "org.moonfin.webos"', `"id": "${webos}"`],
	['packages/build-webos/org.moonfin.webos.manifest.json', '"title": "Moonfin"', `"title": "${brand.appName}"`],
	['packages/build-webos/org.moonfin.webos.manifest.json', 'https://raw.githubusercontent.com/Moonfin-Client/Smart-TV/main/', `https://raw.githubusercontent.com/${brand.githubRepo}/main/fluxer/branding/overlay/`],
	['packages/build-webos/org.moonfin.webos.manifest.json', '"sourceUrl": "https://github.com/Moonfin-Client/Smart-TV"', `"sourceUrl": "${repoUrl}"`],
	['packages/build-webos/org.moonfin.webos.manifest.json', 'Moonfin_webOS_', `${brand.filePrefix}_webOS_`],

	// Dentro de la app: avisos de versión nueva y enlaces desde nuestro repo.
	['packages/app/src/services/versionChecker.js', 'https://api.github.com/repos/Moonfin-Client/Smart-TV/releases', `https://api.github.com/repos/${brand.githubRepo}/releases`],
	['packages/app/src/views/Settings/settingsSchema.js', 'github.com/Moonfin-Client/Smart-TV', `github.com/${brand.githubRepo}`]
];

const touched = new Set();
const failures = [];

for (const [rel, from, to] of REPLACEMENTS) {
	const file = path.join(ROOT, rel);
	const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
	if (text === null || !text.includes(from)) {
		failures.push(`${rel}: no está «${from}»`);
		continue;
	}
	fs.writeFileSync(file, text.split(from).join(to));
	touched.add(rel);
}

if (failures.length) {
	console.error('apply_branding: Moonfin ha cambiado estos ficheros; revisa fluxer/apply_branding.js:');
	failures.forEach((line) => console.error(`  - ${line}`));
	if (touched.size) git('checkout', '--', ...touched);
	process.exit(1);
}

// Título de la página (Enact lo toma de "enact.title").
{
	const rel = 'packages/app/package.json';
	const file = path.join(ROOT, rel);
	const raw = fs.readFileSync(file, 'utf8');
	const json = JSON.parse(raw);
	json.enact = {...json.enact, title: brand.appName};
	fs.writeFileSync(file, JSON.stringify(json, null, '\t') + '\n');
	touched.add(rel);
}

// Imágenes: cada una en la misma ruta que la oficial que sustituye.
const listFiles = (dir, prefix = '') => fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
	const rel = prefix + entry.name;
	return entry.isDirectory() ? listFiles(path.join(dir, entry.name), `${rel}/`) : [rel];
});
for (const rel of listFiles(OVERLAY)) {
	const target = path.join(ROOT, rel);
	if (!fs.existsSync(target)) {
		console.error(`apply_branding: la imagen ${rel} no sustituye a ningún fichero de Moonfin.`);
		if (touched.size) git('checkout', '--', ...touched);
		process.exit(1);
	}
	fs.copyFileSync(path.join(OVERLAY, rel), target);
	touched.add(rel);
}

// Versión propia (los mismos ficheros que el bump-version de Moonfin).
const before = new Set(git('diff', '--name-only').split('\n').filter(Boolean));
for (const platform of ['webos', 'tizen']) {
	execFileSync('node', [path.join(ROOT, 'scripts', 'bump-version.js'), platform, version], {cwd: ROOT, stdio: 'ignore'});
}
git('diff', '--name-only').split('\n').filter(Boolean).forEach((rel) => {
	if (!before.has(rel)) touched.add(rel);
});

fs.writeFileSync(APPLIED, [...touched].sort().join('\n') + '\n');
console.log(`apply_branding: ${brand.appName} ${version} aplicada (${touched.size} ficheros). Deshacer: node fluxer/apply_branding.js --revert`);
