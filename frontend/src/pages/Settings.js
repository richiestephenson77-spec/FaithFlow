import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, User, Bell, Lock,
  Clock, BookOpen, MessageCircle, Star,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';

const staggerContainer = { animate: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function IconSquare({ Icon, bg }) {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0 rounded-[10px]"
      style={{ width: 34, height: 34, background: bg }}
    >
      <Icon size={16} color="#FFFFFF" strokeWidth={1.8} />
    </div>
  );
}

function SettingsRow({ Icon, iconBg, label, sublabel, onClick, soon }) {
  const [tapped, setTapped] = useState(false);

  function handleClick() {
    if (soon) {
      setTapped(true);
      setTimeout(() => setTapped(false), 1500);
      return;
    }
    onClick?.();
  }

  return (
    <motion.button
      whileTap={{ backgroundColor: '#F9FAFB' }}
      transition={{ duration: 0.1 }}
      onClick={handleClick}
      className="w-full flex items-center gap-3 px-4 text-left"
      style={{ height: 64 }}
    >
      <IconSquare Icon={Icon} bg={iconBg} />
      <div className="flex-1 min-w-0 ml-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {soon && (
            <span className="text-[10px] font-semibold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
              Soon
            </span>
          )}
          <AnimatePresence>
            {tapped && (
              <motion.span
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] text-gray-400"
              >
                Coming soon 🙏
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {sublabel && <p className="text-xs text-gray-400 mt-0.5 truncate">{sublabel}</p>}
      </div>
      <ChevronRight size={16} color="#d1d5db" strokeWidth={2} />
    </motion.button>
  );
}

function SectionDivider() {
  return <div className="h-px bg-gray-100 ml-[62px] mr-0" />;
}

function Section({ label, children }) {
  return (
    <motion.div variants={fadeUp}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-5 mb-2">
        {label}
      </p>
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm mx-4">
        {children}
      </div>
    </motion.div>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Header */}
      <div className="bg-gray-50 px-4 pt-4 pb-3 flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          <ChevronLeft size={22} color="#4B5563" strokeWidth={2} />
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
      </div>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.05, ease: 'easeOut' }}
        onClick={() => navigate('/profile')}
        className="mx-4 mb-6 bg-white rounded-[20px] px-5 py-4 flex items-center gap-4 cursor-pointer active:scale-[0.99] transition-transform"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <div className="flex-shrink-0" style={{ border: '2px solid #F3F4F6', borderRadius: '50%' }}>
          <Avatar user={user} size="lg" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-gray-900 truncate">{user?.name || 'Your Name'}</p>
          <p className="text-sm text-gray-400 truncate">{user?.email || ''}</p>
          <p className="text-xs text-terracotta-500 font-medium mt-0.5">View Profile →</p>
        </div>
        <ChevronRight size={18} color="#d1d5db" strokeWidth={2} />
      </motion.div>

      {/* Sections */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-6"
      >
        <Section label="Account">
          <SettingsRow
            Icon={User} iconBg="#3B82F6"
            label="Account Settings" sublabel="Email, password, personal info"
            onClick={() => navigate('account')}
          />
          <SectionDivider />
          <SettingsRow
            Icon={Bell} iconBg="#EF4444"
            label="Notifications" sublabel="Prayer alerts, followers, comments"
            onClick={() => navigate('notifications')}
          />
          <SectionDivider />
          <SettingsRow
            Icon={Lock} iconBg="#374151"
            label="Privacy" sublabel="Who can see your profile"
            onClick={() => {}} soon
          />
        </Section>

        <Section label="App">
          <SettingsRow
            Icon={Clock} iconBg="#2C4055"
            label="Prayer Reminders" sublabel="Set daily prayer time reminders"
            onClick={() => navigate('reminders')}
          />
          <SectionDivider />
          <SettingsRow
            Icon={BookOpen} iconBg="#16A34A"
            label="Bible Version" sublabel="KJV, NIV, ESV and more"
            onClick={() => {}} soon
          />
        </Section>

        <Section label="Support">
          <SettingsRow
            Icon={MessageCircle} iconBg="#8B5CF6"
            label="Contact Us" sublabel="Get help or send feedback"
            onClick={() => navigate('contact')}
          />
          <SectionDivider />
          <SettingsRow
            Icon={Star} iconBg="#EC4899"
            label="Rate FaithBridge" sublabel="Support us with a review"
            onClick={() => {}} soon
          />
        </Section>

        {/* Account Actions */}
        <motion.div variants={fadeUp}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-5 mb-2">
            Account Actions
          </p>
          <div className="bg-red-50 rounded-2xl overflow-hidden mx-4">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full h-14 flex items-center justify-center text-sm font-medium text-red-500 active:bg-red-100 transition-colors"
            >
              Log Out
            </button>
          </div>
        </motion.div>

        <div className="pt-2 pb-6 space-y-1">
          <p className="text-xs text-gray-300 text-center">FaithBridge v1.0.0</p>
          <p className="text-xs text-gray-300 text-center">Made with 🙏 for believers worldwide</p>
        </div>
      </motion.div>

      {/* Logout confirm */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowLogoutConfirm(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-white rounded-t-3xl pb-10"
            >
              <div className="px-4 pt-5 pb-4 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1">Log Out?</h3>
                <p className="text-sm text-gray-400 mb-6">Are you sure you want to log out of FaithBridge?</p>
                <div className="space-y-2 px-2">
                  <button
                    onClick={handleLogout}
                    className="w-full h-12 rounded-2xl bg-red-500 text-white font-semibold text-sm"
                  >
                    Log Out
                  </button>
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="w-full h-12 rounded-2xl text-gray-500 font-semibold text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
