import { useState } from 'react'

export interface ReviewButtonProps {
  /** Position of the floating button */
  position?: 'bottom-left' | 'bottom-right'
  /** Title/tooltip for the button */
  title?: string
  /** Icon or emoji to show (e.g. "💬") */
  icon?: string
  /** Whether to show the feedback widget (e.g. only on certain pages) */
  showFeedback?: boolean
  /** Optional class name for the trigger button */
  className?: string
}

export function ReviewButton({
  position = 'bottom-left',
  title = 'Give Feedback',
  icon = '💬',
  showFeedback = true,
  className = '',
}: ReviewButtonProps) {
  const [popupOpen, setPopupOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit')

  if (!showFeedback) return null

  const positionClass = position === 'bottom-right' ? 'feedback-icon-right' : ''

  return (
    <>
      <div
        className={`feedback-icon ${positionClass} ${className}`.trim()}
        title={title}
        role="button"
        tabIndex={0}
        onClick={() => setPopupOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setPopupOpen(true)
          }
        }}
      >
        {icon}
      </div>

      {popupOpen && (
        <div
          className="popup"
          role="dialog"
          aria-labelledby="feedbackTitle"
          aria-hidden="false"
        >
          <div className="popup-content">
            <span
              className="close"
              role="button"
              tabIndex={0}
              aria-label="Close feedback form"
              onClick={() => setPopupOpen(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setPopupOpen(false)
                }
              }}
            >
              &times;
            </span>
            <h2 id="feedbackTitle">Feedback</h2>

            <div className="tab-nav">
              <button
                type="button"
                className={`tab-btn ${activeTab === 'submit' ? 'active' : ''}`}
                data-tab="submit"
                onClick={() => setActiveTab('submit')}
              >
                Submit Feedback
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                data-tab="history"
                onClick={() => setActiveTab('history')}
              >
                View Past Feedback
              </button>
            </div>

            {activeTab === 'submit' && (
              <div id="submitTab" className="tab-content active">
                <div className="success-message" id="successMessage">
                  Thank you for your feedback! We appreciate it.
                </div>
                <form
                  method="post"
                  action="/submit-feedback"
                  id="feedbackForm"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const form = e.currentTarget
                    const formData = new FormData(form)
                    fetch(form.action, {
                      method: 'POST',
                      body: formData,
                    })
                      .then(() => {
                        const successEl = document.getElementById('successMessage')
                        if (successEl) successEl.style.display = 'block'
                        form.reset()
                      })
                      .catch(console.error)
                  }}
                >
                  <div className="form-group">
                    <label htmlFor="userName">Your Name:</label>
                    <input
                      type="text"
                      id="userName"
                      name="name"
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="userEmail">Email (optional):</label>
                    <input
                      type="email"
                      id="userEmail"
                      name="email"
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="userFeedback">Your Feedback:</label>
                    <textarea
                      id="userFeedback"
                      name="feedback"
                      placeholder="Tell us what you think..."
                      rows={4}
                      required
                    />
                  </div>
                  <button type="submit" className="submit-btn">
                    Submit Feedback
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'history' && (
              <div id="historyTab" className="tab-content active">
                <div id="feedbackHistory" className="feedback-history">
                  <div className="loading" id="historyLoading">
                    Loading feedback
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
