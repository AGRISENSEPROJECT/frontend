import { createContext, useContext } from 'react';

interface SidebarContextType {
    toggleSidebar: () => void;
}

export const SidebarContext = createContext<SidebarContextType>({
    toggleSidebar: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export default SidebarContext;
