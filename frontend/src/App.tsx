import { Component, type ReactNode } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { BottomNav } from './components/BottomNav';
import { PageTransition } from './components/PageTransition';
import HomePage from './pages/HomePage';
import TeacherPage from './pages/TeacherPage';
import StudentPage from './pages/StudentPage';
import ResumePage from './pages/ResumePage';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) { console.error('[ErrorBoundary]', err); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>Something went wrong. Please refresh.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const location = useLocation();

  return (
    <ErrorBoundary>
      <div className="min-h-[100dvh]" style={{ background: 'var(--bg)' }}>
        <NavBar />
        <PageTransition>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/student" element={<StudentPage />} />
            <Route path="/teacher" element={<TeacherPage />} />
            <Route path="/resume" element={<ResumePage />} />
          </Routes>
        </PageTransition>
        <BottomNav />
      </div>
    </ErrorBoundary>
  );
}
