import {useCallback, useState, useEffect, useMemo} from 'react';
import Spotlight from '@enact/spotlight';
import $L from '@enact/i18n/$L';
import {useAuth} from '../../context/AuthContext';
import {useSettings} from '../../context/SettingsContext';
import {getUserImageUrl} from '../../services/jellyfinApi';
import {sameSiloHousehold} from '../../services/multiServerManager';
import {ModalContainer} from '../../utils/spotlightContainers';
import {CoreAlertDialog, useDialogLayer, portal} from '../CoreDialog';
import ProfileCarousel, {PillButton, PillRow} from '../ProfileCarousel';
import {BRAND_NAMES} from '../../views/Login/loginIcons';

// FLUXER: solo usuarios de Fluxer; cerrar sesión los desvincula del Hub.
import {FLUXER_ONLY} from '../../fluxer/fluxerConfig';
import {forgetFluxerUser, ownerOf, useFluxerSignOut, useFluxerSignOutAll, useFluxerUsers} from '../../fluxer/fluxerAccounts';

import css from './AccountModal.module.less';

const AccountModal = ({
	open,
	onClose,
	onLogout,
	onAddServer,
	onAddUser
}) => {
	const {
		user,
		logout,
		logoutAll,
		servers,
		activeServerInfo,
		switchUser,
		removeUser,
		hasMultipleUsers,
		startAddServerFlow,
		loadServers
	} = useAuth();
	// FLUXER
	const fluxerOwners = useFluxerUsers();
	const fluxerSignOut = useFluxerSignOut();
	const fluxerSignOutAll = useFluxerSignOutAll();
	const {settings} = useSettings();

	const sortedServers = useMemo(() => {
		// FLUXER: solo los usuarios que entraron con Fluxer.
		const list = (Array.isArray(servers) ? servers : [])
			.filter((entry) => !FLUXER_ONLY || Boolean(fluxerOwners?.has(ownerOf(entry))));
		const sortBy = settings.serverSortBy || 'name';
		if (sortBy === 'recent') {
			return list.sort((a, b) => {
				const aTime = a.lastConnected ? Date.parse(a.lastConnected) : 0;
				const bTime = b.lastConnected ? Date.parse(b.lastConnected) : 0;
				if (aTime !== bTime) return bTime - aTime;
				return (a.username || '').localeCompare(b.username || '', undefined, {sensitivity: 'base'});
			});
		}
		if (sortBy === 'added') {
			return list.sort((a, b) => {
				const aTime = a.addedDate ? Date.parse(a.addedDate) : 0;
				const bTime = b.addedDate ? Date.parse(b.addedDate) : 0;
				if (aTime !== bTime) return bTime - aTime;
				return (a.username || '').localeCompare(b.username || '', undefined, {sensitivity: 'base'});
			});
		}
		return list.sort((a, b) => {
			const serverCompare = (a.name || '').localeCompare(b.name || '', undefined, {sensitivity: 'base'});
			if (serverCompare !== 0) return serverCompare;
			return (a.username || '').localeCompare(b.username || '', undefined, {sensitivity: 'base'});
		});
	}, [servers, settings.serverSortBy, fluxerOwners]);

	const [serverToRemove, setServerToRemove] = useState(null);
	const [refocusAfterRemove, setRefocusAfterRemove] = useState(false);

	// Closing the confirm hands focus back to a card that may be gone, so the switcher takes it back.
	useEffect(() => {
		if (!open || serverToRemove || !refocusAfterRemove) return undefined;
		const timer = setTimeout(() => {
			Spotlight.focus('account-modal');
			setRefocusAfterRemove(false);
		}, 150);
		return () => clearTimeout(timer);
	}, [open, serverToRemove, refocusAfterRemove]);

	const handleLogout = useCallback(async () => {
		await (FLUXER_ONLY ? fluxerSignOut() : logout()); // FLUXER
		onClose?.();
		onLogout?.();
	}, [logout, fluxerSignOut, onClose, onLogout]);

	const handleLogoutAll = useCallback(async () => {
		await (FLUXER_ONLY ? fluxerSignOutAll() : logoutAll()); // FLUXER
		onClose?.();
		onLogout?.();
	}, [logoutAll, fluxerSignOutAll, onClose, onLogout]);

	const handleAddUser = useCallback(() => {
		onClose?.();
		onAddUser?.();
	}, [onClose, onAddUser]);

	const handleSelectServer = useCallback(() => {
		startAddServerFlow();
		onClose?.();
		onAddServer?.();
	}, [startAddServerFlow, onClose, onAddServer]);

	const handleActivate = useCallback(async (item) => {
		const {serverId, userId} = item.server;
		const isActive = activeServerInfo?.serverId === serverId && activeServerInfo?.userId === userId;
		if (isActive) {
			onClose?.();
			return;
		}
		await switchUser(serverId, userId);
		onClose?.();
	}, [switchUser, onClose, activeServerInfo]);

	// Only a pointer reaches this, since the remote has no way onto it.
	const handleRemove = useCallback((item) => {
		const {serverId, userId, username, name: serverName} = item.server;
		setServerToRemove({serverId, userId, username, serverName});
	}, []);

	const handleConfirmRemove = useCallback(async () => {
		if (!serverToRemove) return;
		// FLUXER: quitar el abierto es cerrar su sesión; otro, quitarlo del aparato sin cambiar de usuario.
		if (FLUXER_ONLY) {
			const isActive = activeServerInfo?.serverId === serverToRemove.serverId && activeServerInfo?.userId === serverToRemove.userId;
			setServerToRemove(null);
			if (isActive) {
				await fluxerSignOut();
				onClose?.();
				onLogout?.();
				return;
			}
			const entry = (servers || []).find((s) => s.serverId === serverToRemove.serverId && s.userId === serverToRemove.userId);
			if (entry) await forgetFluxerUser(entry);
			await loadServers();
			setRefocusAfterRemove(true);
			return;
		}
		const success = await removeUser(serverToRemove.serverId, serverToRemove.userId);
		if (success) {
			setServerToRemove(null);
			setRefocusAfterRemove(true);
		}
	}, [serverToRemove, removeUser, activeServerInfo, fluxerSignOut, servers, loadServers, onClose, onLogout]);

	const handleCancelRemove = useCallback(() => {
		setServerToRemove(null);
		setRefocusAfterRemove(true);
	}, []);

	const activeIndex = sortedServers.findIndex(
		(s) => activeServerInfo?.serverId === s.serverId && activeServerInfo?.userId === s.userId
	);
	const activeEntry = activeIndex >= 0 ? sortedServers[activeIndex] : null;
	// Sign Out already takes a Silo profile's whole household, so Sign Out All Users is only offered for more than that.
	const othersBesideSignOut = activeEntry
		? sortedServers.some((s) => s !== activeEntry && !sameSiloHousehold(s, activeEntry))
		: hasMultipleUsers;

	const items = useMemo(() => sortedServers.map((server, index) => {
		const isActive = index === activeIndex;
		const imageTag = isActive ? (user?.PrimaryImageTag || server.primaryImageTag) : server.primaryImageTag;
		const brand = BRAND_NAMES[server.serverType || 'jellyfin'];
		const lines = [{text: brand ? `${server.name} · ${brand}` : server.name}];
		if (isActive) lines.push({text: $L('Active'), accent: true});
		return {
			key: `${server.serverId}-${server.userId}`,
			id: server.userId,
			name: server.username,
			imageUrl: getUserImageUrl(server.url, server.userId, imageTag, server.serverType),
			badge: isActive ? 'active' : null,
			lines,
			removable: sortedServers.length > 1 || !isActive,
			server
		};
	}), [sortedServers, activeIndex, user]);

	useDialogLayer({open, onClose, spotlightId: 'account-modal'});

	return (
		<>
			{open && portal(
				<div className={css.layer}>
					<ModalContainer spotlightId="account-modal" className={css.screen}>
						<div className={css.header}>
							<h2 className={css.title}>{$L('Switch User')}</h2>
							{activeEntry && (
								<span className={css.signedInAs}>
									{$L('Signed in as {user} on {server}')
										.replace('{user}', activeEntry.username)
										.replace('{server}', activeEntry.name)}
								</span>
							)}
						</div>

						<div className={css.main}>
							<ProfileCarousel
								items={items}
								initialIndex={Math.max(activeIndex, 0)}
								spotlightId="account-carousel"
								onActivate={handleActivate}
								onRemove={handleRemove}
							/>
						</div>

						<PillRow>
							{/* FLUXER: otro usuario se añade desde «¿Quién va a ver?» */}
							{!FLUXER_ONLY && (
								<PillButton
									icon="person"
									onClick={handleAddUser}
									data-spotlight-id="account-add-user"
									data-selected={items.length === 0 ? 'true' : undefined}
								>
									{$L('Add User')}
								</PillButton>
							)}
							{!FLUXER_ONLY && (
								<PillButton icon="home" onClick={handleSelectServer} data-spotlight-id="account-add-server">
									{$L('Select Server')}
								</PillButton>
							)}
							<PillButton
								onClick={handleLogout}
								data-spotlight-id="account-logout"
								data-selected={FLUXER_ONLY && items.length === 0 ? 'true' : undefined}
							>
								{$L('Sign Out')}
							</PillButton>
							{othersBesideSignOut && (
								<PillButton danger onClick={handleLogoutAll} data-spotlight-id="account-logout-all">
									{$L('Sign Out All Users')}
								</PillButton>
							)}
						</PillRow>
					</ModalContainer>
				</div>
			)}

			<CoreAlertDialog
				open={open && Boolean(serverToRemove)}
				onClose={handleCancelRemove}
				title={$L('Remove User')}
				spotlightId="account-remove-confirm"
				actions={[
					{label: $L('Cancel'), onClick: handleCancelRemove, spotlightId: 'account-cancel-remove'},
					{label: $L('Remove'), onClick: handleConfirmRemove, spotlightId: 'account-confirm-remove'}
				]}
			>
				{serverToRemove && (
					<>
						<p className={css.confirmText}>
							{$L('Are you sure you want to remove {username} from {serverName}?')
								.replace('{username}', serverToRemove.username)
								.replace('{serverName}', serverToRemove.serverName)}
						</p>
						<p className={css.confirmText}>{$L('You will need to sign in again to use this account.')}</p>
					</>
				)}
			</CoreAlertDialog>
		</>
	);
};

export default AccountModal;
