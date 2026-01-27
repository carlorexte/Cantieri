import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarRail, SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from '@/components/ui/sidebar';
import { createPageUrl } from '@/utils';
import { Home, BarChart2, Users, FileText, Settings, Briefcase, Calculator, Shield, Bot, Building2, HardHat, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Layout({ children }) {
    const location = useLocation();

    const items = [
        { title: "AI Assistant", url: "AIAssistant", icon: Bot },
        { title: "Riepilogo Cantieri", url: "RiepilogoCantieri", icon: BarChart2 },
        { title: "Tutti i Cantieri", url: "Cantieri", icon: HardHat },
        { title: "Imprese", url: "Imprese", icon: Building2 },
        { title: "Persone Esterne", url: "PersoneEsterne", icon: Users },
        { title: "Documenti", url: "Documenti", icon: FileText },
        { title: "SAL", url: "SAL", icon: Calculator },
        { title: "Costi", url: "Costi", icon: EuroIcon },
        { title: "Cronoprogramma", url: "Cronoprogramma", icon: Calendar },
        { title: "Permessi", url: "GestionePermessi", icon: Shield },
        { title: "Utenti", url: "UserManagement", icon: Settings },
    ];

    // Helper for icon
    function EuroIcon(props) {
        return <Calculator {...props} /> 
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-slate-50">
                <Sidebar>
                    <SidebarHeader className="border-b border-slate-200 bg-white px-6 py-4">
                        <div className="flex items-center gap-2 font-bold text-xl text-indigo-600">
                            <Building2 className="w-6 h-6" />
                            <span>Cantieri.pro</span>
                        </div>
                    </SidebarHeader>
                    <SidebarContent className="bg-white">
                        <SidebarGroup>
                            <SidebarGroupLabel>Menu Principale</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {items.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton 
                                                asChild 
                                                isActive={location.pathname.includes(item.url) || (item.url === 'AIAssistant' && location.pathname === '/')}
                                                tooltip={item.title}
                                            >
                                                <Link to={createPageUrl(item.url)}>
                                                    <item.icon />
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>
                    <SidebarFooter className="border-t border-slate-200 bg-white p-4">
                         <div className="text-xs text-slate-400 text-center">
                            v1.0.0
                         </div>
                    </SidebarFooter>
                    <SidebarRail />
                </Sidebar>
                
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </SidebarProvider>
    );
}