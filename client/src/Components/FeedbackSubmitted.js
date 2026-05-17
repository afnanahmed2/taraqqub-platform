import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const FeedbackSubmitted = () => {
  const location = useLocation();
  const [feedbackData, setFeedbackData] = useState({
    rating: 5, email: '', username: '', feedbackText: ''
  });

  useEffect(() => {
    if (location.state) {
      setFeedbackData({
        rating      : location.state.rating       || 5,
        email       : location.state.email        || '',
        username    : location.state.username     || '',
        feedbackText: location.state.feedbackText || '',
      });
    }
  }, [location]);

  const getRatingInfo = (r) => {
    const map = {
      1: { label: 'Poor',      emoji: '😞', color: '#E63946' },
      2: { label: 'Fair',      emoji: '🙁', color: '#FF9F1C' },
      3: { label: 'Good',      emoji: '😐', color: '#48CAE4' },
      4: { label: 'Very Good', emoji: '🙂', color: '#1E4DB7' },
      5: { label: 'Excellent', emoji: '😍', color: '#2ECC71' },
    };
    return map[r] || map[5];
  };

  const ratingInfo = getRatingInfo(feedbackData.rating);

  return (
    <div className="submitted-page">
      <div className="submitted-hero">
        <div className="hero-overlay">
          <h1 className="hero-title">Thank You!</h1>
          <p className="hero-subtitle">Your feedback has been received</p>
        </div>
      </div>

      <div className="submitted-container">
        <div className="success-card">

          <div className="success-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M7 12l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h2 className="success-title">Feedback Submitted Successfully!</h2>
          <p className="success-message">
            Thank you for sharing your thoughts. Your feedback helps us improve and serve you better.
          </p>

          <div className="summary-card">
            <h3 className="summary-title">Your Feedback Summary</h3>

            {feedbackData.username && (
              <div className="summary-item">
                <span className="summary-label">Username:</span>
                <span className="summary-value">{feedbackData.username}</span>
              </div>
            )}

            {feedbackData.email && (
              <div className="summary-item">
                <span className="summary-label">Email:</span>
                <span className="summary-value">{feedbackData.email}</span>
              </div>
            )}

            <div className="summary-item">
              <span className="summary-label">Your Rating:</span>
              <div className="rating-display">
                <span className="rating-emoji" style={{ color: ratingInfo.color }}>{ratingInfo.emoji}</span>
                <span className="rating-value"  style={{ color: ratingInfo.color }}>
                  {ratingInfo.label} ({feedbackData.rating}/5)
                </span>
                <div className="stars-small">
                  {[1,2,3,4,5].map((s) => (
                    <span key={s} className={`star-small ${s <= feedbackData.rating ? 'star-filled-small' : ''}`}>★</span>
                  ))}
                </div>
              </div>
            </div>

            {feedbackData.feedbackText && (
              <div className="summary-item feedback-text-item">
                <span className="summary-label">Your Feedback:</span>
                <p className="feedback-text-preview">{feedbackData.feedbackText}</p>
              </div>
            )}
          </div>

          <div className="next-steps">
            <h3 className="next-steps-title">What's Next?</h3>
            <ul className="next-steps-list">
              <li><span className="step-icon">✓</span> Our team will review your feedback</li>
              <li><span className="step-icon">✓</span> We'll use your suggestions to improve our platform</li>
              <li><span className="step-icon">✓</span> You may receive updates about your feedback via email</li>
            </ul>
          </div>

          <div className="action-buttons">
            <Link to="/" className="btn-home">
              🏠 Back to Home
            </Link>
            <Link to="/feedback" className="btn-new-feedback">
              ✏️ Submit Another Feedback
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FeedbackSubmitted;