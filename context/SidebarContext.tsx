import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Sidebar from '@/components/Sidebar';
import { userDisplayName } from '@/utils/userDisplay';

export type SidebarProfile = {
  displayName: string;
  profileImage: string | null;
};

interface SidebarContextType {
  isOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  profile: SidebarProfile;
  applyUser: (user: any | null) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const emptyProfile: SidebarProfile = { displayName: '', profileImage: null };

export const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  toggleSidebar: () => {},
  closeSidebar: () => {},
  profile: emptyProfile,
  applyUser: async () => undefined,
  refreshProfile: async () => undefined,
});

export const useSidebar = () => useContext(SidebarContext);

function snapshotFromUser(user: any | null): SidebarProfile {
  if (!user) return emptyProfile;
  return {
    displayName: userDisplayName(user, { preferNames: true }),
    profileImage: user.profileImage || null,
  };
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<SidebarProfile>(emptyProfile);

  const applyUser = useCallback(async (user: any | null) => {
    setProfile(snapshotFromUser(user));
    if (user) {
      await AsyncStorage.setItem('user', JSON.stringify(user));
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (!userJson) {
        setProfile(emptyProfile);
        return;
      }
      setProfile(snapshotFromUser(JSON.parse(userJson)));
    } catch {
      // keep current snapshot
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const toggleSidebar = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <SidebarContext.Provider
      value={{ isOpen, toggleSidebar, closeSidebar, profile, applyUser, refreshProfile }}
    >
      {children}
      <Sidebar isOpen={isOpen} onClose={closeSidebar} />
    </SidebarContext.Provider>
  );
}

export default SidebarContext;
