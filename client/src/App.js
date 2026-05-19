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
import ReportPage from './Components/ReportPage';
import WeatherPage from './Components/WeatherPage';
import SuccessPage from './Components/SuccessPage';
import AdminLogin from './Components/AdminLogin';
import Header from './Components/Header';
import { Navigate } from "react-router-dom";
import Footer from './Components/Footer';
import Profile from "./Components/Profile";
import DashboardCharts from "./Components/DashboardCharts";
import TipsMangment from "./Components/TipsMangment";
import CitizenReort from "./Components/CitizenReport";
import Feedback          from './Components/Feedback';
import FeedbackSubmitted from './Components/FeedbackSubmitted';
import AdminFeedback from './Components/AdminFeedback';


// 👤 حارس مسارات المستخدم العادي
const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  return user ? children : <Navigate to="/login" />;
};

// 👑 حارس مسارات الأدمن (تم تعديله ليقرأ الرتبة من كائن الـ user بشكل صحيح)
const AdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  
  // التحقق من وجود المستخدم وأن رتبته المخزنة في المونجو هي admin
  if (user && user.role && user.role.trim().toLowerCase() === "admin") {
    return children;
  }
  
  // إذا لم يكن أدمن، يتم توجيهه لصفحة لوجن الأدمن
  return <Navigate to="/adminLogin" />;
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
            <Route path="/weatherPage" element={<WeatherPage />} />
            <Route path="/CitizenReort" element={<CitizenReort />} />
            {/* 👤 مسارات محمية للمواطنين */}
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/reportPage" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />   
            <Route path="/successPage" element={<ProtectedRoute><SuccessPage /></ProtectedRoute>} />     
            <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>}  />
            <Route path="/feedback-submitted" element={<ProtectedRoute><FeedbackSubmitted /></ProtectedRoute>} />            
            {/* 👑 مسارات محمية للأدمن  */}
            <Route path="/adminLogin" element={<AdminLogin />} />
            <Route path="/AdminDashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>}  />           
            <Route path="/dashboardCharts" element={<AdminRoute><DashboardCharts /></AdminRoute>} />
            <Route path="/TipsMangment" element={<AdminRoute><TipsMangment /></AdminRoute>}/>
            <Route path="/admin/feedback" element={<AdminRoute><AdminFeedback /></AdminRoute>}/>

          </Routes>
         
          <Footer/>
        </Row>

        <Row></Row>
      </Router>
    </Container>
  );
}

export default App;