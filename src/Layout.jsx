import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Building2, LayoutDashboard, FileText, Users, BarChart3, DollarSign, Calendar, Settings, Handshake, ClipboardList, Database, Briefcase, UserCog, LogOut, ChevronLeft, ChevronRight, Menu, Sparkles, BookOpen } from "lucide-react";
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
import GlobalErrorBoundary from "@/components/shared/GlobalErrorBoundary";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const primaryNavConfig = [
  { href: "Dashboard", icon: LayoutDashboard, label: "Dashboard", perm: "all" },
  { href: "AIAssistant", icon: Sparkles, label: "AI Assistant", perm: "admin" },
  { href: "Cantieri", icon: Building2, label: "Cantieri", perm: "all" },
  { href: "Imprese", icon: Briefcase, label: "Imprese", perm: "perm_view_soci" },
  { href: "PersoneEsterne", icon: Users, label: "Professionisti", perm: "perm_view_soci" },
  { href: "Subappalti", icon: Handshake, label: "Subappalti", perm: "perm_view_subappalti" },
  { href: "Costi", icon: DollarSign, label: "Costi", perm: "perm_view_costi" },
  { href: "SAL", icon: BarChart3, label: "SAL", perm: "perm_view_sal" },
  { href: "AttivitaInterne", icon: ClipboardList, label: "Attività Interne", perm: "perm_view_attivita" },
  { href: "Documenti", icon: FileText, label: "Documenti", perm: "all" },
  { href: "Cronoprogramma", icon: Calendar, label: "Cronoprogramma", perm: "all" },
  { href: "Guida", icon: BookOpen, label: "Guida all'Uso", perm: "all" },
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
          "flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          collapsed ? "justify-center px-2" : "px-3",
          isActive 
            ? "text-white shadow-md" 
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        )}
        style={isActive ? {backgroundColor: '#FF902C'} : {}}
        title={collapsed ? item.label : ''}
      >
        <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "text-slate-400")} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    )
  }

  return (
    <div className="min-h-screen flex w-full bg-slate-50">
      <Sidebar className="border-r border-slate-200 bg-white transition-all duration-300" collapsible="icon">
        <SidebarHeader className={cn("border-b border-slate-100 flex items-center transition-all duration-200", open ? "p-5 flex-row justify-between" : "p-2 flex-col justify-center gap-4 py-4")}>
          {open ? (
            <div className="flex items-center gap-3 transition-opacity duration-200">
              <img 
                src="https://rcsitalia.com/wp-content/uploads/elementor/thumbs/cropped-logo_rcs-r0hjla6je715znwrnrt5yfyth9qivcj565yl564idc.png" 
                alt="RCS Italia Logo" 
                className="h-10 w-auto object-contain"
              />
            </div>
          ) : (
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689a73debdc258a4faf5da9e/08b139eaf_Logotypercs.png" 
              alt="RCS Logo" 
              className="h-8 w-8 object-contain"
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(!open)}
            className={cn("hover:bg-slate-100 transition-colors", open ? "ml-auto" : "h-6 w-6")}
            style={{ color: '#FF902C' }}
          >
            {open ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </SidebarHeader>
            
        <SidebarContent className="p-3 flex-1 overflow-y-auto">
          <div className="space-y-1 mb-6">
            {open && (
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Generale</p>
              </div>
            )}
            {visiblePrimaryNav.map(item => (
              <NavItem key={item.href} item={item} pathname={location.pathname} collapsed={!open} />
            ))}
          </div>
          
          {visibleSettingsNav.length > 0 && (
            <div className="space-y-1 pt-6 border-t border-slate-100">
              {open && (
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Impostazioni</p>
                </div>
              )}
              {visibleSettingsNav.map(item => (
                <NavItem key={item.href} item={item} pathname={location.pathname} collapsed={!open} />
              ))}
            </div>
          )}
        </SidebarContent>

        <SidebarFooter className="border-t border-slate-100 p-4">
          <div className={cn("flex items-center gap-3", !open && "flex-col")}>
            <Avatar className="w-10 h-10 border-2 flex-shrink-0" style={{borderColor: '#FF902C'}}>
              <AvatarFallback className="text-white font-semibold text-sm" style={{backgroundColor: '#FF902C'}}>
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
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (e) {
        console.error("Not logged in", e);
        return null;
      }
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    // Update favicon
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'shortcut icon';
    link.href = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689a73debdc258a4faf5da9e/08b139eaf_Logotypercs.png';
    document.getElementsByTagName('head')[0].appendChild(link);
  }, []);

  const handleLogout = async () => {
    await base44.auth.logout();
    queryClient.invalidateQueries(['currentUser']);
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
            :root {
              --header-height: 0px;
              --rcs-orange: #FF902C;
              --rcs-yellow: #FFC60D;
              --rcs-dark-gray: #17171C;
              --rcs-medium-gray: #2C2E33;
              --rcs-light-gray: #626671;
            }

            body {
              background: #F8FAFC;
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
          <GlobalErrorBoundary>
            {children}
          </GlobalErrorBoundary>
        </LayoutContent>
      </SidebarProvider>
    </DataProvider>
  );
}