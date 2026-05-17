/* import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default icon issue with Webpack
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const MapComponent = ({ reports }) => {
  // Default center for Oman (Muscat)
  const defaultCenter = [23.5859, 58.4059]; 
const center = reports.length > 0 && reports[0].coordinates
  ? [reports[0].coordinates.lat, reports[0].coordinates.lng]
  : defaultCenter;
  return (
    <MapContainer center={center} zoom={7} style={{ height: '400px', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution=
          '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      />
      {reports.map((report) => (
        report.coordinates?.lat && report.coordinates?.lng && (
          <Marker 
             key={report._id} 
             position={[report.coordinates.lat, report.coordinates.lng]}
             >
            <Popup>
              <b>{report.title}</b><br />
              Category: {report.category}<br />
              Status: {report.status}<br />
              Priority: {report.priority}<br />
              Assigned to: {report.assignedAuthority || "N/A"}
            </Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  );
};

export default MapComponent;
 */


import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ✅ FIX: Import marker icons directly from the local leaflet package
// instead of using unpkg.com URLs which get blocked by browser Tracking Prevention
import markerIcon2x   from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon     from 'leaflet/dist/images/marker-icon.png';
import markerShadow   from 'leaflet/dist/images/marker-shadow.png';

// ✅ FIX: Delete the broken default _getIconUrl resolver,
// then manually set the icon paths using local imports
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl:       markerIcon,
  shadowUrl:     markerShadow,
});

const OMAN_CENTER = [22.0, 57.5];

const OMAN_BOUNDS = [
  [11.5, 51.5],  // جنوب غرب
  [26.5, 60.0]   // شمال شرق
];

const MapComponent = ({ reports }) => {
  return (
    <MapContainer
      center={OMAN_CENTER}
      zoom={6}
      minZoom={6}
      maxZoom={16}
      maxBounds={OMAN_BOUNDS}
      maxBoundsViscosity={1.0}
      style={{ height: '400px', width: '100%', borderRadius: '12px' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      />
      {reports.map((report) => (
        report.coordinates?.lat && report.coordinates?.lng && (
          <Marker
            key={report._id}
            position={[report.coordinates.lat, report.coordinates.lng]}
          >
            <Popup>
              <b>{report.title}</b><br />
              Category: {report.category}<br />
              Status: {report.status}<br />
              Priority: {report.priority}<br />
              Assigned to: {report.assignedAuthority || "N/A"}
            </Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  );
};

export default MapComponent;