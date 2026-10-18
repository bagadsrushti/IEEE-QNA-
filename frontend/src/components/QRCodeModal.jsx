import React, { useState, useEffect } from 'react';
import { X, Download, Copy, Check, ExternalLink, AlertCircle, Info, Settings } from 'lucide-react';
import QRCode from 'qrcode';
import { statsAPI } from '../services/api';

const QRCodeModal = ({ isOpen, onClose }) => {
  const [qrUrl, setQrUrl] = useState('');
  const [dataUrl, setDataUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadQR();
    }
  }, [isOpen]);

  const loadQR = async () => {
    setLoading(true);
    try {
      const res = await statsAPI.getQRCode();
      if (res.data.success) {
        setQrUrl(res.data.publicUrl);
        setDataUrl(res.data.qrDataUrl);
        setCustomUrl(res.data.publicUrl);
      }
    } catch (err) {
      console.error('Failed to load QR code:', err);
      // Fallback client generation
      const fallbackUrl = window.location.origin;
      setQrUrl(fallbackUrl);
      setCustomUrl(fallbackUrl);
      generateQRCode(fallbackUrl);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (url) => {
    try {
      const urlData = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 400,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
      setDataUrl(urlData);
      setQrUrl(url);
    } catch (e) {
      console.error('Failed to generate custom QR:', e);
    }
  };

  const handleApplyCustomUrl = (e) => {
    e.preventDefault();
    if (customUrl && customUrl.trim() !== '') {
      generateQRCode(customUrl.trim());
      setIsEditing(false);
    }
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'question_hub_qr_code.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const isLocalhost = qrUrl.includes('localhost') || qrUrl.includes('127.0.0.1');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Public Question Form QR Code</h3>
            <p className="text-xs text-slate-500">Scan from mobile devices to open the submission page</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200/80 rounded-2xl p-6 mb-5">
            {loading ? (
              <div className="w-56 h-56 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <img
                src={dataUrl}
                alt="Submission Form QR Code"
                className="w-56 h-56 object-contain rounded-xl shadow-sm bg-white p-2 border border-slate-200"
              />
            )}
            
            <div className="mt-3 flex items-center text-xs text-slate-500 font-mono bg-white px-3 py-1.5 rounded-lg border border-slate-200 max-w-full overflow-hidden">
              <span className="truncate">{qrUrl}</span>
            </div>
          </div>

          {/* Localhost Warning Alert */}
          {isLocalhost && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">QR points to Localhost</p>
                <p className="mt-0.5 text-amber-700">
                  Mobile phones cannot access <code className="bg-amber-100 px-1 rounded">localhost</code> directly. To test from your phone on the same Wi-Fi, enter your computer's LAN IP below (or set <code className="bg-amber-100 px-1 rounded">PUBLIC_URL=http://&lt;YOUR_IP&gt;:5173</code> in backend <code className="bg-amber-100 px-1 rounded">.env</code>).
                </p>
              </div>
            </div>
          )}

          {/* Change URL Accordion */}
          <div className="mb-4">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-teal-700 hover:text-teal-800 flex items-center font-medium"
              >
                <Settings className="w-3.5 h-3.5 mr-1" />
                Customize Target URL for Phone / Deployed Host
              </button>
            ) : (
              <form onSubmit={handleApplyCustomUrl} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <label className="block font-medium text-slate-700 mb-1">Target Submission URL:</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="e.g. http://192.168.1.15:5173 or https://myapp.vercel.app"
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    required
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-2 py-1.5 text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PNG
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-emerald-600" />
                  Copied URL!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2 text-slate-600" />
                  Copy URL
                </>
              )}
            </button>
          </div>

          {/* Mobile device testing instruction */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center">
              <Info className="w-3.5 h-3.5 mr-1 text-slate-400" /> Tested on Android & iOS cameras
            </span>
            <a
              href={qrUrl}
              target="_blank"
              rel="noreferrer"
              className="text-teal-600 hover:text-teal-700 font-medium inline-flex items-center"
            >
              Open URL Directly <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
