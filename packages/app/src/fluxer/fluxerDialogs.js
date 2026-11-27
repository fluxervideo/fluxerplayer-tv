// FluxerPlayer: diálogos propios abiertos. Cierran solos con Atrás, pero su
// oyente comparte la ventana con el de App y stopPropagation no llega a un
// hermano: App mira esto para no tratar la misma pulsación (salir de la app…).

import {useEffect} from 'react';

let open = 0;

export const fluxerDialogOpen = () => open > 0;

/** Cuenta este diálogo como abierto mientras `isOpen`. */
export const useFluxerDialog = (isOpen) => {
	useEffect(() => {
		if (!isOpen) return undefined;
		open += 1;
		return () => {
			// Después de la pulsación que lo cierra, para que App aún lo vea abierto.
			setTimeout(() => {
				open -= 1;
			}, 0);
		};
	}, [isOpen]);
};
