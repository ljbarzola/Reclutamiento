import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RecruitmentPage from './pages/recruitment/RecruitmentPage';
import PrivacyNotice from './pages/recruitment/PrivacyNotice';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RecruitmentPage />} />
        <Route path="/recruitment" element={<RecruitmentPage />} />
        <Route path="/privacidad" element={<PrivacyNotice />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
