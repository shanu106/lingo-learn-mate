import { useCallback, useEffect, useRef, useState } from "react";

// Cross-browser SpeechRecognition
const getSpeechRecognitionCtor = () => {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

export const useSpeechRecognition = () => {
  const SpeechRecognition = getSpeechRecognitionCtor();
  const supported = Boolean(SpeechRecognition);

  const recognitionRef = useRef<any | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stop any ongoing recognition on unmount
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch (_) {
        // noop
      }
    };
  }, []);

  const startListening = useCallback(
    (
      lang: string,
      onResult: (transcript: string) => void,
      onStart?: () => void,
      onEnd?: () => void,
      onError?: (err: string) => void
    ) => {
      setError(null);

      if (!supported) {
        const msg = "Speech recognition not supported in this browser";
        setError(msg);
        onError?.(msg);
        return;
      }

      try {
        // Lazily create instance per session
        recognitionRef.current = new SpeechRecognition();
        const recognition = recognitionRef.current;
        recognition.lang = lang || "en-US";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          onStart?.();
        };

        recognition.onresult = (event: any) => {
          try {
            const transcript = event.results?.[0]?.[0]?.transcript ?? "";
            if (transcript) onResult(transcript);
          } catch (e) {
            const msg = "Failed to parse speech result";
            setError(msg);
            onError?.(msg);
          }
        };

        recognition.onerror = (e: any) => {
          const err: string = e?.error || "unknown-error";
          console.error('SpeechRecognition error event:', e);
          setError(err);
          onError?.(err);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          onEnd?.();
        };

        recognition.start();
      } catch (e: any) {
        const msg = e?.message || "Unable to start speech recognition";
        setError(msg);
        onError?.(msg);
      }
    },
    [supported]
  );

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop?.();
    } catch (_) {
      // noop
    }
  }, []);

  return {
    supported,
    isListening,
    startListening,
    stopListening,
    error,
  };
};