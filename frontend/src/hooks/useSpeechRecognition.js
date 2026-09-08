import { useState, useEffect, useRef } from 'react';

const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState('');
  const transcriptRef = useRef('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recorderError, setRecorderError] = useState(null);
  
  const recognitionRef = useRef(null);

  // Sync state to ref so we always have latest value in callbacks
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
            setRecorderError('Microphone access denied. Check browser permissions and try again.');
        } else {
            setRecorderError(`Speech recognition error: ${event.error}`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } else {
      setRecorderError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startRecording = () => {
    if (!recognitionRef.current) {
      setRecorderError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    
    setTranscript('');
    transcriptRef.current = '';
    setRecorderError(null);
    setIsRecording(true);
    
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    return new Promise((resolve) => {
      if (recognitionRef.current && isRecording) {
        // We set up a one-time listener for the stop event
        recognitionRef.current.onend = () => {
            setIsRecording(false);
            // Re-bind the generic onend just in case
            recognitionRef.current.onend = () => setIsRecording(false);
            resolve(transcriptRef.current);
        };
        recognitionRef.current.stop();
      } else {
        resolve(transcriptRef.current);
      }
    });
  };

  return {
    transcript,
    setTranscript,
    isRecording,
    isTranscribing,
    recorderError,
    startRecording,
    stopRecording,
  };
};

export default useSpeechRecognition;
