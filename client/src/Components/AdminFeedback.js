import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllFeedback, deleteFeedback, fetchAIAnalysis } from '../Features/FeedbackSlice';
import axios from 'axios';

const RATING_LABEL = {
  1: { label: 'Poor',      emoji: '😞', color: '#E63946' },
  2: { label: 'Fair',      emoji: '🙁', color: '#FF9F1C' },
  3: { label: 'Good',      emoji: '😐', color: '#48CAE4' },
  4: { label: 'Very Good', emoji: '🙂', color: '#1E4DB7' },
  5: { label: 'Excellent', emoji: '😍', color: '#2ECC71' },
};

// ✅ Get API URL dynamically
const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  const currentHost = window.location.hostname;
  const currentPort = "3000";
  return `http://${currentHost}:${currentPort}`;
};

const API_BASE = getApiUrl();

const AdminFeedback = () => {
  const dispatch = useDispatch();
  const { feedbacks, loading, deleteLoading, error, aiAnalysis, aiLoading, aiError } = useSelector(s => s.feedback);
  
  // Get token from multiple sources
  const tokenFromUsers = useSelector(s => s.users?.token);
  const tokenFromAuth = useSelector(s => s.auth?.token);
  const token = tokenFromUsers || tokenFromAuth || localStorage.getItem('token');

  useEffect(() => {
    dispatch(fetchAllFeedback());
  }, [dispatch]);

  // Fetch AI Analysis
  const handleFetchAIAnalysis = () => {
    console.log("🚀 Triggering AI Evaluation...");
    dispatch(fetchAIAnalysis());
  };

  const handleDelete = async (id) => {
    const result = await dispatch(deleteFeedback(id));
    if (deleteFeedback.fulfilled.match(result)) {
      setTimeout(() => handleFetchAIAnalysis(), 500);
    }
  };

  const avgRating = feedbacks.length
    ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
    : 0;

  const ratingStats = {
    5: feedbacks.filter(f => f.rating === 5).length,
    4: feedbacks.filter(f => f.rating === 4).length,
    3: feedbacks.filter(f => f.rating === 3).length,
    2: feedbacks.filter(f => f.rating === 2).length,
    1: feedbacks.filter(f => f.rating === 1).length,
  };


  if (loading) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: '#0F2E6D' }}>
        ⏳ Loading feedback...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <div style={{
          background: '#fee',
          color: '#c00',
          padding: '20px',
          borderRadius: '12px',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>❌ Error</p>
          <p>{error}</p>
          <button
            onClick={() => dispatch(fetchAllFeedback())}
            style={{
              marginTop: '12px',
              padding: '8px 20px',
              background: '#0F2E6D',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', background: '#F6F8FB', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h2 style={{ color: '#0F2E6D', margin: 0 }}>💬 User Feedback Management</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleFetchAIAnalysis}
            disabled={aiLoading}
            style={{
              padding: '8px 16px',
              background: aiLoading ? '#e0e0e0' : '#0F2E6D',
              border: 'none',
              borderRadius: '8px',
              cursor: aiLoading ? 'not-allowed' : 'pointer',
              color: 'white',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            {aiLoading ? '🤖 Analyzing...' : '🤖 AI Evaluation'}
          </button>
          <button
            onClick={() => dispatch(fetchAllFeedback())}
            style={{
              padding: '8px 16px',
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#0F2E6D',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <p style={{ color: '#888', marginBottom: '30px' }}>
        {feedbacks.length} submissions · Average rating: ⭐ {avgRating} / 5
      </p>

      {/* Rating Statistics Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '12px',
        marginBottom: '25px'
      }}>
        {[5, 4, 3, 2, 1].map(rating => {
          const ri = RATING_LABEL[rating];
          const count = ratingStats[rating];
          const percentage = feedbacks.length ? (count / feedbacks.length) * 100 : 0;
          return (
            <div key={rating} style={{
              background: 'white',
              borderRadius: '12px',
              padding: '12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '20px' }}>{ri.emoji}</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: ri.color }}>{rating} ★</div>
              <div style={{ fontSize: '11px', color: '#666' }}>{ri.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px' }}>{count}</div>
              <div style={{
                width: '100%',
                height: '4px',
                background: '#eee',
                borderRadius: '2px',
                marginTop: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${percentage}%`,
                  height: '100%',
                  background: ri.color,
                  borderRadius: '2px'
                }}></div>
              </div>
            </div>
          );
        })}
      </div>


      {/* 🤖 AI EVALUATION BOX - Enhanced */}
      {(aiAnalysis || aiLoading || aiError) && (
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '20px',
          marginBottom: '30px',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          border: '2px solid rgba(46, 204, 113, 0.3)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '18px 24px',
            background: 'rgba(255,255,255,0.05)',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>🤖</span>
              <div>
                <h3 style={{ color: 'white', margin: '0 0 4px 0', fontSize: '18px' }}>AI-Powered Feedback Evaluation</h3>
                <p style={{ color: '#aaa', margin: 0, fontSize: '12px' }}>Platform & Authority Performance Analysis</p>
              </div>
            </div>
            <button
              onClick={handleFetchAIAnalysis}
              disabled={aiLoading}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                padding: '6px 16px',
                borderRadius: '20px',
                color: 'white',
                cursor: aiLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              {aiLoading ? '⟳ Analyzing...' : '⟳ Refresh'}
            </button>
          </div>

          {aiLoading && (
            <div style={{ padding: '50px', textAlign: 'center', color: '#aaa' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 15px'
              }}></div>
              <p>Claude AI is evaluating user feedbacks...</p>
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}

          {!aiLoading && aiError && (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: '#E74C3C', marginBottom: '15px' }}>⚠️ {aiError}</p>
              <button
                onClick={handleFetchAIAnalysis}
                style={{
                  marginTop: '10px',
                  padding: '8px 20px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Try Again
              </button>
            </div>
          )}

          {!aiLoading && aiAnalysis && (
            <div style={{ padding: '24px', color: '#e0e0e0' }}>
              {/* Summary Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px',
                marginBottom: '25px'
              }}>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px' }}>📊</span>
                  <div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>Overall Sentiment</div>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: 500,
                      background: aiAnalysis.overallSentiment === 'positive' ? '#2ECC71' : 
                                   aiAnalysis.overallSentiment === 'negative' ? '#E74C3C' : '#F39C12',
                      color: '#1a1a2e',
                      marginTop: '5px'
                    }}>
                      {aiAnalysis.overallSentiment === 'positive' && '😊 Positive'}
                      {aiAnalysis.overallSentiment === 'neutral' && '😐 Neutral'}
                      {aiAnalysis.overallSentiment === 'negative' && '😞 Negative'}
                    </div>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px' }}>⭐</span>
                  <div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>AI Average Rating</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>{aiAnalysis.averageRating || avgRating} / 5</div>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px' }}>💬</span>
                  <div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>Analyzed Feedbacks</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>{feedbacks.length}</div>
                  </div>
                </div>
              </div>

              {/* AI Summary Quote */}
              <div style={{
                background: 'rgba(46, 204, 113, 0.1)',
                borderLeft: `4px solid ${aiAnalysis.overallSentiment === 'positive' ? '#2ECC71' : aiAnalysis.overallSentiment === 'negative' ? '#E74C3C' : '#F39C12'}`,
                padding: '16px 20px',
                borderRadius: '12px',
                marginBottom: '25px'
              }}>
                <p style={{ fontSize: '16px', fontStyle: 'italic', margin: 0, color: 'white' }}>
                  "{aiAnalysis.summary}"
                </p>
              </div>

              {/* Strengths & Issues */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                marginBottom: '25px'
              }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '18px' }}>
                  <h4 style={{ color: '#2ECC71', margin: '0 0 12px 0', fontSize: '15px' }}>✅ Key Strengths</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {aiAnalysis.keyStrengths?.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '6px', fontSize: '13px' }}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '18px' }}>
                  <h4 style={{ color: '#E74C3C', margin: '0 0 12px 0', fontSize: '15px' }}>⚠️ Key Issues</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {aiAnalysis.keyIssues?.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '6px', fontSize: '13px' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* User Quotes */}
              {aiAnalysis.userQuotes && aiAnalysis.userQuotes.length > 0 && (
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '15px' }}>📝 What Users Are Saying</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {aiAnalysis.userQuotes.map((quote, idx) => (
                      <div key={idx} style={{
                        background: 'rgba(255,255,255,0.08)',
                        borderRadius: '16px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontStyle: 'italic',
                        maxWidth: '100%'
                      }}>
                        "{quote}"
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ color: 'white', margin: '0 0 15px 0', fontSize: '16px' }}>🎯 AI Recommendations for Platform Improvement</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {aiAnalysis.recommendations.map((rec, idx) => (
                      <div key={idx} style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        padding: '15px',
                        borderLeft: `4px solid ${rec.priority === 'high' ? '#E74C3C' : rec.priority === 'medium' ? '#F39C12' : '#2ECC71'}`
                      }}>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: rec.priority === 'high' ? '#E74C3C' : rec.priority === 'medium' ? '#F39C12' : '#2ECC71',
                            color: '#1a1a2e',
                            fontWeight: 600
                          }}>
                            {rec.priority === 'high' && '🔴 HIGH'}
                            {rec.priority === 'medium' && '🟡 MEDIUM'}
                            {rec.priority === 'low' && '🟢 LOW'}
                          </span>
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.15)'
                          }}>
                            {rec.category}
                          </span>
                        </div>
                        <h5 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'white' }}>{rec.title}</h5>
                        <p style={{ margin: '0 0 8px 0', fontSize: '12px', opacity: 0.8 }}>{rec.description}</p>
                        <p style={{ margin: 0, fontSize: '11px', opacity: 0.6 }}>📈 {rec.expectedImpact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Urgent Actions */}
              {aiAnalysis.urgentActions && aiAnalysis.urgentActions.length > 0 && (
                <div>
                  <h4 style={{ color: '#E74C3C', margin: '0 0 12px 0', fontSize: '15px' }}>🚨 Urgent Actions Needed</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {aiAnalysis.urgentActions.map((action, idx) => (
                      <div key={idx} style={{
                        background: 'rgba(231, 76, 60, 0.15)',
                        border: '1px solid rgba(231, 76, 60, 0.3)',
                        borderRadius: '10px',
                        padding: '8px 14px',
                        fontSize: '12px'
                      }}>
                        ⚠️ {action}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* Feedbacks List with AI Analysis Badges */}
      {/* ============================================================ */}
      <div style={{ display: 'grid', gap: '16px' }}>
        {feedbacks.map(f => {
          const ri = RATING_LABEL[f.rating] || RATING_LABEL[5];
          const isDeleting = deleteLoading === f._id;

          return (
            <div key={f._id} style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px 24px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.07)',
              borderLeft: `5px solid ${ri.color}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '20px',
              opacity: isDeleting ? 0.5 : 1,
              transition: 'opacity 0.2s'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '20px' }}>👤</span>
                  <strong style={{ color: '#0F2E6D' }}>{f.username}</strong>
                  <span style={{ color: '#aaa', fontSize: '13px' }}>{f.email}</span>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <span style={{
                    background: ri.color,
                    color: 'white',
                    padding: '3px 12px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 600
                  }}>
                    {ri.emoji} {ri.label} ({f.rating}/5)
                  </span>
                </div>

                <p style={{ color: '#444', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                  {f.message}
                </p>

                {/* ============================================================ */}
                {/* 🆕 🤖 AI Analysis Badges - عرض تحليل الذكاء الاصطناعي لكل فيدباك */}
                {/* ============================================================ */}
                {f.aiAnalysis && (
                  <div style={{
                    marginTop: '12px',
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    {/* Sentiment Badge */}
                    <span style={{
                      background: f.aiAnalysis.sentiment === 'positive' ? '#2ECC71' : 
                                  f.aiAnalysis.sentiment === 'negative' ? '#E74C3C' : '#F39C12',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: 500
                    }}>
                      {f.aiAnalysis.sentiment === 'positive' && '😊 '}
                      {f.aiAnalysis.sentiment === 'negative' && '😞 '}
                      {f.aiAnalysis.sentiment === 'neutral' && '😐 '}
                      {f.aiAnalysis.sentiment}
                    </span>
                    
                    {/* Urgency Badge */}
                    <span style={{
                      background: f.aiAnalysis.urgency === 'critical' ? '#E74C3C' :
                                  f.aiAnalysis.urgency === 'high' ? '#E67E22' :
                                  f.aiAnalysis.urgency === 'medium' ? '#F39C12' : '#2ECC71',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: 500
                    }}>
                      {f.aiAnalysis.urgency === 'critical' && '🚨 '}
                      {f.aiAnalysis.urgency === 'high' && '⚠️ '}
                      {f.aiAnalysis.urgency}
                    </span>
                    
                    {/* Category Badge */}
                    <span style={{
                      background: '#6C5CE7',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      color: 'white',
                      fontSize: '11px'
                    }}>
                      📁 {f.aiAnalysis.category}
                    </span>
                    
                    {/* Priority Score Badge */}
                    <span style={{
                      background: f.aiAnalysis.priorityScore >= 70 ? '#E74C3C' :
                                  f.aiAnalysis.priorityScore >= 50 ? '#F39C12' : '#2ECC71',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      color: 'white',
                      fontSize: '11px'
                    }}>
                      🎯 {f.aiAnalysis.priorityScore}%
                    </span>
                    
                    {/* Keywords Badges */}
                    {f.aiAnalysis.keywords?.slice(0, 3).map((kw, idx) => (
                      <span key={idx} style={{
                        background: 'rgba(0,0,0,0.05)',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        color: '#666',
                        fontSize: '10px'
                      }}>
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}

                {/* 🆕 AI Summary */}
                {f.aiAnalysis?.summary && (
                  <p style={{
                    marginTop: '10px',
                    fontSize: '12px',
                    color: '#666',
                    fontStyle: 'italic',
                    background: '#f8f9fa',
                    padding: '8px 12px',
                    borderRadius: '8px'
                  }}>
                    🤖 {f.aiAnalysis.summary}
                  </p>
                )}

                <p style={{ color: '#bbb', fontSize: '12px', marginTop: '10px' }}>
                  📅 {new Date(f.createdAt).toLocaleString('en-GB')}
                </p>
              </div>

              <button
                onClick={() => handleDelete(f._id)}
                disabled={isDeleting}
                style={{
                  background: isDeleting ? '#f5f5f5' : '#fff0f0',
                  border: '1px solid #ffcccc',
                  color: '#E63946',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}
              >
                {isDeleting ? '⏳ Deleting...' : '🗑 Delete'}
              </button>
            </div>
          );
        })}

        {!loading && feedbacks.length === 0 && (
          <div style={{ textAlign: 'center', color: '#aaa', padding: '60px' }}>
            No feedback received yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFeedback;