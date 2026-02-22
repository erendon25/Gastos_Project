import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface SpeechButtonProps {
  onResult: (text: string) => void;
}

const SpeechButton: React.FC<SpeechButtonProps> = ({ onResult }) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.lang = 'es-ES';
      recog.continuous = false;
      recog.interimResults = false;

      recog.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
        setIsListening(false);
      };

      recog.onerror = () => {
        setIsListening(false);
      };

      recog.onend = () => {
        setIsListening(false);
      };

      setRecognition(recog);
    }
  }, [onResult]);

  const toggleListening = () => {
    if (isListening) {
      recognition?.stop();
    } else {
      setIsListening(true);
      recognition?.start();
    }
  };

  return (
    <button
      onClick={toggleListening}
      style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: isListening ? '#f87171' : 'var(--card-bg-light)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: isListening ? '0 0 15px rgba(248, 113, 113, 0.5)' : 'none'
      }}
    >
      {isListening ? (
        <MicOff size={20} color="#ffffff" />
      ) : (
        <Mic size={20} color="var(--text-secondary)" />
      )}
    </button>
  );
};

export default SpeechButton;
