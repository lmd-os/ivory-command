import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FIELDS = [
  { id: 'name',    label: 'Full Name',     type: 'text',  required: true,  placeholder: 'Your name' },
  { id: 'email',   label: 'Email',         type: 'email', required: true,  placeholder: 'your@email.com' },
  { id: 'phone',   label: 'Phone',         type: 'tel',   required: false, placeholder: '+1 (555) 000-0000' },
  { id: 'message', label: 'Message',       type: 'textarea', required: false, placeholder: 'Tell us about your needs...' },
];

export function ContactModal({ open, onClose }) {
  const [form, setForm]       = useState({ name: '', email: '', phone: '', message: '' });
  const [errors, setErrors]   = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState(null);

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name  = 'Required';
    if (!form.email.trim())   e.email = 'Required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Invalid email';
    }
    return e;
  };

  const handleSubmit = (evt) => {
    evt.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitted(true);
  };

  const handleChange = (id, value) => {
    setForm((f) => ({ ...f, [id]: value }));
    setErrors((e) => ({ ...e, [id]: undefined }));
  };

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          style={styles.backdrop}
          onClick={handleBackdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            style={styles.modal}
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Close */}
            <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            {submitted ? (
              <motion.div
                style={styles.successWrap}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div style={styles.successIcon}>✦</div>
                <div style={styles.successTitle}>Request received.</div>
                <p style={styles.successText}>
                  Our team will contact you within 24 hours to discuss your private command center.
                </p>
                <button style={styles.btnPrimary} onClick={onClose}>
                  Close
                </button>
              </motion.div>
            ) : (
              <>
                <div style={styles.modalHeader}>
                  <div style={styles.eyebrow}>Command Center</div>
                  <h2 style={styles.modalTitle}>Request your private command center</h2>
                  <p style={styles.modalSubtitle}>
                    A dedicated intelligence platform for your entire fleet operation.
                  </p>
                </div>

                <form style={styles.form} onSubmit={handleSubmit} noValidate>
                  {FIELDS.map((field) => (
                    <div key={field.id} style={styles.fieldWrap}>
                      <label style={styles.label} htmlFor={field.id}>
                        {field.label}
                        {field.required && <span style={{ color: 'var(--c-gold)' }}> *</span>}
                      </label>

                      {field.type === 'textarea' ? (
                        <textarea
                          id={field.id}
                          style={{
                            ...styles.input,
                            height: 100,
                            resize: 'none',
                            borderColor: errors[field.id] ? 'var(--c-red)' : focused === field.id ? 'var(--c-gold)' : 'var(--c-border)',
                          }}
                          value={form[field.id]}
                          onChange={(e) => handleChange(field.id, e.target.value)}
                          onFocus={() => setFocused(field.id)}
                          onBlur={() => setFocused(null)}
                          placeholder={field.placeholder}
                        />
                      ) : (
                        <input
                          id={field.id}
                          type={field.type}
                          style={{
                            ...styles.input,
                            borderColor: errors[field.id] ? 'var(--c-red)' : focused === field.id ? 'var(--c-gold)' : 'var(--c-border)',
                          }}
                          value={form[field.id]}
                          onChange={(e) => handleChange(field.id, e.target.value)}
                          onFocus={() => setFocused(field.id)}
                          onBlur={() => setFocused(null)}
                          placeholder={field.placeholder}
                          required={field.required}
                        />
                      )}

                      {errors[field.id] && (
                        <div style={styles.fieldError}>{errors[field.id]}</div>
                      )}
                    </div>
                  ))}

                  <button type="submit" style={styles.btnPrimary}>
                    Send Request
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.88)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 500,
    padding: 24,
  },
  modal: {
    position: 'relative',
    background: 'var(--c-dark)',
    border: '1px solid var(--c-border)',
    borderRadius: 4,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '48px 40px 40px',
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--c-subtle)',
    padding: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeader: {
    marginBottom: 32,
  },
  eyebrow: {
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    letterSpacing: '3px',
    textTransform: 'uppercase',
    color: 'var(--c-gold)',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: 'var(--f-sans)',
    fontWeight: 200,
    fontSize: 22,
    letterSpacing: '1px',
    color: 'var(--c-white)',
    lineHeight: 1.3,
    marginBottom: 10,
  },
  modalSubtitle: {
    fontFamily: 'var(--f-sans)',
    fontSize: 13,
    color: 'var(--c-subtle)',
    lineHeight: 1.6,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  fieldWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontFamily: 'var(--f-mono)',
    fontSize: 10,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    color: 'var(--c-dim)',
  },
  input: {
    background: 'var(--c-card)',
    border: '1px solid var(--c-border)',
    borderRadius: 2,
    padding: '11px 14px',
    fontFamily: 'var(--f-sans)',
    fontSize: 13,
    color: 'var(--c-white)',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s ease',
  },
  fieldError: {
    fontFamily: 'var(--f-mono)',
    fontSize: 10,
    color: 'var(--c-red)',
    letterSpacing: '0.5px',
  },
  btnPrimary: {
    background: 'var(--c-gold)',
    border: 'none',
    borderRadius: 2,
    padding: '13px 24px',
    fontFamily: 'var(--f-sans)',
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: '#000',
    cursor: 'pointer',
    marginTop: 8,
    transition: 'background 0.2s ease',
    width: '100%',
  },
  successWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    textAlign: 'center',
    padding: '16px 0',
  },
  successIcon: {
    fontSize: 32,
    color: 'var(--c-gold)',
  },
  successTitle: {
    fontFamily: 'var(--f-sans)',
    fontWeight: 200,
    fontSize: 22,
    letterSpacing: '3px',
    color: 'var(--c-white)',
  },
  successText: {
    fontFamily: 'var(--f-sans)',
    fontSize: 13,
    color: 'var(--c-subtle)',
    lineHeight: 1.7,
    maxWidth: 320,
  },
};
