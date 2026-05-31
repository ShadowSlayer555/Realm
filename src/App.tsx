/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useStore } from './store';
import { MainMenu } from './components/MainMenu';
import { HostLobby } from './components/HostLobby';
import { LobbyBrowser } from './components/LobbyBrowser';
import { GameOverlay } from './components/GameOverlay';

export default function App() {
  const { currentView } = useStore();

  return (
    <>
      {currentView === 'main' && <MainMenu />}
      {currentView === 'host_lobby' && <HostLobby />}
      {currentView === 'lobby_browser' && <LobbyBrowser />}
      {currentView === 'game' && <GameOverlay />}
    </>
  );
}
