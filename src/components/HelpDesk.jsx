import React, { useState, useEffect } from 'react';
import { Send, Phone, MessageSquare, AlertCircle, HelpCircle, CheckCircle } from 'lucide-react';

const FAQS = [
  {
    id: "faq-wifi",
    question: "How do I connect to the GCTU Student Wi-Fi?",
    answer: "Select the 'GCTU-STUDENTS' network on your device. When the routing page appears, log in using your GCTU Student Portal ID and the default password provided at the admissions office. For IT support, visit the FOCIS computer labs."
  },
  {
    id: "faq-clinic",
    question: "Where is the School Clinic located and what are the hours?",
    answer: "The School Hospital/Clinic is situated in the north sector, immediately adjacent to Classroom Block G (SGSR). It operates 24/7 for emergencies, consultation, and dispensary services, and is completely free of charge upon presenting a valid student ID."
  },
  {
    id: "faq-portal",
    question: "How do I access my GCTU Digital Student Portal?",
    answer: "Go to portal.gctu.edu.gh in your browser. Enter your registered index number as username and the temporary password sent to your email. You can view your grades, register for courses, and print your fees transcripts here."
  },
  {
    id: "faq-deadlines",
    question: "How can I check academic registration deadlines?",
    answer: "Filing and registry deadlines are published on the electronic board at the Main Administration Building foyer. You can also view current university circulars under the 'Announcements' tab on the general website gctu.edu.gh."
  }
];

const CONTACTS = [
  { dept: "Main Admissions Office", phone: "+233 302 200 233" },
  { dept: "Academic Affairs Helpdesk", phone: "+233 302 221 234" },
  { dept: "FoCIS CS/IT Dean's office", phone: "+233 302 251 543" },
  { dept: "Engineering Faculty Admin", phone: "+233 302 251 654" },
  { dept: "School Clinic Emergency Line", phone: "+233 244 567 890" }
];

