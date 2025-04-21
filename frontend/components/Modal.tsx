'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // モーダル外をクリックしたら閉じる
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // createPortalを使用してモーダルをbody直下にレンダリング
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75"
      onClick={handleBackdropClick}
      style={{ backdropFilter: 'blur(3px)' }}
    >
      <div
        ref={modalRef}
        className="relative mx-4 max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-6 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xl font-bold text-gray-600 hover:bg-gray-300"
          aria-label="Close"
        >
          &times;
        </button>
        
        {title && <h3 className="mb-4 pr-10 text-2xl font-bold">{title}</h3>}
        
        <div className="modal-content">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal; 