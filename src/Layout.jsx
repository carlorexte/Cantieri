import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Building2, LayoutDashboard, FileText, Users, BarChart3, DollarSign, Calendar, Settings, Handshake, ClipboardList, Database, Briefcase, UserCog, LogOut, ChevronLeft, ChevronRight, Menu } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  SidebarFooter,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataProvider } from "@/components/shared/DataContext";
import { cn } from "@/lib/utils";

const primaryNavConfig = [
  { href: "Dashboard", icon: LayoutDashboard, label: "Dashboard", perm: "all" },
  { href: "Cantieri", icon: Building2, label: "Cantieri", perm: "all" },
  { href: "Imprese", icon: Briefcase, label: "Imprese", perm: "perm_view_soci" },
  { href: "PersoneEsterne", icon: Users, label: "Professionisti", perm: "perm_view_soci" },
  { href: "Subappalti", icon: Handshake, label: "Subappalti", perm: "perm_view_subappalti" },
  { href: "Costi", icon: DollarSign, label: "Costi", perm: "perm_view_costi" },
  { href: "SAL", icon: BarChart3, label: "SAL", perm: "perm_view_sal" },
  { href: "AttivitaInterne", icon: ClipboardList, label: "Attività Interne", perm: "perm_view_attivita" },
  { href: "Documenti", icon: FileText, label: "Documenti", perm: "all" },
  { href: "Cronoprogramma", icon: Calendar, label: "Cronoprogramma", perm: "all" },
];

const settingsNavConfig = [
  { href: "ProfiloAzienda", icon: Database, label: "Profilo Azienda", perm: "admin" },
  { href: "UserManagement", icon: UserCog, label: "Gestione Utenti", perm: "admin" },
  { href: "GestionePermessi", icon: Settings, label: "Ruoli e Permessi", perm: "admin" },
  { href: "GestionePermessiCantieri", icon: Building2, label: "Permessi Cantieri", perm: "admin" },
  { href: "MyProfile", icon: Users, label: "Il Mio Profilo", perm: "all" },
];

function LayoutContent({ children, currentUser, handleLogout, getUserInitials }) {
  const location = useLocation();
  const { open, setOpen } = useSidebar();

  const hasPermission = (perm) => {
    if (perm === "all" || currentUser?.role === 'admin') return true;
    return currentUser?.[perm];
  };

  const visiblePrimaryNav = primaryNavConfig.filter(item => hasPermission(item.perm));
  const visibleSettingsNav = settingsNavConfig.filter(item => hasPermission(item.perm));

  function NavItem({ item, pathname, collapsed }) {
    const isActive = pathname === createPageUrl(item.href);

    return (
      <Link 
        to={createPageUrl(item.href)} 
        className={cn(
          "flex items-center gap-3 py-3 text-sm font-medium transition-all duration-200 relative",
          collapsed ? "justify-center px-2 rounded-lg" : "px-6 rounded-r-[20px]",
          isActive 
            ? "text-slate-900 shadow-sm" 
            : "text-slate-600 hover:bg-[rgba(255,140,66,0.08)] hover:text-slate-900"
        )}
        style={isActive ? {
          background: 'linear-gradient(90deg, rgba(255,140,66,0.15), transparent)',
          borderLeft: '4px solid #FF8C42'
        } : {}}
        title={collapsed ? item.label : ''}
      >
        <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-[#FF8C42]" : "text-slate-400")} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    )
  }

  return (
    <div className="min-h-screen flex w-full bg-slate-50 relative z-10">
      <Sidebar className="border-r border-slate-200 transition-all duration-300" collapsible="icon" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F8F9FA 100%)' }}>
        <SidebarHeader className="border-b border-slate-100 py-8 px-6 flex flex-row items-center justify-between">
          <div className={cn("flex items-center gap-3 transition-opacity duration-200", !open && "opacity-0 w-0")}>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#FF8C42] to-[#FF6B6B] bg-clip-text text-transparent">
              RCS
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(!open)}
            className="ml-auto hover:bg-slate-100 transition-colors"
            style={{ color: '#FF902C' }}
          >
            {open ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </Button>
        </SidebarHeader>
            
        <SidebarContent className="p-3 flex-1 overflow-y-auto">
          <div className="space-y-1 mb-6">
            {open && (
              <div className="px-3 py-2">
                <p className="text-[11px] font-semibold text-[#ADB5BD] uppercase tracking-widest">Generale</p>
              </div>
            )}
            {visiblePrimaryNav.map(item => (
              <NavItem key={item.href} item={item} pathname={location.pathname} collapsed={!open} />
            ))}
          </div>

          {visibleSettingsNav.length > 0 && (
            <div className="space-y-1 pt-6 border-t border-slate-200">
              {open && (
                <div className="px-3 py-2">
                  <p className="text-[11px] font-semibold text-[#ADB5BD] uppercase tracking-widest">Impostazioni</p>
                </div>
              )}
              {visibleSettingsNav.map(item => (
                <NavItem key={item.href} item={item} pathname={location.pathname} collapsed={!open} />
              ))}
            </div>
          )}
        </SidebarContent>

        <SidebarFooter className="border-t border-slate-200 p-4">
          <div className={cn("flex items-center gap-3", !open && "flex-col")}>
            <Avatar className="w-10 h-10 border-2 flex-shrink-0" style={{borderColor: '#FF8C42'}}>
              <AvatarFallback className="text-white font-semibold text-sm" style={{backgroundColor: '#FF8C42'}}>
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            {open && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">
                    {currentUser?.full_name || "Utente"}
                  </p>
                  <p className="text-xs text-slate-500 truncate capitalize">
                    {currentUser?.role?.replace('_', ' ') || "user"}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleLogout} 
                  className="text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            )}
            {!open && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleLogout} 
                className="text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function Layout({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {
        console.error("Not logged in");
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const getUserInitials = () => {
    if (!currentUser?.full_name) return 'U';
    const names = currentUser.full_name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return currentUser.full_name.substring(0, 2).toUpperCase();
  };

  return (
    <DataProvider>
      <SidebarProvider defaultOpen={true}>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

            :root {
              --header-height: 0px;
              --rcs-orange: #FF8C42;
              --rcs-blue: #2C3E50;
              --rcs-teal: #4ECDC4;
              --rcs-coral: #FF6B6B;
              --rcs-success: #2ECC71;
              --rcs-gray: #6C757D;
            }

            * {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }

            body {
              background: #F8F9FA;
            }

            body::before {
              content: '';
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
              pointer-events: none;
              z-index: 0;
            }

            [data-sidebar] {
              transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
            }
          `}
        </style>
        <LayoutContent 
          currentUser={currentUser}
          handleLogout={handleLogout}
          getUserInitials={getUserInitials}
        >
          {children}
        </LayoutContent>
      </SidebarProvider>
    </DataProvider>
  );
}