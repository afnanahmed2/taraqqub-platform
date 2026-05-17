import { useState, useEffect } from "react";
import { Upload, Image, Video } from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { useDispatch, useSelector } from "react-redux";
import { createReport } from "../Features/ReportSlice";
import * as yup from "yup";

/* ---------------- VALIDATION ---------------- */
const reportSchema = yup.object().shape({
  title: yup
    .string()
    .min(5, "Title must be at least 5 characters")
    .required("Report title is required"),
  category: yup.string().required("Category is required"),
  description: yup
    .string()
    .min(10, "Description must be at least 10 characters")
    .required("Description is required"),
  location:    yup.string().required("Location is required"),
  governorate: yup.string().required("Governorate is required"),
  files: yup
    .array()
    .of(
      yup.mixed().test(
        "fileType",
        "Only images (JPG, PNG) and videos (MP4, MOV) are allowed",
        (file) =>
          !file ||
          ["image/jpeg", "image/png", "video/mp4", "video/quicktime"].includes(file.type)
      )
    )
    .min(1, "Photo or video is required")
    .max(5, "Maximum 5 files allowed"),
});

/* ---------------- OMAN GOVERNORATES ---------------- */
const omanGovernorates = [
  "Muscat", "Dhofar", "Al Batinah North", "Al Batinah South", "Al Dakhiliyah",
  "Al Sharqiyah North", "Al Sharqiyah South", "Al Dhahirah", "Al Wusta",
  "Musandam", "Al Buraimi",
];

/* ---------------- TRANSLATION ---------------- */
const translations = {
  en: {
    title:    "Submit Your Report",
    subtitle: "Help authorities respond quickly by reporting weather hazards in your area.",
    uploadLabel:       "Upload Photo or Video",
    uploadText:        "Click to upload media",
    uploadFormats:     "Supported formats: JPG, PNG, MP4, MOV",
    reportTitlePlaceholder: "Report Title e.g., Road Damage on Main Street",
    selectCategory:    "Select the Infrastructure Issue",
    categories: [
      "Road Damage", "Flooding/Drainage", "Blocked Drain",
      "Street Lighting", "Traffic Signal", "Waste Management",
      "Public Facility Damage", "Other",
    ],
    submit: "Submit Report",
  },
};

/* ---------------- OMAN BOUNDS ---------------- */
const OMAN_BOUNDS = { minLat: 16.0, maxLat: 26.5, minLng: 51.5, maxLng: 60.0 };

const isWithinOman = (lat, lng) =>
  lat >= OMAN_BOUNDS.minLat &&
  lat <= OMAN_BOUNDS.maxLat &&
  lng >= OMAN_BOUNDS.minLng &&
  lng <= OMAN_BOUNDS.maxLng;

/* ---------------- MAP COMPONENT ---------------- */
function LocationMarker({ setLocation, setCoordinates, setCity, setPosition, onWeatherFetch, setLocationError }) {
  const map = useMap();

  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;

      if (!isWithinOman(lat, lng)) {
        setLocationError("Please select a location within Oman only.");
        return;
      }

      setPosition([lat, lng]);
      setCoordinates({ lat, lng });
      setLocation(`${lat}, ${lng}`);
      map.flyTo([lat, lng], 12);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();

      const country = data.address?.country_code?.toUpperCase();
      if (country && country !== "OM") {
        setLocationError("Selected location is not within Oman. Please pick a location inside Oman.");
        setPosition(null);
        setCoordinates(null);
        setLocation("");
        return;
      }

      setLocationError("");
      const city = data.address.city || data.address.town || data.address.village || "Unknown";
      setCity(city);
      if (onWeatherFetch) onWeatherFetch(lat, lng);
    },
  });

  return null;
}

