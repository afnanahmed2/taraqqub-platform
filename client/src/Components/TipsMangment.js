import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  addTipAsync,
  updateTipAsync,
  deleteTipAsync,
  editTip,
  updateTipContent,
  updateTipGovernorate,
  saveTipEdit,
  fetchTips,
} from '../Features/TipSlice';

const GOVERNORATES = [
  "All","Muscat","Dhofar","Al Batinah North","Al Batinah South",
  "Al Dakhiliyah","Al Sharqiyah North","Al Sharqiyah South",
  "Al Dhahirah","Al Wusta","Musandam","Al Buraimi",
];

const TYPE_OPTIONS = [
  { value: "rain",   label: "🌧️ Rain"   },
  { value: "wind",   label: "💨 Wind"   },
  { value: "sun",    label: "☀️ Sun"    },
  { value: "danger", label: "🚨 Danger" },
];

const TYPE_META = {
  rain:   { icon: "🌧️", typeBg: "#E0F5FB", typeColor: "#0096C7" },
  wind:   { icon: "💨", typeBg: "#EEF3FF", typeColor: "#1E4DB7" },
  sun:    { icon: "☀️", typeBg: "#FFF3DC", typeColor: "#B96000" },
  danger: { icon: "🚨", typeBg: "#fde8e8", typeColor: "#a82535" },
};

