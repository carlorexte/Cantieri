import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import { Building2, LayoutDashboard, FileText, Users, BarChart3, DollarSign, Calendar, Settings, Handshake, ClipboardList, Database, Briefcase, UserCog, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (e) {
        console.error("Not logged in");
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await User.logout();
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
          flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all
          ${isActive 
            ? "bg-white/20 text-white shadow-lg backdrop-blur-sm" 
            : "text-purple-100/80 hover:bg-white/10 hover:text-white"
          }
        `}
      >
        <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-purple-200/70"}`} />
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-none bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 shadow-2xl">
          <SidebarHeader className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <span className="font-bold text-xl text-white">
                  CantierePRO
                </span>
                <p className="text-xs text-purple-200/70">Management Suite</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-4 flex-1 overflow-y-auto">
            <div className="space-y-2 mb-8">
              <div className="px-4 py-2">
                <p className="text-xs font-semibold text-purple-200/60 uppercase tracking-wider">Menu Principale</p>
              </div>
              {visiblePrimaryNav.map(item => (
                <NavItem key={item.href} item={item} pathname={location.pathname} />
              ))}
            </div>
            
            {visibleSettingsNav.length > 0 && (
              <div className="space-y-2 pt-6 border-t border-white/10">
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold text-purple-200/60 uppercase tracking-wider">Impostazioni</p>
                </div>
                {visibleSettingsNav.map(item => (
                  <NavItem key={item.href} item={item} pathname={location.pathname} />
                ))}
              </div>
            )}
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
              <Avatar className="w-11 h-11 border-2 border-white/30 shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold text-sm">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">
                  {currentUser?.full_name || "Utente"}
                </p>
                <p className="text-xs text-purple-200/70 truncate capitalize">
                  {currentUser?.role?.replace('_', ' ') || "user"}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleLogout} 
                className="text-purple-200 hover:text-white hover:bg-white/10 transition-all flex-shrink-0 rounded-xl"
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
  );
}