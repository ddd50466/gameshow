import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import WorkDetailPage from './pages/WorkDetailPage';
import UploadPage from './pages/UploadPage';
import MyWorksPage from './pages/MyWorksPage';
import AuthPage from './pages/AuthPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/works/:id" element={<WorkDetailPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/upload/:id" element={<UploadPage />} />
            <Route path="/my" element={<MyWorksPage />} />
            <Route path="/auth" element={<AuthPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
