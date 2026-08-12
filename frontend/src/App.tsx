import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RecruitmentPage from './pages/recruitment/RecruitmentPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RecruitmentPage />} />
        <Route path="/recruitment" element={<RecruitmentPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
