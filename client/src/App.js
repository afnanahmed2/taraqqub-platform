import './App.css';
import "bootstrap/dist/css/bootstrap.min.css";
import { Container, Row } from "reactstrap";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "leaflet/dist/leaflet.css";
//imports
import Home from './Components/Home';
import Register from './Components/Register';
import Login from './Components/Login';
import AdminDashboard from './Components/AdminDashboard';
//import CitizenHome from './Components/CitizenHome';
import ReportPage from './Components/ReportPage';
import WeatherPage from './Components/WeatherPage';
import SuccessPage from './Components/SuccessPage';
import AdminLogin from './Components/AdminLogin';
import Header from './Components/Header';
import { Navigate } from "react-router-dom";
import Footer from './Components/Footer';
//import AdminRoute from "./Components/AdminRoute";
import Profile from "./Components/Profile";
import DashboardCharts from "./Components/DashboardCharts";
import TipsMangment from "./Components/TipsMangment";
import CitizenReort from "./Components/CitizenReport";
import Feedback          from './Components/Feedback';
import FeedbackSubmitted from './Components/FeedbackSubmitted';
import AdminFeedback from './Components/AdminFeedback';


const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  return user ? children : <Navigate to="/login" />;

};

function App() {
  return (
    <Container fluid>
      <Router>
        <Row></Row>

        <Row className="main">
          <Header />
   
    <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/AdminDashboard" element={localStorage.getItem('role') ===
               'admin' ? <AdminDashboard /> : <Navigate to="/login" />}  />
            <Route path="/profile" element={<Profile />} />
            <Route path="/reportPage" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
            <Route path="/weatherPage" element={<WeatherPage />} />
            <Route path="/successPage" element={<SuccessPage />} />
            <Route path="/adminLogin" element={<AdminLogin />} />
            <Route path="/dashboardCharts" element={localStorage.getItem('role') ===
               'admin' ? <DashboardCharts /> : <Navigate to="/login" />}  />
            <Route path="/TipsMangment"
              element={localStorage.getItem('role') === 'admin'? <TipsMangment />: <Navigate to="/login" />
                 }/>
            <Route path="/CitizenReort" element={<CitizenReort />} />
            <Route path="/feedback"           element={<Feedback />} />
<Route path="/feedback-submitted" element={<FeedbackSubmitted />} />
<Route path="/admin/feedback" element={localStorage.getItem('role') === 'admin'? <AdminFeedback />: <Navigate to="/login" />}/>

          </Routes>
         
          <Footer/>
        </Row>

        <Row></Row>
      </Router>
    </Container>
  );
}

export default App;