/* ---------------- MAIN COMPONENT ---------------- */
export default function ReportPage({ language = "en" }) {
  const t        = translations[language];
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isLogin = useSelector((state) => state.users.isLogin);
  const user    = useSelector((state) => state.users.user);

  /* -------- STATES -------- */
  const [title,         setTitle]         = useState("");
  const [category,      setCategory]      = useState("");
  const [description,   setDescription]   = useState("");
  const [location,      setLocation]      = useState("");
  const [coordinates,   setCoordinates]   = useState(null);
  const [city,          setCity]          = useState("");
  const [files,         setFiles]         = useState([]);
  const [previews,      setPreviews]      = useState([]);
  const [errors,        setErrors]        = useState({});
  const [position,      setPosition]      = useState(null);
  const [governorate,   setGovernorate]   = useState("");
  const [cameraOpen,    setCameraOpen]    = useState(false);
  const [stream,        setStream]        = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [weatherData,   setWeatherData]   = useState(null);
  const [locationError, setLocationError] = useState("");

  /* -------- FETCH WEATHER -------- */
  const fetchWeatherForLocation = async (lat, lng) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_WEATHER_URL}?lat=${lat}&lon=${lng}&appid=${process.env.REACT_APP_API_KEY}&units=metric`
      );
      const data = await res.json();
      setWeatherData(data);
    } catch (err) {
      console.error("Weather fetch error:", err);
    }
  };

  /* -------- GET CURRENT LOCATION -------- */
  const getCurrentLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (!isWithinOman(lat, lng)) {
        alert("Your current location is outside Oman. Please select a location manually on the map.");
        return;
      }

      setCoordinates({ lat, lng });
      setLocation(`${lat}, ${lng}`);
      setPosition([lat, lng]);
      setLocationError("");

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      const city = data.address.city || data.address.town || data.address.village || "Unknown";
      setCity(city);
      fetchWeatherForLocation(lat, lng);
    });
  };

  /* -------- FILE HELPERS -------- */
  const clearFile = () => {
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    setFiles([]);
    setPreviews([]);
    const input = document.getElementById("fileInput");
    if (input) input.value = "";
  };

  const removeFile = (index) => {
    URL.revokeObjectURL(previews[index].url);
    setFiles((prev)    => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  /* -------- CAMERA -------- */
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setCameraOpen(true);
    } catch {
      alert("Camera access denied");
    }
  };

  const capturePhoto = () => {
    try {
      const video  = document.getElementById("cameraVideo");
      const canvas = document.createElement("canvas");
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        if (files.length >= 5) return alert("Maximum 5 files allowed");
        const capturedFile = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
        const fileURL      = URL.createObjectURL(blob);
        setFiles((prev)    => [...prev, capturedFile]);
        setPreviews((prev) => [...prev, { type: "image", url: fileURL }]);
      });
    } catch (err) {
      console.error("Camera capture failed:", err);
    } finally {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      setCameraOpen(false);
    }
  };

  /* -------- SUBMIT -------- */
  // ✅ FIX 3: تنظيف formatting — navigate داخل try بشكل صحيح
  const handleSubmit = async () => {
    try {
      await reportSchema.validate(
        { title, category, description, location, files, governorate },
        { abortEarly: false }
      );

      const token = user?.token || localStorage.getItem("token");
      if (!token) {
        alert("User not authenticated. Please login.");
        navigate("/login");
        return;
      }

      setErrors({});
      setLoading(true);

      const formData = new FormData();
      formData.append("title",       title);
      formData.append("category",    category);
      formData.append("description", description);
      formData.append("location",    location);
      formData.append("governorate", governorate);
      formData.append("lat",         coordinates?.lat ?? "");
      formData.append("lng",         coordinates?.lng ?? "");

      if (weatherData) {
        formData.append("weatherCondition",  weatherData.weather?.[0]?.main        || "Clear");
        formData.append("weatherTemp",       weatherData.main?.temp                || 0);
        formData.append("weatherHumidity",   weatherData.main?.humidity            || 0);
        formData.append("weatherRain",       weatherData.rain?.["1h"]              || 0);
        formData.append("weatherDescription",weatherData.weather?.[0]?.description || "");
      }

      files.forEach((f) => formData.append("media", f));

      const result = await dispatch(createReport(formData)).unwrap();

      setLoading(false);

      navigate("/successPage", {
        state: {
          ...result.report,
          categoryCorrected:  result.categoryCorrected,
          originalCategory:   result.originalCategory,
          correctionReason:   result.correctionReason,
          forcedCorrection:   result.forcedCorrection,
          userRecommendation: result.userRecommendation,
          recommendationType: result.recommendationType,
          weather: {
            condition:   weatherData?.weather?.[0]?.main        || null,
            temp:        weatherData?.main?.temp                || null,
            humidity:    weatherData?.main?.humidity            || null,
            rain:        weatherData?.rain?.["1h"]              || 0,
            description: weatherData?.weather?.[0]?.description || null,
          },
        },
      });
    } catch (error) {
      console.error("💥 خطأ:", error);
      setLoading(false);

      if (error.name === "ValidationError") {
        const newErrors = {};
        error.inner.forEach((err) => { newErrors[err.path] = err.message; });
        setErrors(newErrors);
      } else if (error?.message) {
        alert("Failed! : " + error.message);
      } else {
        alert("Failed to submit the Report");
      }
    }
  };

  /* -------- PROTECT PAGE -------- */
  useEffect(() => {
    if (!isLogin || !user) navigate("/login");
  }, [isLogin, user, navigate]);

  if (!isLogin || !user) return null;

  /* -------- UI -------- */
  return (
    <div className="min-vh-100 py-5" style={{ background: "linear-gradient(135deg,#1554B4,#0E3A7C,#2c5364)" }}>
      <div className="container d-flex justify-content-center">
        <div className="bg-white shadow-lg rounded-4 w-100 p-5" style={{ maxWidth: "760px" }}>

          <div className="mb-4">
            <h1>Welcome {user?.name}</h1>
            <h3 className="fw-bold text-primary">{t.title}</h3>
            <p className="text-muted">{t.subtitle}</p>
          </div>

          {/* Upload Section */}
          <div className="mb-4">
            <label className="form-label fw-semibold d-flex gap-2">
              <Upload size={18} /> {t.uploadLabel}
            </label>
            <div
              className="border border-2 border-dashed rounded-4 p-4 text-center"
              style={{ cursor: "pointer", backgroundColor: "#f8fbff" }}
              onClick={() => document.getElementById("fileInput").click()}
            >
              <div className="d-flex justify-content-center gap-4 mb-3">
                <div className="p-3 rounded-circle bg-primary bg-opacity-10"><Image className="text-primary" /></div>
                <div className="p-3 rounded-circle bg-info bg-opacity-10"><Video className="text-info" /></div>
              </div>
              <p className="fw-semibold text-primary mb-1">{t.uploadText}</p>
              <small className="text-muted">{t.uploadFormats}</small>
              <input
                id="fileInput"
                type="file"
                multiple
                accept="image/*,video/*"
                className="d-none"
                onChange={(e) => {
                  const newSelectedFiles = Array.from(e.target.files);
                  if (files.length + newSelectedFiles.length > 5) {
                    alert("You can only upload a maximum of 5 files. Extra files were ignored.");
                  }
                  setFiles((prevFiles) => {
                    const combinedFiles = [...prevFiles, ...newSelectedFiles].slice(0, 5);
                    setPreviews(
                      combinedFiles.map((f) => ({
                        type: f.type?.startsWith("image") ? "image" : "video",
                        url:  URL.createObjectURL(f),
                      }))
                    );
                    return combinedFiles;
                  });
                  e.target.value = "";
                }}
              />
            </div>

            <div className="d-flex justify-content-center gap-2 mt-3">
              <button className="btn btn-outline-primary" onClick={startCamera}>Take Photo Now</button>
              <button className="btn btn-outline-danger" onClick={clearFile} disabled={files.length === 0}>Clear</button>
            </div>

            {cameraOpen && (
              <div className="text-center mt-3">
                <video
                  id="cameraVideo"
                  autoPlay
                  playsInline
                  ref={(video) => { if (video && stream) video.srcObject = stream; }}
                  style={{ width: "100%", borderRadius: "10px" }}
                />
                <button className="btn btn-success mt-2" onClick={capturePhoto}>Capture Photo</button>
              </div>
            )}

            {previews.length > 0 && (
              <div className="mt-3 d-flex flex-wrap justify-content-center gap-3">
                {previews.map((p, index) => (
                  <div
                    key={index}
                    className="position-relative border rounded p-1 bg-light shadow-sm"
                    style={{ width: "90px", height: "90px" }}
                  >
                    <button
                      onClick={() => removeFile(index)}
                      className="position-absolute top-0 start-100 translate-middle btn btn-danger btn-sm rounded-circle p-0"
                      style={{ width: "20px", height: "20px", fontSize: "12px", zIndex: 10 }}
                    >✕</button>
                    {p.type === "image" ? (
                      <img src={p.url} alt="preview" className="rounded w-100 h-100" style={{ objectFit: "cover" }} />
                    ) : (
                      <video src={p.url} className="rounded w-100 h-100" style={{ objectFit: "cover" }} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {errors.files && <p className="text-danger mt-2">{errors.files}</p>}
          </div>

          {/* Title */}
          <label className="form-label fw-semibold">Place the Report Title</label>
          <input
            type="text"
            className="form-control mb-3"
            placeholder={t.reportTitlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {errors.title && <p className="text-danger small">{errors.title}</p>}

          {/* Category */}
          <label className="form-label fw-semibold">Category</label>
          <select className="form-select mb-3" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">{t.selectCategory}</option>
            {t.categories.map((cat) => <option key={cat}>{cat}</option>)}
          </select>
          {errors.category && <p className="text-danger small">{errors.category}</p>}

          {/* Governorate */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Governorate (Oman)</label>
            <select className="form-select" value={governorate} onChange={(e) => setGovernorate(e.target.value)}>
              <option value="">Select Governorate</option>
              {omanGovernorates.map((gov) => <option key={gov}>{gov}</option>)}
            </select>
          </div>
          {errors.governorate && <p className="text-danger small">{errors.governorate}</p>}

          {/* Description */}
          <label className="form-label fw-semibold">Describe the Problem</label>
          <textarea
            className="form-control mb-3"
            rows="4"
            placeholder={t.descriptionPlaceholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {errors.description && <p className="text-danger small">{errors.description}</p>}

          {/* Location */}
          <label className="form-label fw-semibold">Select Location</label><br />
          <button onClick={getCurrentLocation} className="btn btn-outline-primary mb-3">
            Use My Current Location
          </button>
          {errors.location && <p className="text-danger small mt-2">{errors.location}</p>}

          <p className="text-muted small mb-2">
            🗺️ The map is restricted to <strong>Oman only</strong>. Click on the map to set your report location.
          </p>

          <div style={{ height: "350px", borderRadius: "15px", overflow: "hidden" }}>
            <MapContainer
              center={position || [22.0, 57.5]}
              zoom={position ? 12 : 6}
              minZoom={6}
              maxZoom={16}
              maxBounds={[[16.0, 51.5], [26.5, 60.0]]}
              maxBoundsViscosity={1.0}
              style={{ height: "100%" }}
            >
              <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <LocationMarker
                setLocation={setLocation}
                setCoordinates={setCoordinates}
                setCity={setCity}
                setPosition={setPosition}
                onWeatherFetch={fetchWeatherForLocation}
                setLocationError={setLocationError}
              />
              {position && <Marker position={position} />}
            </MapContainer>
          </div>

          {locationError && <p className="text-danger mt-2">⚠️ {locationError}</p>}
          {city && <p className="text-success mt-2">Selected City: {city}</p>}

          {/* Weather Indicator */}
          {weatherData && (
            <div style={{
              marginTop:    "12px",
              padding:      "12px 16px",
              borderRadius: "12px",
              background: weatherData.weather?.[0]?.main === "Rain" || weatherData.weather?.[0]?.main === "Thunderstorm"
                ? "linear-gradient(135deg, #1a3a5c, #0d2137)"
                : "linear-gradient(135deg, #1a3a2a, #0d2118)",
              border: weatherData.weather?.[0]?.main === "Rain" || weatherData.weather?.[0]?.main === "Thunderstorm"
                ? "1px solid rgba(72,202,228,0.4)"
                : "1px solid rgba(6,214,160,0.4)",
              color:   "#fff",
              display: "flex",
              alignItems: "center",
              gap:     "12px",
              fontSize: "14px",
            }}>
              <span style={{ fontSize: "24px" }}>
                {weatherData.weather?.[0]?.main === "Rain"            ? "🌧️"
                  : weatherData.weather?.[0]?.main === "Thunderstorm" ? "⛈️"
                  : weatherData.weather?.[0]?.main === "Clouds"       ? "☁️"
                  : "☀️"}
              </span>
              <div>
                <div style={{ fontWeight: 700, marginBottom: "2px" }}>Current Weather at Location</div>
                <div style={{ color: "rgba(255,255,255,0.8)" }}>
                  {weatherData.weather?.[0]?.description} · {Math.round(weatherData.main?.temp)}°C · Humidity {weatherData.main?.humidity}%
                </div>
                {(weatherData.weather?.[0]?.main === "Rain" || weatherData.weather?.[0]?.main === "Thunderstorm") && (
                  <div style={{ marginTop: "4px", color: "#48CAE4", fontWeight: 600, fontSize: "12px" }}>
                    ⚠️ Weather-based priority adjustment will be applied to this report
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="d-grid mt-4">
            <button
              onClick={handleSubmit}
              className="btn btn-primary btn-lg fw-semibold rounded-pill"
              disabled={loading}
            >
              {loading ? "Submitting Report..." : t.submit}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}