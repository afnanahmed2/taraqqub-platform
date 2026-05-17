import React, { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { submitFeedback } from '../Features/FeedbackSlice';

// EmailJS Keys
const EMAILJS_SERVICE_ID  = 'service_1irxpzy';
const EMAILJS_TEMPLATE_ID = 'template_1vlo711';
const EMAILJS_PUBLIC_KEY  = 'b_Fz6RFrS-j7qg9FA';

const Feedback = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { user, isLogin } = useSelector((state) => state.users);

  const [email,        setEmail]        = useState('');
  const [username,     setUsername]     = useState('');
  const [rating,       setRating]       = useState(0);
  const [hoverRating,  setHoverRating]  = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  useEffect(() => {
    if (isLogin && user) {
      if (user.email) setEmail(user.email);
      if (user.name) setUsername(user.name);
      else if (user.email) setUsername(user.email.split('@')[0]);
    }
  }, [isLogin, user]);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setSubmitStatus({ type: 'error', message: 'Please enter your email address.' });
      return;
    }
    if (!username.trim()) {
      setSubmitStatus({ type: 'error', message: 'Please enter your username.' });
      return;
    }
    if (rating === 0) {
      setSubmitStatus({ type: 'error', message: 'Please select a rating.' });
      return;
    }
    if (!feedbackText.trim()) {
      setSubmitStatus({ type: 'error', message: 'Please enter your feedback.' });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // ============================================================
      // 🆕 إرسال مع معلومات التحليل الإضافية (تم إضافة الحقول)
      // ============================================================
      const result = await dispatch(submitFeedback({
        username: username.trim(),
        email: email.trim(),
        rating: rating,
        message: feedbackText.trim(),
        
        // 🆕 🔥 معلومات تحليل إضافية من المتصفح (جديد)
        platform: navigator.platform || 'unknown',
        language: navigator.language || 'unknown',
        userAgent: navigator.userAgent || 'unknown',
        
        // 🆕 تلميح أولي للتصنيف بناءً على محتوى الرسالة (جديد)
        categoryHint: 
          feedbackText.includes('slow') || feedbackText.includes('lag') || feedbackText.includes('crash')
            ? 'performance'
            : feedbackText.includes('hard') || feedbackText.includes('confusing')
            ? 'ux'
            : feedbackText.includes('feature') || feedbackText.includes('add')
            ? 'feature'
            : 'general'
      })).unwrap();

      console.log('Feedback saved with AI analysis:', result);

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          username: username.trim(),
          user_email: email.trim(),
          rating: `${rating} / 5`,
          date: new Date().toLocaleString('en-GB'),
          message: feedbackText.trim(),
        },
        EMAILJS_PUBLIC_KEY
      );

      navigate('/feedback-submitted', {
        state: { email, username, rating, feedbackText }
      });

    } catch (err) {
      console.error('Submit Error:', err);
      setSubmitStatus({
        type: 'error',
        message: typeof err === 'string' ? err : (err?.message || 'Failed to submit. Please try again.')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isLogin && user) {
      if (user.email) setEmail(user.email);
      if (user.name) setUsername(user.name);
    } else {
      setEmail('');
      setUsername('');
    }
    setRating(0);
    setFeedbackText('');
    setSubmitStatus(null);
  };

  const renderStars = () =>
    [1, 2, 3, 4, 5].map((star) => (
      <span
        key={star}
        className={`star ${star <= (hoverRating || rating) ? 'star-filled' : ''}`}
        onClick={() => setRating(star)}
        onMouseEnter={() => setHoverRating(star)}
        onMouseLeave={() => setHoverRating(0)}
        style={{
          fontSize: '2rem',
          cursor: 'pointer',
          color: star <= (hoverRating || rating) ? '#FFD700' : '#ddd',
          transition: 'color 0.2s',
          marginRight: '5px'
        }}
      >
        ★
      </span>
    ));

  return (
    <div className="feedback-page">
      <div className="hero-modern feedback-hero">
        <div className="hero-overlay">
          <h1 className="hero-title">Share Your Feedback</h1>
          <p className="hero-subtitle">Help us improve your experience</p>
        </div>
      </div>

      <div className="feedback-container">
        <div className="feedback-card">
          {isLogin && user && (
            <div style={{
              background: '#e8f0fe',
              padding: '10px 15px',
              borderRadius: '10px',
              marginBottom: '20px',
              textAlign: 'center',
              color: '#0F2E6D'
            }}>
              Welcome back, {user.name}! Your information has been filled automatically and cannot be changed.
            </div>
          )}

          <div className="feedback-box box-email">
            <div className="box-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <h3 className="box-title">Your Email</h3>
            <p className="box-description">We'll keep you updated on your feedback</p>
            <input
              type="email"
              className="feedback-input"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting || isLogin}
              readOnly={isLogin}
              style={{ 
                width: '100%', 
                padding: '10px', 
                borderRadius: '8px', 
                border: '1px solid #ddd',
                backgroundColor: isLogin ? '#f0f0f0' : 'white',
                cursor: isLogin ? 'not-allowed' : 'text',
                opacity: isLogin ? 0.8 : 1
              }}
            />
          </div>

          <div className="feedback-box box-username">
            <div className="box-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="box-title">Username</h3>
            <p className="box-description">Let us know who you are</p>
            <input
              type="text"
              className="feedback-input"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting || isLogin}
              readOnly={isLogin}
              style={{ 
                width: '100%', 
                padding: '10px', 
                borderRadius: '8px', 
                border: '1px solid #ddd',
                backgroundColor: isLogin ? '#f0f0f0' : 'white',
                cursor: isLogin ? 'not-allowed' : 'text',
                opacity: isLogin ? 0.8 : 1
              }}
            />
          </div>

          <div className="feedback-box box-rating">
            <div className="box-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <h3 className="box-title">Rate Your Experience</h3>
            <p className="box-description">How would you rate our platform?</p>
            <div className="stars-container">{renderStars()}</div>
            {rating > 0 && (
              <div className="rating-label" style={{ marginTop: '10px', textAlign: 'center' }}>
                {rating === 1 && '😞 Poor'}
                {rating === 2 && '🙁 Fair'}
                {rating === 3 && '😐 Good'}
                {rating === 4 && '🙂 Very Good'}
                {rating === 5 && '😍 Excellent'}
              </div>
            )}
          </div>

          <div className="feedback-box box-feedback">
            <div className="box-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M21 15C21 15.53 20.79 16.04 20.41 16.41C20.04 16.79 19.53 17 19 17H7L3 21V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H19C19.53 3 20.04 3.21 20.41 3.59C20.79 3.96 21 4.47 21 5V15Z" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <h3 className="box-title">Your Suggestions</h3>
            <p className="box-description">Share your thoughts, ideas, or suggestions</p>
            <textarea
              className="feedback-textarea"
              placeholder="Tell us what you think... How can we improve?"
              rows="5"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              disabled={isSubmitting}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
          </div>

          {submitStatus?.type === 'error' && (
            <div style={{
              background: '#fee',
              color: '#c00',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              {submitStatus.message}
            </div>
          )}

          {submitStatus?.type === 'success' && (
            <div style={{
              background: '#efe',
              color: '#0a0',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              {submitStatus.message}
            </div>
          )}

          <div className="feedback-actions" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button 
              className="btn-cancel" 
              onClick={handleCancel} 
              disabled={isSubmitting}
              style={{
                padding: '12px 30px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                background: '#f5f5f5',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Cancel
            </button>
            <button 
              className="btn-submit" 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              style={{
                padding: '12px 30px',
                borderRadius: '8px',
                border: 'none',
                background: '#0F2E6D',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feedback;