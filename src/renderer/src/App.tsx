import { useEffect } from 'react';
import AppShell from './components/AppShell';
import { setupExportEventListeners } from './stores/exportStore';

function App(): React.JSX.Element {
  useEffect(() => {
    // Set up export event listeners when app starts
    setupExportEventListeners();
  }, []);

  return <AppShell />;
}

export default App;
