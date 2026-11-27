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
| `packages/app/src/views/Settings/settingsSchema.js`, `settingsOptions.js` | «Al abrir la app»; sin las funciones ocultas (`fluxerSchema`) |

Tests de Moonfin que fallan: 7 ya fallaban antes; otros 8 (settingsSchema,
previewRows, settingsLayout) comprueban ajustes que FluxerPlayer oculta.
