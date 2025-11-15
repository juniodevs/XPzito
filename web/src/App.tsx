import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfigPage } from './pages/ConfigPage';
import { ViewerPage } from './pages/ViewerPage';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/config" replace />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/viewer" element={<ViewerPage />} />
        <Route path="*" element={<Navigate to="/config" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
