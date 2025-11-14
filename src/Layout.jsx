import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Building2, LayoutDashboard, FileText, Users, BarChart3, DollarSign, Calendar, Settings, Handshake, ClipboardList, Database, Briefcase, UserCog, LogOut, ChevronLeft } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  SidebarFooter,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataProvider } from "@/components/shared/DataContext";

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
  { href: "MyProfile", icon: Users, label: "Il Mio Profilo", perm: "all" },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
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

  const hasPermission = (perm) => {
    if (perm === "all" || currentUser?.role === 'admin') return true;
    return currentUser?.[perm];
  };

  const visiblePrimaryNav = primaryNavConfig.filter(item => hasPermission(item.perm));
  const visibleSettingsNav = settingsNavConfig.filter(item => hasPermission(item.perm));

  function NavItem({ item, pathname }) {
    const isActive = pathname === createPageUrl(item.href);
    
    return (
      <Link 
        to={createPageUrl(item.href)} 
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
          ${isActive 
            ? "bg-indigo-50 text-indigo-600" 
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }
        `}
      >
        <item.icon className={`w-5 h-5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
        <span>{item.label}</span>
      </Link>
    )
  }

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
      <SidebarProvider>
        <style>
          {`
            :root {
              --header-height: 0px;
            }
            
            body {
              background: #f8fafc;
            }
          `}
        </style>
        <div className="min-h-screen flex w-full bg-slate-50">
          <Sidebar className="border-r border-slate-200 bg-white">
            <SidebarHeader className="border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <span className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    CantierePRO
                  </span>
                </div>
              </div>
            </SidebarHeader>
            
            <SidebarContent className="p-3 flex-1 overflow-y-auto">
              <div className="space-y-1 mb-6">
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Generale</p>
                </div>
                {visiblePrimaryNav.map(item => (
                  <NavItem key={item.href} item={item} pathname={location.pathname} />
                ))}
              </div>
              
              {visibleSettingsNav.length > 0 && (
                <div className="space-y-1 pt-6 border-t border-slate-100">
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Impostazioni</p>
                  </div>
                  {visibleSettingsNav.map(item => (
                    <NavItem key={item.href} item={item} pathname={location.pathname} />
                  ))}
                </div>
              )}
            </SidebarContent>

            <SidebarFooter className="border-t border-slate-100 p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border-2 border-indigo-100">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
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
              </div>
            </SidebarFooter>
          </Sidebar>

          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </DataProvider>
  );
}