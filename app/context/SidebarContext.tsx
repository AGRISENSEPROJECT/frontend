import { createContext, useContext, useState } from 'react';

interface SidebarContextType {
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    closeSidebar: () => void;
}

export const SidebarContext = createContext<SidebarContextType>({
    isSidebarOpen: false,
    toggleSidebar: () => {},
    closeSidebar: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    return (
        <SidebarContext.Provider value={{ isSidebarOpen, toggleSidebar, closeSidebar }}>
            {children}
        </SidebarContext.Provider>
    );
};
