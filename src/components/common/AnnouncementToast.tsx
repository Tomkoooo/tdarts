import React, { useEffect, useState } from 'react';
import { IconX, IconInfoCircle, IconCircleDashedCheck, IconAlertTriangle, IconAlertOctagon } from '@tabler/icons-react';
import { Button } from "@/components/ui/Button";

interface Announcement {
  _id: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
  showButton: boolean;
  buttonText?: string;
  buttonAction?: string;
  duration: number;
  expiresAt: string;
}

interface AnnouncementToastProps {
  announcement: Announcement;
  onClose: (id: string) => void;
}

const AnnouncementToast: React.FC<AnnouncementToastProps> = ({ announcement, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState(announcement.duration);

  // Icon és szín beállítása típus alapján
  const getToastStyles = () => {
    switch (announcement.type) {
      case 'success':
        return {
          icon: IconCircleDashedCheck,
          bgColor: 'bg-success/40',
          borderColor: 'border-success/30',
          textColor: 'text-success',
          iconColor: 'text-success'
        };
      case 'warning':
        return {
          icon: IconAlertTriangle,
          bgColor: 'bg-warning/40',
          borderColor: 'border-warning/30',
          textColor: 'text-warning',
          iconColor: 'text-warning'
        };
      case 'error':
        return {
          icon: IconAlertOctagon,
          bgColor: 'bg-error/40',
          borderColor: 'border-error/30',
          textColor: 'text-error',
          iconColor: 'text-error'
        };
      default:
        return {
          icon: IconInfoCircle,
          bgColor: 'bg-info/40',
          borderColor: 'border-info/30',
          textColor: 'text-info',
          iconColor: 'text-info'
        };
    }
  };

  const styles = getToastStyles();
  const Icon = styles.icon;

  // Automatikus bezárás
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Hozzáadom a kilépő animációt
      const toastElement = document.querySelector(`[data-toast-id="${announcement._id}"]`);
      if (toastElement) {
        toastElement.classList.remove('animate-slideInFromLeft');
        toastElement.classList.add('animate-slideOutToLeft');
      }
      // Animáció után töröljük a toast-ot
      setTimeout(() => {
        onClose(announcement._id);
      }, 500);
    }, announcement.duration);

    const countdownTimer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - 100);
        return newTime;
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      clearInterval(countdownTimer);
    };
  }, [announcement.duration, announcement._id, onClose]);

  // Progress bar százalék
  const progressPercentage = ((announcement.duration - timeLeft) / announcement.duration) * 100;

  const handleButtonClick = () => {
    if (announcement.buttonAction) {
      // Itt kezelhetjük a különböző akciókat
      if (announcement.buttonAction.startsWith('http')) {
        window.open(announcement.buttonAction, '_blank');
      } else if (announcement.buttonAction.startsWith('/')) {
        window.location.href = announcement.buttonAction;
      }
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    // Hozzáadom a kilépő animációt
    const toastElement = document.querySelector(`[data-toast-id="${announcement._id}"]`);
    if (toastElement) {
      toastElement.classList.remove('animate-slideInFromLeft');
      toastElement.classList.add('animate-slideOutToLeft');
    }
    setTimeout(() => onClose(announcement._id), 500);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="max-w-md w-full">
      <div 
        data-toast-id={announcement._id}
        className={`${styles.bgColor} ${styles.borderColor} border rounded-lg shadow-lg backdrop-blur-lg transition-all duration-500 transform ${
          isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        } animate-slideInFromLeft`}
      >
        {/* Progress bar */}
        <div className="w-full h-1 bg-base-300/20 rounded-t-lg overflow-hidden">
          <div 
            className={`h-full transition-all duration-100 ${styles.bgColor.replace('/20', '')}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Icon className={`w-5 h-5 ${styles.iconColor}`} />
              <h3 className={`font-semibold ${styles.textColor}`}>
                {announcement.title}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-white/60 hover:text-white hover:bg-white/10 h-6 w-6"
            >
              <IconX className="size-4" />
            </Button>
          </div>

          {/* Content */}
          <p className="text-base-content/80 text-sm mb-4 leading-relaxed">
            {announcement.description}
          </p>

          {/* Button */}
          {announcement.showButton && announcement.buttonText && (
            <div className="flex justify-end">
              <Button
                onClick={handleButtonClick}
                size="sm"
                variant={announcement.type === 'error' ? 'destructive' : announcement.type as any}
                className="font-medium"
              >
                {announcement.buttonText}
              </Button>
            </div>
          )}

          {/* Time left indicator */}
          <div className="mt-3 text-xs text-base-content/50">
            {Math.ceil(timeLeft / 1000)} másodperc múlva automatikusan bezáródik
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementToast;
