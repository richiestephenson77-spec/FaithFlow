export default function Avatar({ user, size = 'md' }) {
  const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-16 h-16 text-2xl', xl: 'w-24 h-24 text-4xl' };
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  if (user?.profilePhoto) {
    return (
      <img
        src={user.profilePhoto}
        alt={user.name}
        className={`${sizes[size]} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`} style={{ background: '#5C6672' }}>
      {initials}
    </div>
  );
}
