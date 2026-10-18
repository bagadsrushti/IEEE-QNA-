import React, { useState } from 'react';
import { Send, Check, Shield, Calendar, MapPin, Plus, AlertCircle, Menu, X, Maximize2 } from 'lucide-react';
import { questionAPI } from '../services/api';
import Checkerboard from '../components/TechUncutCheckerboard';
import loveBabbarImg from '../assets/love_babbar.png';
import loveBabbarFullImg from '../assets/love_babbar_full.png';

const exampleChips = [
  { label: 'DSA roadmap', text: 'How should I start learning DSA and what is the best roadmap for it?' },
  { label: 'Web development', text: 'What are the best full stack web development projects to build for placements?' },
  { label: 'Career advice', text: 'How to prepare for software engineering off-campus tech placements and interviews?' }
];

const topicPills = ['DSA', 'Web Dev', 'Careers'];

const SubmitPage = ({ onNavigateToAdmin }) => {
  const [questionText, setQuestionText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPosterModal, setShowPosterModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = questionText.trim();
    if (!trimmed || trimmed.length < 5) {
      setErrorMsg('Please enter a question with at least 5 characters.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Automatic language detection handled seamlessly by the backend AI pipeline
      const res = await questionAPI.submit({
        text: trimmed,
        language: 'auto'
      });

      if (res.data.success) {
        setSubmitted(true);
        setQuestionText('');
      }
    } catch (err) {
      if (err.response?.data?.isDuplicate) {
        setErrorMsg('This question was just submitted a moment ago. Topic count has been updated!');
      } else if (err.response?.data?.aiOffline) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg(err.response?.data?.message || 'Failed to submit question. Please check connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExample = (ex) => {
    setQuestionText(ex.text);
    setErrorMsg('');
  };

  const handleAskAnother = () => {
    setSubmitted(false);
    setQuestionText('');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-[#F0F4FC] sm:py-6 flex items-center justify-center font-sans antialiased text-[#102A56]">
      {/* Mobile Device Frame Container */}
      <div className="w-full max-w-[430px] min-h-screen sm:min-h-[820px] bg-[#F5F8FF] sm:rounded-[36px] sm:shadow-2xl sm:border sm:border-slate-200/90 relative overflow-hidden flex flex-col justify-between p-4 sm:p-5">
        
        {/* Decorative Bottom-Right Checkerboard Pattern (Anchored to mobile container) */}
        <div className="absolute bottom-2 right-2 z-0 pointer-events-none">
          <Checkerboard className="w-16 h-9 opacity-90" />
        </div>

        {/* Top Header Bar */}
        <header className="w-full flex items-center justify-between pt-1 pb-3 relative z-10">
          {/* Top-Left Blue Checkerboard Motif */}
          <div className="w-16 flex-shrink-0">
            <Checkerboard className="w-16 h-9 rounded-xs" />
          </div>

          {/* Center TECH UNCUT Brand Logo */}
          <div className="flex flex-col items-center text-center">
            <div className="leading-none tracking-tight">
              <span className="block font-black text-xl sm:text-2xl text-[#0866FF] tracking-tighter">
                TECH
              </span>
              <span className="block font-black text-2xl sm:text-3xl text-[#0866FF] tracking-tight -mt-1">
                UNCUT
              </span>
            </div>
            <span className="text-[10px] font-bold text-[#0866FF] tracking-[0.25em] uppercase mt-0.5">
              AUDIENCE Q&amp;A
            </span>
          </div>

          {/* Right: Menu Button */}
          <div className="w-16 flex justify-end flex-shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:text-[#0866FF] hover:bg-white/80 transition-colors"
              aria-label="Event Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 stroke-[2.5]" />}
            </button>
          </div>
        </header>

        {/* Dropdown Menu Modal for Organizers */}
        {mobileMenuOpen && (
          <div className="w-full mb-3 z-30">
            <div className="bg-white rounded-2xl shadow-lg border border-[#D8E6FF] p-4 text-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800">TECH UNCUT Portal</span>
                <span className="text-[10px] bg-blue-50 text-[#0866FF] px-2 py-0.5 rounded-full font-semibold">
                  Live Session
                </span>
              </div>
              <p className="text-slate-500 text-[11px]">
                FATEH &times; IEEE Student Branch, VIT Pune
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigateToAdmin();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#EEF4FF] hover:bg-[#D8E6FF] text-[#0866FF] font-semibold text-center transition-colors text-xs"
                >
                  Organizer / Admin Dashboard &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="w-full flex-1 flex flex-col justify-start relative z-10 space-y-3.5">
          {!submitted ? (
            /* ==================================================== */
            /* SCREEN 1: QUESTION SUBMISSION SCREEN                */
            /* ==================================================== */
            <div className="space-y-3.5">
              {/* Love Babbar Speaker Card with authentic photo */}
              <div className="bg-[#EEF4FF] border border-[#D8E6FF] rounded-2xl p-3 sm:p-3.5 flex items-center space-x-3.5 shadow-xs">
                {/* Speaker Portrait Avatar */}
                <div
                  className="relative flex-shrink-0 cursor-pointer group"
                  onClick={() => setShowPosterModal(true)}
                  title="Click to view full speaker photo"
                >
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl p-0.5 bg-gradient-to-tr from-[#0866FF] to-blue-400 overflow-hidden shadow-md flex items-center justify-center transition-transform group-hover:scale-105">
                    <img
                      src={loveBabbarImg}
                      alt="Love Babbar, TECH UNCUT speaker"
                      className="w-full h-full object-cover object-top rounded-[14px]"
                    />
                  </div>
                  {/* Speaker badge */}
                  <span className="absolute -bottom-1 -right-1 bg-[#0866FF] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-white shadow-xs">
                    Speaker
                  </span>
                </div>

                {/* Speaker Metadata */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <h3 className="font-extrabold text-[#102A56] text-sm sm:text-base tracking-tight truncate">
                      Love Babbar
                    </h3>
                    <span className="text-[#0866FF] text-xs font-semibold">&bull;</span>
                    <span className="text-[#0866FF] text-xs sm:text-sm font-bold truncate">
                      DSA &amp; Web Dev
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1.5 text-[11px] sm:text-xs text-slate-600 flex-wrap gap-y-1">
                    <span className="flex items-center font-medium bg-white px-2 py-0.5 rounded-lg border border-[#D8E6FF]/80">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-[#0866FF]" />
                      21 Oct &bull; 1 PM
                    </span>
                    <span className="flex items-center font-medium bg-white px-2 py-0.5 rounded-lg border border-[#D8E6FF]/80">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-[#0866FF]" />
                      Sharad Arena
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Heading */}
              <div className="pt-0.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#102A56] tracking-tight">
                  Ask your question
                </h1>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Have a doubt? Ask it here! Your question could be answered live.
                </p>
              </div>

              {/* Question Input Card */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="bg-white rounded-2xl border border-[#D8E6FF] p-3.5 shadow-sm relative focus-within:border-[#0866FF] focus-within:ring-2 focus-within:ring-[#0866FF]/20 transition-all">
                  <textarea
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    maxLength={500}
                    rows={4}
                    placeholder="Type your question here..."
                    className="w-full text-sm text-[#102A56] placeholder:text-slate-400 bg-transparent resize-none focus:outline-none leading-relaxed"
                    required
                  />
                  <div className="flex justify-end pt-1">
                    <span className={`text-[10px] font-mono ${questionText.length > 450 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                      {questionText.length}/500
                    </span>
                  </div>
                </div>

                {/* Example Question Chips */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700 block">
                    Example questions
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {exampleChips.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectExample(chip)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium text-[#0866FF] bg-[#EEF4FF] hover:bg-[#D8E6FF] border border-[#D8E6FF] active:scale-95 transition-all text-left"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error feedback */}
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>{errorMsg}</p>
                  </div>
                )}

                {/* Prominent Submit Button */}
                <button
                  type="submit"
                  disabled={loading || questionText.trim().length < 5}
                  className="w-full py-3.5 px-4 rounded-2xl font-bold text-white bg-[#0866FF] hover:bg-[#0055D6] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#0866FF]/20 flex items-center justify-center space-x-2 transition-all text-sm sm:text-base cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Question</span>
                    </>
                  )}
                </button>
              </form>

              {/* Trust and Privacy Note */}
              <div className="pt-1 text-center">
                <div className="inline-flex items-center text-[11px] text-slate-500 space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span>Your question helps us group the topics everyone wants answered.</span>
                </div>
              </div>
            </div>
          ) : (
            /* ==================================================== */
            /* SCREEN 2: SUCCESS / CONFIRMATION SCREEN              */
            /* ==================================================== */
            <div className="py-4 flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              {/* Radiant Blue Checkmark Circle */}
              <div className="relative flex items-center justify-center my-3">
                {/* Radiating Accent Dashes */}
                <svg className="w-24 h-24 absolute text-[#0866FF]" viewBox="0 0 100 100" fill="none">
                  <line x1="50" y1="5" x2="50" y2="15" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  <line x1="50" y1="85" x2="50" y2="95" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  <line x1="5" y1="50" x2="15" y2="50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  <line x1="85" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  <line x1="18" y1="18" x2="25" y2="25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  <line x1="75" y1="75" x2="82" y2="82" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  <line x1="18" y1="82" x2="25" y2="75" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  <line x1="75" y1="25" x2="82" y2="18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>

                {/* Blue Checkmark Button */}
                <div className="w-14 h-14 rounded-full bg-[#0866FF] text-white flex items-center justify-center shadow-lg shadow-[#0866FF]/30 z-10">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
              </div>

              {/* Heading and Subtext */}
              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold text-[#102A56] tracking-tight">
                  Question submitted!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  Thanks for being part of Tech Uncut
                </p>
              </div>

              {/* Suggested Topics Card */}
              <div className="w-full bg-[#EEF4FF] border border-[#D8E6FF] rounded-2xl p-4 text-left shadow-xs">
                <span className="text-xs font-semibold text-[#102A56] block mb-2">
                  You can ask about
                </span>
                <div className="flex flex-wrap gap-2">
                  {topicPills.map((pill, idx) => (
                    <span
                      key={idx}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white text-[#0866FF] border border-[#D8E6FF] shadow-2xs"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Ask Another Question Button */}
              <div className="w-full pt-1">
                <button
                  onClick={handleAskAnother}
                  className="w-full py-3.5 px-4 rounded-2xl font-bold text-white bg-[#0866FF] hover:bg-[#0055D6] active:scale-[0.99] shadow-md shadow-[#0866FF]/20 flex items-center justify-center space-x-2 transition-all text-sm sm:text-base cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ask another question</span>
                </button>
              </div>

              {/* Anonymous notice */}
              <div className="flex items-center justify-center text-[11px] text-slate-500 space-x-1.5 pt-0.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Questions are collected anonymously</span>
              </div>
            </div>
          )}
        </main>

        {/* Mobile Footer */}
        <footer className="w-full pt-4 pb-1 text-center border-t border-[#D8E6FF]/80 relative z-10">
          <p className="text-[11px] text-slate-500 font-medium">
            TECH UNCUT &bull; FATEH &times; IEEE Student Branch, VIT Pune
          </p>
        </footer>
      </div>

      {/* Full Speaker Portrait Lightbox Modal */}
      {showPosterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowPosterModal(false)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-slate-900/60 text-white hover:bg-slate-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="p-4 bg-gradient-to-b from-[#0866FF]/10 to-transparent flex flex-col items-center">
              <div className="w-full max-h-[360px] rounded-2xl overflow-hidden shadow-md border-2 border-white bg-[#0866FF]">
                <img
                  src={loveBabbarFullImg}
                  alt="Love Babbar, TECH UNCUT speaker"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-center mt-3">
                <h3 className="font-extrabold text-[#102A56] text-lg">Love Babbar</h3>
                <p className="text-xs font-semibold text-[#0866FF]">Speaker &bull; DSA &amp; Web Development</p>
                <p className="text-[11px] text-slate-500 mt-1">TECH UNCUT &bull; 21 Oct &bull; Sharad Arena</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmitPage;
