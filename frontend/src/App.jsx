import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

// ─── Placeholder Page Components ──────────────────────────────────────────────
// These will be replaced by real page files under src/pages/ in future sprints.

const Home = () => (
  <div className="placeholder-page">
    <h1>📝 Notes App</h1>
    <p>Welcome! Navigate to a page:</p>
    <nav>
      <Link to="/login">Login</Link>
      <Link to="/signup">Signup</Link>
      <Link to="/dashboard">Dashboard</Link>
    </nav>
  </div>
);

const Login = () => (
  <div className="placeholder-page">
    <h2>🔐 Login</h2>
    <p>Login page — coming soon.</p>
    <Link to="/">← Back to Home</Link>
  </div>
);

const Signup = () => (
  <div className="placeholder-page">
    <h2>📋 Sign Up</h2>
    <p>Signup page — coming soon.</p>
    <Link to="/">← Back to Home</Link>
  </div>
);

const Dashboard = () => (
  <div className="placeholder-page">
    <h2>🗂️ Dashboard</h2>
    <p>Dashboard page — coming soon.</p>
    <Link to="/">← Back to Home</Link>
  </div>
);

const NotFound = () => (
  <div className="placeholder-page">
    <h2>404 — Page Not Found</h2>
    <Link to="/">← Back to Home</Link>
  </div>
);

// ─── App with Routing ─────────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