export default function HelpDesk() {
  const [openFaq, setOpenFaq] = useState(null);
  const [tickets, setTickets] = useState([]);
  
  // Form State
  const [name, setName] = useState('');
  const [faculty, setFaculty] = useState('Computing (FoCIS)');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Load existing tickets from LocalStorage on mount
  useEffect(() => {
    const savedTickets = localStorage.getItem('gctu_navigator_tickets');
    if (savedTickets) {
      setTickets(JSON.parse(savedTickets));
    } else {
      // Default welcome ticket from helpdesk to make it friendly
      const defaultTicket = {
        id: "TKT-1001",
        name: "Campus Support",
        subject: "Welcome to GCTU Support!",
        message: "This is your support log. Feel free to submit any questions regarding the campus, and our automatic helpdesk bots will assist you instantly.",
        faculty: "IT Welfare",
        status: "replied",
        reply: "Hello! We are glad to assist you. If you are offline, our AI router will still trigger helpful diagnostic guides immediately. Have a great day navigating Accra campus!",
        date: new Date().toLocaleDateString()
      };
      setTickets([defaultTicket]);
      localStorage.setItem('gctu_navigator_tickets', JSON.stringify([defaultTicket]));
    }
  }, []);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !subject || !message) {
      alert("Please fill out all required fields.");
      return;
    }

    setSubmitting(true);

    const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket = {
      id: ticketId,
      name,
      faculty,
      subject,
      message,
      status: 'open',
      date: new Date().toLocaleDateString()
    };

    const updatedTickets = [newTicket, ...tickets];
    setTickets(updatedTickets);
    localStorage.setItem('gctu_navigator_tickets', JSON.stringify(updatedTickets));

    // Clear form
    setName('');
    setSubject('');
    setMessage('');
    setSuccess(true);
    setSubmitting(false);

    // Simulated Bot Auto-responder after 3 seconds!
    setTimeout(() => {
      setTickets((currentTickets) => {
        const parsed = currentTickets.map(t => {
          if (t.id === ticketId) {
            let botReply = "Thank you for contacting GCTU Help Desk. We have received your query. An academic officer from your faculty will contact you shortly.";
            
            // Dynamic helpful responds based on keywords!
            const lowerMsg = (message + " " + subject).toLowerCase();
            if (lowerMsg.includes('wi-fi') || lowerMsg.includes('wifi') || lowerMsg.includes('internet')) {
              botReply = "Hi! For campus Wi-Fi troubles, please ensure you are in range of the GCTU-STUDENTS routers located around COLT block and Administration. Clear your phone cache or visit the CIT directorate floor in the Administration building to renew your access.";
            } else if (lowerMsg.includes('clinic') || lowerMsg.includes('sick') || lowerMsg.includes('hospital') || lowerMsg.includes('health')) {
              botReply = "Hello. If you require medical attention, you may walk straight into the GCTU School Hospital located next to SGSR block. Ensure you carry your GCTU Student ID card. For absolute medical emergencies, please dial our direct line at +233 244 567 890.";
            } else if (lowerMsg.includes('portal') || lowerMsg.includes('grade') || lowerMsg.includes('exam')) {
              botReply = "Greetings! Digital Student Portal logins are managed by Academic registry. If you are locked out or see incorrect transcripts, please write directly to registry@gctu.edu.gh with your index number and an image of your receipt.";
            } else if (lowerMsg.includes('fees') || lowerMsg.includes('money') || lowerMsg.includes('pay') || lowerMsg.includes('bank')) {
              botReply = "Hi! Tuition payments are validated through EcoBank or Consolidated Bank Ghana (CBG) partners. Once deposited, ensure you bring your physical deposit slip to the finance counter at the Admin block to obtain your receipt.";
            }

            return {
              ...t,
              status: 'replied',
              reply: botReply
            };
          }
          return t;
        });
        localStorage.setItem('gctu_navigator_tickets', JSON.stringify(parsed));
        return parsed;
      });
    }, 2500);

    setTimeout(() => {
      setSuccess(false);
    }, 4000);
  };

  return (
    <div id="help-desk-tab" className="help-desk-container">
      
      <div className="help-grid-split">
        {/* Left column FAQs */}
        <div className="help-section">
          <h3 className="section-header" id="faq-header">
            <HelpCircle size={18} /> GCTU Knowledge Base
          </h3>
          
          <div className="faq-card" id="faq-card-element">
            {FAQS.map((faq, index) => (
              <div 
                key={faq.id} 
                className={`faq-item ${openFaq === index ? 'open' : ''}`}
                id={`faq-item-${faq.id}`}
              >
                <button 
                  className="faq-trigger" 
                  id={`faq-trigger-${faq.id}`}
                  onClick={() => toggleFaq(index)}
                >
                  <span>{faq.question}</span>
                  <span className="faq-icon-arrow">▼</span>
                </button>
                <div className="faq-content" id={`faq-content-${faq.id}`}>
                  <p className="faq-inner-text">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>

          <h3 className="section-header" id="hotlines-header" style={{ marginTop: '0.5rem' }}>
            <Phone size={18} /> GCTU Support Hotlines
          </h3>
          <div className="contact-list" id="hotline-list">
            {CONTACTS.map((con, index) => (
              <div key={index} className="contact-card" id={`contact-card-${index}`}>
                <div className="contact-info">
                  <span className="contact-dept">{con.dept}</span>
                  <span className="contact-phone">{con.phone}</span>
                </div>
                <button 
                  className="dial-btn"
                  id={`dial-btn-${index}`}
                  onClick={() => window.open(`tel:${con.phone.replace(/\s+/g, '')}`)}
                  title={`Dial ${con.dept}`}
                >
                  <Phone size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right column submitting ticket */}
        <div className="help-section">
          <h3 className="section-header" id="support-ticket-header">
            <MessageSquare size={18} /> Submit Help Request
          </h3>
          
          <div className="support-form-card" id="support-form-card">
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Encountering Wi-Fi trouble, map inaccuracies, or academic desk issues? File a request in our offline-ready system.
            </p>
            
            {success && (
              <div className="simulation-banner" style={{ backgroundColor: '#E8F5E9', borderLeftColor: '#2E7D32', color: '#1B5E20', display: 'flex', alignItems: 'center', gap: '0.5rem' }} id="submit-success-banner">
                <CheckCircle size={16} /> Request filed! Resolving support response...
              </div>
            )}

            <form onSubmit={handleSubmit} className="support-form" id="help-desk-form">
              <div className="form-group">
                <label htmlFor="student-name">Full Name *</label>
                <input 
                  type="text" 
                  id="student-name"
                  className="form-inner-input" 
                  placeholder="e.g. Ama Serwaa"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="student-faculty">Your Department / Faculty</label>
                <select 
                  id="student-faculty" 
                  className="form-inner-input"
                  style={{ height: '38px', padding: '0 0.5rem', backgroundColor: 'var(--surface)' }}
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                >
                  <option value="Computing (FoCIS)">Faculty of Computing (FoCIS)</option>
                  <option value="Engineering">Faculty of Engineering</option>
                  <option value="IT Business">Faculty of IT Business</option>
                  <option value="Graduate Studies">School of Graduate Studies & Research</option>
                  <option value="Visitor/Other">Visitor / Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="student-subject">Subject *</label>
                <input 
                  type="text" 
                  id="student-subject"
                  className="form-inner-input" 
                  placeholder="e.g. Wi-Fi Connection Error"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="student-message">How can GCTU help you? *</label>
                <textarea 
                  id="student-message" 
                  className="form-inner-input" 
                  rows={4} 
                  placeholder="Detail your request..."
                  required
                  style={{ resize: 'none' }}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="submit-support-btn" 
                id="submit-support-ticket-btn"
                disabled={submitting}
              >
                <Send size={15} /> {submitting ? "Filing..." : "Submit File"}
              </button>
            </form>
          </div>

          {/* Ticket history display */}
          <h3 className="section-header" id="recent-tickets-header" style={{ marginTop: '0.5rem' }}>
            Recent Activities
          </h3>
          <div className="ticket-history" id="ticket-history-list">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="ticket-item" id={`ticket-item-${ticket.id}`}>
                <div className="ticket-top">
                  <span className="ticket-id">{ticket.id} • {ticket.date}</span>
                  <span className={`ticket-status ${ticket.status}`}>
                    {ticket.status === 'open' ? '⌛ Pending' : '✓ Replied'}
                  </span>
                </div>
                <h4 className="ticket-subject">{ticket.subject}</h4>
                <p className="ticket-msg">"{ticket.message}"</p>
                {ticket.reply && (
                  <div className="ticket-reply" id={`ticket-reply-${ticket.id}`}>
                    <span className="ticket-reply-author">🏫 Campus Support Desk Officer:</span>
                    <p>{ticket.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
