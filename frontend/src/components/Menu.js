import { NavLink, useNavigate  } from "react-router-dom";
const ProfileIcon = () => { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="4" fill="#64748b"/><path d="M2 18Q2 13 10 13Q18 13 18 18" fill="#64748b"/></svg>; }
const SiteIcon = () => { return <svg viewBox="0 0 30 30" width="30" height="30" fill="none"><rect width="30" height="30" rx="8" fill="#2a3040"/><line x1="8" y1="9" x2="14" y2="12" stroke="#3b82f6" strokeWidth="0.7" strokeOpacity="0.35"/><line x1="14" y1="12" x2="22" y2="8" stroke="#3b82f6" strokeWidth="0.7" strokeOpacity="0.35"/><line x1="10" y1="17" x2="18" y2="16" stroke="#3b82f6" strokeWidth="0.7" strokeOpacity="0.35"/><line x1="18" y1="16" x2="23" y2="21" stroke="#3b82f6" strokeWidth="0.7" strokeOpacity="0.35"/><line x1="8" y1="9" x2="10" y2="17" stroke="#3b82f6" strokeWidth="0.7" strokeOpacity="0.25"/><line x1="14" y1="12" x2="18" y2="16" stroke="#3b82f6" strokeWidth="0.7" strokeOpacity="0.25"/><line x1="7" y1="23" x2="10" y2="17" stroke="#3b82f6" strokeWidth="0.7" strokeOpacity="0.25"/><circle cx="8" cy="9" r="2.2" fill="#3b82f6"/><circle cx="14" cy="12" r="2" fill="#3b82f6" fillOpacity="0.8"/><circle cx="22" cy="8" r="1.7" fill="#3b82f6" fillOpacity="0.6"/><circle cx="10" cy="17" r="2" fill="#3b82f6" fillOpacity="0.85"/><circle cx="18" cy="16" r="1.7" fill="#3b82f6" fillOpacity="0.65"/><circle cx="23" cy="21" r="1.5" fill="#3b82f6" fillOpacity="0.45"/><circle cx="7" cy="23" r="1.5" fill="#3b82f6" fillOpacity="0.4"/></svg>; }
const CamIcon = () => { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1 4a2 2 0 012-2h7a2 2 0 012 2v1.5l2.5-1.5v8L12 10.5V12a2 2 0 01-2 2H3a2 2 0 01-2-2V4z"/></svg>; }
const ReportIcon = () => { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="1" width="10" height="14" rx="1.5"/><path d="M6 5h4M6 8h4M6 11h2"/></svg>; }
const WidgetIcon = () => { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="8" rx="1"/><rect x="9" y="1" width="6" height="4" rx="1"/><rect x="9" y="7" width="6" height="8" rx="1"/><rect x="1" y="11" width="6" height="4" rx="1"/></svg>; }
const UserIcon = () => { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5H2z"/></svg>; }
const LogoutIcon = () => { return (<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3"/><path d="M11 11l3-3-3-3"/><path d="M14 8H6"/></svg>);}
export const Menu = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };
  const navItems = [
    { to: "/widgets", label: "Виджеты", icon: <WidgetIcon /> },
    { to: "/cameras", label: "Камеры", icon: <CamIcon /> },
    // { to: "/reports", label: "Отчеты", icon: <ReportIcon /> },
    // { to: "/users", label: "Пользователи", icon: <UserIcon /> },
  ];
  const username = localStorage.getItem("username") || "User";
  return (
    <div className='slide-bar'>
      <div className='site-title'>
        <div className='site-icon'><SiteIcon/></div>
        <div className='text-title'>SpaceCount</div>
      </div>
      <nav className='side-menu'>
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className='nav-item-span'>
              <span className='nav-item-icon'>{item.icon}</span>
              {item.label}
            </span>
          </NavLink>
        ))}
        <button className="nav-item" onClick={handleLogout}>
          <span className='nav-item-span'>
            <span className='nav-item-icon'><LogoutIcon /></span>Выход
          </span>
        </button>
      </nav>
      <div className='user-div'>
        <div className='site-icon'><ProfileIcon/></div>
        <div className='column-text'>
          <div className='role-text'>{username}</div>
          <div className='second-text'>Пользователь</div>
        </div>
      </div>
    </div>
  );
}