const TipsManagement = () => {
  const dispatch  = useDispatch();
  const tips      = useSelector((s) => Array.isArray(s.tips.tips) ? s.tips.tips : []);
  const status    = useSelector((s) => s.tips.status);
  const addStatus = useSelector((s) => s.tips.addStatus);
  const error     = useSelector((s) => s.tips.error);

  const [tipText,    setTipText]    = useState('');
  const [tipType,    setTipType]    = useState('rain');
  const [tipGov,     setTipGov]     = useState('All');
  const [localError, setLocalError] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterGov,  setFilterGov]  = useState('All');

  useEffect(() => { dispatch(fetchTips(undefined)); }, [dispatch]);

  const handleAddTip = async () => {
    if (!tipText.trim()) { setLocalError('Please write a tip first!'); return; }
    setLocalError('');
    const result = await dispatch(addTipAsync({ type: tipType, content: tipText, governorate: tipGov }));
    if (addTipAsync.fulfilled.match(result)) setTipText('');
    else setLocalError('Failed to add tip.');
  };

  const handleSaveEdit = (tip, index) => {
    if (tip._id) dispatch(updateTipAsync({ id: tip._id, content: tip.content, type: tip.type, governorate: tip.governorate || 'All' }));
    dispatch(saveTipEdit({ index }));
  };

  const handleDelete = (tip) => { if (tip._id) dispatch(deleteTipAsync(tip._id)); };

  const visibleTips = tips.filter((t) => {
    const typeMatch = filterType === 'all' || t.type === filterType;
    const govMatch  = filterGov  === 'All' || t.governorate === filterGov;
    return typeMatch && govMatch;
  });

  const counts = TYPE_OPTIONS.reduce((acc, { value }) => {
    acc[value] = tips.filter((t) => t.type === value).length;
    return acc;
  }, {});

  return (
    <div className="tips-mgmt-page">
      {/* Hero Section */}
      <div className="tips-mgmt-hero">
        <h1 className="hero-title">🛡️ Safety Tips Management</h1>
        <p className="hero-subtitle">Add, edit, or remove tips shown to citizens — per governorate and weather type</p>
       
      </div>

      {/* Main Body with Spacing */}
      <div className="tips-mgmt-body">
        {/* Add Card */}
        <div className="tips-mgmt-add-card">
          <h2 className="tips-mgmt-add-title">➕ Add New Tip</h2>
          <div className="tips-mgmt-add-row">
            <select value={tipType} onChange={(e) => setTipType(e.target.value)} className="tips-mgmt-select">
              {TYPE_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={tipGov} onChange={(e) => setTipGov(e.target.value)} className="tips-mgmt-select">
              {GOVERNORATES.map((g) => <option key={g} value={g}>{g === 'All' ? '🗺️ All Governorates' : `📍 ${g}`}</option>)}
            </select>
          </div>

          {tipType === 'danger' && (
            <div style={{ background: '#fff0f0', borderLeft: '4px solid #dc3545', padding: 12, borderRadius: 8, marginBottom: 15, fontSize: 13 }}>
              🚨 <strong>Danger Alert:</strong> This tip will be highlighted as a critical hazard warning.
            </div>
          )}

          <div className="tips-mgmt-input-row">
            <input
              type="text"
              className="tips-mgmt-input"
              placeholder={tipType === 'danger' ? 'e.g. Cyclone warning: Stay indoors...' : 'Write a safety tip...'}
              value={tipText}
              onChange={(e) => setTipText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTip()}
            />
            <button onClick={handleAddTip} disabled={addStatus === 'loading'} className="tips-mgmt-add-btn">
              {addStatus === 'loading' ? 'Adding…' : '+ Add'}
            </button>
          </div>
          {localError && <p style={{ color: 'red', marginTop: 10 }}>{localError}</p>}
        </div>

        {/* Filter Bar */}
        <div className="tips-filter-bar">
          <span style={{ fontWeight: 600 }}>🔍 Filter:</span>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="tips-mgmt-select">
            <option value="all">All Types</option>
            {TYPE_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={filterGov} onChange={(e) => setFilterGov(e.target.value)} className="tips-mgmt-select">
            {GOVERNORATES.map((g) => <option key={g} value={g}>{g === 'All' ? '🗺️ All Governorates' : `📍 ${g}`}</option>)}
          </select>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#666' }}>Showing {visibleTips.length} of {tips.length}</span>
        </div>

        {/* Tips Grid */}
        <div>
          {status === 'loading' && <p style={{ textAlign: 'center', padding: 40 }}>Loading tips...</p>}
          {status !== 'loading' && visibleTips.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 20 }}>No tips found. Add one above!</div>
          )}
          <div className="tips-cards-grid">
            {visibleTips.map((tip) => {
              const meta = TYPE_META[tip.type] || TYPE_META.sun;
              const realIdx = tips.findIndex((t) => t._id === tip._id);
              return (
                <div key={tip._id || realIdx} className={`tip-card tip-card--${tip.type}`}>
                  <div className="tip-card-header">
                    <span className="tip-card-icon">{meta.icon}</span>
                    <span className="tip-card-type" style={{ background: meta.typeBg, color: meta.typeColor }}>
                      {tip.type.charAt(0).toUpperCase() + tip.type.slice(1)}
                    </span>
                    <span style={{ fontSize: 11, background: '#f0f0f0', padding: '2px 8px', borderRadius: 20 }}>📍 {tip.governorate || 'All'}</span>
                  </div>
                  <div className="tip-card-body">
                    {tip.editing ? (
                      <>
                        <input
                          type="text"
                          value={tip.content}
                          onChange={(e) => dispatch(updateTipContent({ index: realIdx, content: e.target.value }))}
                          className="tip-card-edit-input"
                          style={{ width: '100%', padding: 8, marginBottom: 10, borderRadius: 8, border: '1px solid #ccc' }}
                        />
                        <select
                          value={tip.governorate || 'All'}
                          onChange={(e) => dispatch(updateTipGovernorate({ index: realIdx, governorate: e.target.value }))}
                          className="tips-mgmt-select"
                          style={{ width: '100%' }}
                        >
                          {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </>
                    ) : (
                      <p className="tip-card-content">{tip.content}</p>
                    )}
                  </div>
                  <div className="tip-card-actions">
                    {tip.editing ? (
                      <button className="tip-btn tip-btn--save" onClick={() => handleSaveEdit(tip, realIdx)}>✅ Save</button>
                    ) : (
                      <button className="tip-btn tip-btn--edit" onClick={() => dispatch(editTip({ index: realIdx }))}>✏️ Edit</button>
                    )}
                    <button className="tip-btn tip-btn--delete" onClick={() => handleDelete(tip)}>🗑️ Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TipsManagement;