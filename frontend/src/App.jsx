import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Square, FileText, Loader2, Mail, 
  DollarSign, UserCheck, Target, Calendar, 
  Activity, ShieldAlert, ListTodo, ChevronRight,
  History, Trash2, Smile, Building2, Download, Check, Upload
} from 'lucide-react';
import useSpeechRecognition from './hooks/useSpeechRecognition';
import CRMCard from './CRMCard';

function App() {
  const { transcript, setTranscript, isRecording, isTranscribing, recorderError, startRecording, stopRecording } = useSpeechRecognition();
  
  const [showManualInput, setShowManualInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [crmData, setCrmData] = useState(null);
  const fileInputRef = useRef(null);

  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dealpulse-call-history') || '[]');
    } catch {
      return [];
    }
  });

  const HISTORY_KEY = 'dealpulse-call-history';
  const MAX_HISTORY = 25;

  const saveToHistory = (transcriptText, data) => {
    if (!data) return;
    
    let preview = transcriptText;
    if (transcriptText.length > 140) {
      preview = transcriptText.slice(0, 70) + ' ... ' + transcriptText.slice(-70);
    }
    
    const entry = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      transcriptPreview: preview,
      fullTranscript: transcriptText,
      data,
    };
    const updated = [entry, ...history].slice(0, MAX_HISTORY);
    setHistory(updated);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Could not persist history:', e);
    }
  };

  const loadFromHistory = (entry) => {
    setCrmData(entry.data);
    // Use fullTranscript if available, otherwise fallback to preview (for backward compatibility with old history items)
    setTranscript(entry.fullTranscript || entry.transcriptPreview.replace(' ... ', ''));
    setShowManualInput(true);
    setError(null);
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) {
      console.error('Could not clear history:', e);
    }
  };

  const interestBadge = (level) => {
    if (level === 'High') return 'text-emerald-700 bg-emerald-100 border-emerald-200';
    if (level === 'Medium') return 'text-amber-700 bg-amber-100 border-amber-200';
    return 'text-rose-700 bg-rose-100 border-rose-200';
  };

  // Initial dummy data for layout testing, will be overwritten by backend response
  const dummyData = {
    budget: "$10,000",
    authority: "Manager (John)",
    need: "Software solution",
    timeline: "Next Tuesday",
    interest_level: "High",
    objections: ["Price is too high", "Implementation time"],
    next_steps: ["Send revised contract for $8,000", "Schedule follow-up call"],
    current_solution: "Legacy spreadsheet + in-house tooling",
    competitors_mentioned: ["Acme Corp", "Globex"],
    decision_maker_status: "Evaluator — needs manager approval",
    sentiment: "Hesitant",
  };

  const handleStopRecording = async () => {
    const finalTranscript = await stopRecording();
    if (finalTranscript && finalTranscript.trim()) {
      analyzeTranscript(finalTranscript);
    }
  };

  const handleManualSubmit = () => {
    if (transcript.trim()) {
      analyzeTranscript(transcript);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('http://localhost:8000/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.transcription;
      setTranscript(text);
      
      if (text && text.trim()) {
        await analyzeTranscript(text);
      } else {
        setError("Could not transcribe any speech from the uploaded audio file.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload and transcribe audio file. Make sure the backend is running.");
    } finally {
      setIsUploading(false);
      // reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const analyzeTranscript = async (textToAnalyze) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript: textToAnalyze }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setCrmData(data);
      saveToHistory(textToAnalyze, data);
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Failed to connect to backend. Make sure the FastAPI server is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const [emailCopied, setEmailCopied] = useState(false);

  const handleDraftEmail = () => {
    if (!crmData) return;
    
    const template = `Subject: Following up on our conversation

Hi there,

Thanks for taking the time to speak today. 

Regarding your concerns:
${crmData.objections.map(obj => `- ${obj}`).join('\n')}

As discussed, our next steps are:
${crmData.next_steps.map(step => `- ${step}`).join('\n')}

${crmData.sentiment ? `Overall sentiment: ${crmData.sentiment}\n` : ''}${crmData.current_solution ? `Moving away from: ${crmData.current_solution}\n` : ''}${crmData.competitors_mentioned?.length ? `Competitors mentioned: ${crmData.competitors_mentioned.join(', ')}\n` : ''}
Let me know if you need any additional information!

Best,
DealPulse Sales Team`;

    navigator.clipboard.writeText(template).then(() => {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy to clipboard');
    });
  };

  const displayData = crmData || dummyData;

  const handleDownloadExcel = () => {
    const dataToExport = displayData;
    if (!dataToExport) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Category,Value\n";
    
    const escapeCsv = (str) => {
        if (str === null || str === undefined) return '""';
        const s = String(str);
        return `"${s.replace(/"/g, '""')}"`;
    };

    const rows = [
      ["Budget", dataToExport.budget],
      ["Authority", dataToExport.authority],
      ["Need", dataToExport.need],
      ["Timeline", dataToExport.timeline],
      ["Interest Level", dataToExport.interest_level],
      ["Decision Maker Status", dataToExport.decision_maker_status],
      ["Current Solution", dataToExport.current_solution],
      ["Sentiment", dataToExport.sentiment],
      ["Objections", (dataToExport.objections || []).join("; ")],
      ["Next Steps", (dataToExport.next_steps || []).join("; ")],
      ["Competitors Mentioned", (dataToExport.competitors_mentioned || []).join("; ")]
    ];

    rows.forEach(rowArray => {
        let row = rowArray.map(escapeCsv).join(",");
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "dealpulse_insights.csv");
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        
        {/* Header */}
        <header className="flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-2">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            DealPulse
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Real-time Sales Call Intelligence. Speak naturally or paste a transcript.
          </p>
        </header>

        {recorderError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 text-red-700 border border-red-200 px-6 py-4 rounded-xl flex items-center gap-3 max-w-3xl mx-auto shadow-sm"
          >
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{recorderError}</p>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 text-red-700 border border-red-200 px-6 py-4 rounded-xl flex items-center gap-3 max-w-3xl mx-auto shadow-sm"
          >
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* Sidebar: Call History */}
          <div className="xl:col-span-3 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <History className="w-4 h-4" />
                History
              </h2>
              {history.length > 0 && (
                <button 
                  onClick={clearHistory} 
                  title="Clear history"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center text-sm text-gray-500 shadow-sm">
                No calls analyzed yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {history.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => loadFromHistory(entry)}
                    className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all shadow-sm group"
                  >
                    <p className="text-sm text-gray-700 leading-snug line-clamp-2 mb-2 group-hover:text-gray-900 transition-colors">
                      {entry.transcriptPreview}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{entry.timestamp}</span>
                      {entry.data?.interest_level && (
                        <span className={`px-2 py-0.5 rounded-full border ${interestBadge(entry.data.interest_level)}`}>
                          {entry.data.interest_level}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Main Area: Input + Results */}
          <div className="xl:col-span-9 flex flex-col gap-8">
            
            {/* Input Panel */}
            <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm flex flex-col gap-5">
              <div className="flex flex-wrap sm:flex-nowrap gap-3">
                {isRecording ? (
                  <button 
                    onClick={handleStopRecording}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors"
                  >
                    <Square className="w-5 h-5 fill-current" />
                    Stop Recording
                  </button>
                ) : (
                  <button 
                    onClick={startRecording}
                    disabled={isTranscribing || isLoading || isUploading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors shadow-sm"
                  >
                    {isTranscribing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Transcribing...
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5" />
                        Record Call
                      </>
                    )}
                  </button>
                )}
                
                <input 
                  type="file" 
                  accept="audio/*" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload}
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRecording || isTranscribing || isLoading || isUploading}
                  className="flex-1 sm:flex-none bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors shadow-sm whitespace-nowrap"
                  title="Upload Audio File"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Upload Audio
                    </>
                  )}
                </button>

                <button 
                  onClick={() => setShowManualInput(!showManualInput)}
                  disabled={isRecording || isTranscribing || isUploading}
                  className={`p-3.5 rounded-xl border transition-colors flex items-center justify-center ${showManualInput ? 'bg-gray-100 border-gray-300 text-gray-900' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  title="Toggle Text Input"
                >
                  <FileText className="w-5 h-5" />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {showManualInput ? (
                  <motion.div 
                    key="manual"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col gap-4"
                  >
                    <textarea 
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      placeholder="Paste call transcript here..."
                      className="w-full h-48 bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                    />
                    <div className="flex justify-end gap-3">
                      {transcript.trim() && (
                        <button 
                          onClick={() => setTranscript('')}
                          className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 px-6 shadow-sm"
                          title="Clear transcript text"
                        >
                          <Trash2 className="w-4 h-4" />
                          Clear
                        </button>
                      )}
                      <button 
                        onClick={handleManualSubmit}
                        disabled={isLoading || !transcript.trim()}
                        className="bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 px-6 shadow-sm"
                      >
                        Analyze Transcript
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="live"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-48 bg-gray-50 border border-gray-200 rounded-xl p-6 relative group flex flex-col"
                  >
                    {transcript && !isTranscribing && !isUploading && (
                      <button 
                        onClick={() => setTranscript('')}
                        className="absolute top-4 right-4 p-2 bg-white border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-lg shadow-sm transition-all opacity-0 group-hover:opacity-100 z-10"
                        title="Clear text"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    
                    {transcript ? (
                      <>
                        <textarea
                          value={transcript}
                          onChange={(e) => setTranscript(e.target.value)}
                          className="flex-1 w-full bg-transparent text-gray-800 leading-relaxed resize-none focus:outline-none pr-8 custom-scrollbar"
                          placeholder="Speak or paste text here..."
                        />
                        {!isRecording && (
                          <div className="flex justify-end mt-2">
                            <button 
                              onClick={handleManualSubmit}
                              disabled={isLoading || !transcript.trim()}
                              className="bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm text-sm"
                            >
                              Analyze Updates
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </>
                    ) : isTranscribing || isUploading ? (
                      <div className="h-full flex flex-col items-center justify-center text-indigo-500 space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-sm font-medium">{isUploading ? "Transcribing uploaded file..." : "Transcribing audio..."}</span>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                        <Mic className="w-8 h-8 opacity-50" />
                        <span className="text-sm text-center">Click "Record Call", "Upload Audio", or switch to text input</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CRM Insights */}
            <div className="flex flex-col gap-6">
              {isLoading || isUploading ? (
                <div className="min-h-[300px] flex flex-col items-center justify-center text-indigo-600 space-y-4 bg-white rounded-3xl border border-gray-200 shadow-sm p-12">
                  <Loader2 className="w-12 h-12 animate-spin" />
                  <p className="text-lg font-medium text-gray-900">
                    {isUploading ? "Transcribing Audio" : "Extracting Insights"}
                  </p>
                  <p className="text-gray-500">
                    {isUploading ? "Processing the uploaded file..." : "Analyzing the conversation..."}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        Deal Intelligence
                        {!crmData && <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">Preview</span>}
                      </h2>
                    </div>
                    {crmData && (
                      <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        Live Data Extracted
                      </span>
                    )}
                  </div>
                  
                  <motion.div 
                    variants={containerVariants} 
                    initial="hidden" 
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                  >
                    <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                       <CRMCard title="Budget" value={displayData.budget} icon={DollarSign} />
                       <CRMCard title="Authority" value={displayData.authority} icon={UserCheck} />
                    </div>
                    <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                       <CRMCard title="Need" value={displayData.need} icon={Target} />
                       <CRMCard title="Timeline" value={displayData.timeline} icon={Calendar} />
                    </div>
                    
                    <div className="md:col-span-1 lg:col-span-2">
                      <CRMCard title="Interest Level" value={displayData.interest_level} type="interest" icon={Activity} />
                    </div>

                    <div className="md:col-span-1 lg:col-span-2">
                      <CRMCard title="Sentiment" value={displayData.sentiment} type="sentiment" icon={Smile} />
                    </div>

                    <div className="md:col-span-1 lg:col-span-2">
                      <CRMCard title="Current Solution" value={displayData.current_solution} icon={FileText} />
                    </div>
                    
                    <div className="md:col-span-1 lg:col-span-2">
                      <CRMCard title="Decision Maker Status" value={displayData.decision_maker_status} icon={UserCheck} />
                    </div>
                    
                    <div className="md:col-span-1 lg:col-span-2">
                      <CRMCard title="Objections" value={displayData.objections} type="tags" icon={ShieldAlert} />
                    </div>

                    <div className="md:col-span-1 lg:col-span-2">
                      <CRMCard title="Next Steps" value={displayData.next_steps} type="list" icon={ListTodo} />
                    </div>
                  </motion.div>

                  {/* Competitors Mentioned */}
                  {displayData.competitors_mentioned?.length > 0 && (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600">Competitors Mentioned</h3>
                        <span className="ml-auto px-2.5 py-0.5 bg-gray-100 rounded-full text-xs font-semibold text-gray-600 border border-gray-200">
                          {displayData.competitors_mentioned.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {displayData.competitors_mentioned.map((competitor, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-orange-200 rounded-lg text-sm font-medium text-orange-700 shadow-sm">
                            <Building2 className="w-3.5 h-3.5 text-orange-500" />
                            {competitor}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-end">
                    <button 
                      onClick={handleDownloadExcel}
                      className="w-full sm:w-auto bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 py-3 px-6 rounded-xl flex items-center justify-center gap-2 font-semibold shadow-sm transition-colors"
                    >
                      <Download className="w-4 h-4 text-indigo-600" />
                      Download Excel
                    </button>
                    <button 
                      onClick={handleDraftEmail}
                      disabled={!crmData}
                      className={`w-full sm:w-auto border disabled:opacity-50 text-white py-3 px-6 rounded-xl flex items-center justify-center gap-2 font-semibold shadow-sm transition-colors ${
                        emailCopied 
                          ? 'bg-emerald-600 border-emerald-600 hover:bg-emerald-700' 
                          : 'bg-indigo-600 border-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {emailCopied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied to Clipboard!
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          Draft Follow-Up Email
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
