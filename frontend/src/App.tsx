import { Routes, Route, Link } from 'react-router-dom';
import { WalletButton } from './components/WalletButton';
import TeacherPage from './pages/TeacherPage';
import StudentPage from './pages/StudentPage';
import ResumePage from './pages/ResumePage';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-indigo-600 text-lg">ChainAchieve</span>
          <Link to="/student" className="text-sm text-gray-600 hover:text-indigo-600">Courses</Link>
          <Link to="/teacher" className="text-sm text-gray-600 hover:text-indigo-600">Teacher</Link>
          <Link to="/resume" className="text-sm text-gray-600 hover:text-indigo-600">My Resume</Link>
        </div>
        <WalletButton />
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<StudentPage />} />
          <Route path="/student" element={<StudentPage />} />
          <Route path="/teacher" element={<TeacherPage />} />
          <Route path="/resume" element={<ResumePage />} />
        </Routes>
      </main>
    </div>
  );
}
