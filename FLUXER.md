# FluxerPlayer TV

Cliente de Fluxer para Samsung (Tizen) y LG (webOS), basado en
[Moonfin Smart-TV](https://github.com/Moonfin-Client/Smart-TV) (MPL-2.0).

## Ramas y remotos

- `upstream` → Moonfin Smart-TV oficial. `origin` → este repo.
- `main` → rama principal de FluxerPlayer TV, construida encima de una versión
  publicada de Moonfin (ahora `3.1.1`).

Actualizar con una versión nueva de Moonfin:

```sh
git fetch upstream --tags
git merge <tag>          # p. ej. 3.2.0, nunca upstream/main
git push
```

## Reglas para que las actualizaciones no rompan nada

- El código propio va en ficheros nuevos (`packages/app/src/fluxer/`,
  `fluxer/`, `.github/workflows/fluxer-*.yml`). Se tocan lo mínimo los
  ficheros oficiales, y cada cambio en ellos lleva el comentario `// FLUXER:`
  (`git grep -n "FLUXER"` los lista todos).
- Los workflows oficiales de Moonfin no se editan: están desactivados desde
  GitHub (`gh workflow disable`).

## Marca (nombre, identificadores, iconos, versión)

- `fluxer/branding.json`: nombre, identificadores de la app en Tizen y webOS,
  repo de GitHub. **Los identificadores no se cambian nunca**: son los de la
  app instalada en las teles.
- `fluxer/version.json`: versión propia de FluxerPlayer TV y versión de
  Moonfin sobre la que está montada.
- `fluxer/branding/overlay/`: imágenes con la MISMA ruta que la oficial que
  sustituyen. Se generan con `python3 fluxer/branding/make_assets.py` desde
  `fluxer/branding/source/`.
- `node fluxer/apply_branding.js` lo aplica antes de compilar (lo hace CI). Los
  ficheros oficiales no se cambian en git, así que la marca nunca da
  conflictos. Si Moonfin cambia un texto que el script busca, falla diciendo
  qué fichero revisar.
- Probarlo en local: `node fluxer/apply_branding.js`, `npm run build:tizen` /
  `npm run build:webos`, y deshacerlo con `node fluxer/apply_branding.js --revert`.

## Compilar

`npm install` y luego `npm run build:tizen` (`.wgt` de Samsung) o
`npm run build:webos` (`.ipk` de LG).

## Funciones ocultas

`packages/app/src/fluxer/fluxerFeatures.js`: un interruptor por función
(asistente inicial, Seerr, juegos/RomM, libros, música, logros, enlaces de
Moonfin). El código de Moonfin no se borra, solo se ocultan sus entradas.
**Al fusionar una versión nueva, revisar si Moonfin ha añadido funciones
nuevas** que convenga ocultar.

## Opciones fijadas en cuentas de Fluxer

`packages/app/src/fluxer/FluxerSettingsLock.js`: con un usuario que entró con
Fluxer, la app se dibuja como si esas opciones estuvieran guardadas
(`SettingsOverride` de Moonfin; lo guardado no se toca). Ahora: barra lateral
izquierda, 200 Mbps, resolución automática, barra de medios de Moonfin, filas
en carrusel, sin fusionar filas recientes, y **filas de inicio = secciones de
inicio de Emby** (`fluxerHome.js`: resume, nextup, mis medios y últimos →
filas de Moonfin; boxset, collections e items → filas «de Fluxer» con el
nombre, contenido y orden de Emby; se leen al entrar y cada 30 min). En
Ajustes no salen (`LOCKED_ROWS` de `fluxerFeatures.js`). Para fijar otra:
añadirla a `FLUXER_LOCKED` y a `LOCKED_ROWS`.

## FluxerHub desde la app

Con el token propio del Hub (`fluxerHub.js`, solo `/api/app/*`):
- `FluxerHubNotices`: al abrir la app y cada 30 min, avisos del plan (no
  activo o caduca en ≤5 días sin renovarse solo; una vez al día),
  incidencias del servidor (cada 6 h), mantenimientos (una vez cada uno) y
  avisos globales de ventana (`fluxerNotices.js`).
- `FluxerPortalDialog`: el portal con la sesión ya iniciada
  (`api/app/portal-link`) como QR para el móvil. Lo usan «Renovar», «Mi
  cuenta» y el soporte.
- Ajustes → «Mi cuenta Fluxer» (`FluxerAccountPanel`): plan, saldo,
  servidor, renovar e Invita y gana.
- «Reportar un problema» (`FluxerReportDialog`) en el menú de cada título y
  en el reproductor.
- «Tendencias de hoy» en la barra de inicio (`fluxerTrending.js`).

## Entrar con Fluxer

`packages/app/src/fluxer/`: la app pide un código a FluxerHub, el cliente lo
acepta en el móvil (código o QR) y la app entra sola. `FluxerStart` es
«¿Quién va a ver?», `FluxerLinkGate` tapa la app si el usuario abierto ya no
tiene sesión del Hub.

## Ficheros oficiales modificados (revisar al fusionar)

| Fichero | Qué |
|---|---|
| `packages/app/src/App/App.js` | entrar con Fluxer (LOGIN, ADD_USER/ADD_SERVER), FluxerLinkGate, Atrás; bibliotecas sin libros/música/juegos; sin asistente |
| `packages/app/src/components/AccountModal/AccountModal.js` | solo usuarios de Fluxer, sin «Añadir usuario» ni «Seleccionar servidor», cerrar sesión desvincula del Hub |
| `packages/app/src/components/ProfileCarousel/ProfileCarousel.js` | `onSelect` |
| `packages/app/src/context/AuthContext.js` | sin «Siempre autenticar» |
| `packages/app/src/context/SeerrContext.js` | sin Seerr |
| `packages/app/src/context/AchievementsContext.js` | sin logros |
| `packages/app/src/views/Settings/settingsSchema.js`, `settingsOptions.js` | «Al abrir la app»; sin las funciones ocultas ni las opciones fijadas (`fluxerSchema`) |
| `packages/app/src/utils/pickedRows.js`, `views/Browse/browseRowLoaders.js` | fuente de filas `fluxer` (secciones de inicio de Emby) |
| `packages/app/src/views/Browse/useBrowseData.js` | barra de inicio con «Tendencias de hoy» (`fluxerTrending.js`) |
| `packages/app/src/views/Settings/Settings.js` | panel «Mi cuenta Fluxer» (`FluxerAccountPanel`) |
| `packages/app/src/components/ItemContextMenu/itemMenuActions.js`, `ItemContextMenu.js`, `views/Player/playerOsd.js`, `TizenPlayer.js`, `WebOSPlayer.js` | «Reportar un problema» |

Tests de Moonfin que fallan: 7 ya fallaban antes; los demás (settingsSchema,
previewRows, settingsLayout, setupSteps, itemMenuActions) comprueban ajustes
o menús que FluxerPlayer oculta o amplía.

## Versiones y actualizaciones (OTA)

FluxerPlayer TV tiene **sus propios números** (`fluxer/version.json`). Las
etiquetas llevan `v` (`v1.0.0`): las de Moonfin sin `v` ya existen en este repo.

- **Publicar una versión** (solo cuando lo decide el dueño del proyecto):
  1. Subir `version` en `fluxer/version.json` (y `moonfinBase` si se ha
     fusionado una versión de Moonfin).
  2. Añadir su sección `## X.Y.Z — título` en `CHANGELOG-FLUXER.md`.
  3. `git tag vX.Y.Z && git push origin vX.Y.Z`. El workflow «FluxerPlayer TV
     Release» compila, firma y publica.
- Lanzarlo a mano solo compila (artefactos de la ejecución), sin publicar.
- **OTA**: lo instalado en la tele es un cascarón con el cargador de Moonfin
  (`scripts/ota/`). Al abrir la app mira la última versión publicada aquí,
  descarga `moonfin-ota-<plataforma>.json/.bin`, comprueba la firma con
  `fluxer/ota/public.pem` y arranca con ella la próxima vez. Solo cambia el
  código: si cambia el cascarón (nombre, iconos, `config.xml`, permisos) hay
  que reinstalar a mano. La versión Legacy de Tizen no lleva OTA.
- **Clave de firma**: `/home/devilgaia/projects/fluxerplayer-secrets/tv-ota-signing.pem`
  (fuera del repo), en el secreto `FLUXER_OTA_SIGNING_KEY`. **Si se pierde,
  las teles instaladas no aceptan más actualizaciones** hasta reinstalar.
