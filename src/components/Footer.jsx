import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-white/10 mt-auto py-6 px-4">
      <div className="max-w-7xl mx-auto text-center text-white/60">
        <div className="flex justify-center items-center gap-4 mb-2">
            <Link to="/terms" className="text-sm text-white/60 hover:text-white transition-colors">
                Terms & Conditions
            </Link>
            <span className="text-white/40">|</span>
            <Link to="/super-admin/login" className="text-sm text-white/60 hover:text-white transition-colors">
                Super Admin
            </Link>
        </div>
        <p>&copy; {currentYear} EventHost. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;