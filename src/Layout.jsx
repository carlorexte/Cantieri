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
          flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
          ${isActive 
            ? "bg-white text-[#6c5ce7] shadow-sm" 
            : "text-white/80 hover:text-white hover:bg-white/10"
          }
        `}
      >
        <item.icon className="w-5 h-5" />
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
      <div className="min-h-screen flex w-full bg-[#f5f6fa]">
        <Sidebar className="border-none bg-[#6c5ce7] shadow-lg">
          <SidebarHeader className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <span className="font-bold text-lg text-white">
                  CantierePRO
                </span>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3 flex-1 overflow-y-auto">
            <div className="space-y-1 mb-6">
              {visiblePrimaryNav.map(item => (
                <NavItem key={item.href} item={item} pathname={location.pathname} />
              ))}
            </div>
            
            {visibleSettingsNav.length > 0 && (
              <div className="space-y-1 pt-4 border-t border-white/10">
                {visibleSettingsNav.map(item => (
                  <NavItem key={item.href} item={item} pathname={location.pathname} />
                ))}
              </div>
            )}
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-white/10">
            <div className="flex items-center gap-3 p-2">
              <Avatar className="w-9 h-9 border-2 border-white/20">
                <AvatarFallback className="bg-white/20 text-white font-semibold text-xs">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm truncate">
                  {currentUser?.full_name || "Utente"}
                </p>
                <p className="text-xs text-white/60 truncate capitalize">
                  {currentUser?.role?.replace('_', ' ') || "user"}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleLogout} 
                className="text-white/80 hover:text-white hover:bg-white/10 flex-shrink-0 h-8 w-8"
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