import React, { createContext, useContext, useState, ReactNode } from 'react';

// .planファイルのミッションアイテム型定義
interface SimpleItem {
  type: 'SimpleItem';
  Altitude: number;
  AltitudeMode: string;
  autoContinue: boolean;
  command: number;
  frame: number;
  params: number[];
}

interface Mission {
  version: number;
  firmwareType: number;
  globalPlanAltitudeMode: string;
  vehicleType: number;
  cruiseSpeed: number;
  hoverSpeed: number;
  items: SimpleItem[];
  plannedHomePosition: number[];
}

interface FlightPlan {
  fileType: string;
  groundStation: string;
  version: number;
  mission: Mission;
  geoFence?: any;
  rallyPoints?: any;
}

interface FlightPlanContextType {
  selectedPlan: FlightPlan | null;
  setSelectedPlan: (plan: FlightPlan | null) => void;
  uploadedPlans: { name: string; plan: FlightPlan }[];
  addPlan: (name: string, plan: FlightPlan) => void;
}

const FlightPlanContext = createContext<FlightPlanContextType | undefined>(undefined);

export const FlightPlanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedPlan, setSelectedPlan] = useState<FlightPlan | null>(null);
  const [uploadedPlans, setUploadedPlans] = useState<{ name: string; plan: FlightPlan }[]>([]);

  const addPlan = (name: string, plan: FlightPlan) => {
    setUploadedPlans(prev => [...prev, { name, plan }]);
  };

  return (
    <FlightPlanContext.Provider value={{ selectedPlan, setSelectedPlan, uploadedPlans, addPlan }}>
      {children}
    </FlightPlanContext.Provider>
  );
};

export const useFlightPlan = () => {
  const context = useContext(FlightPlanContext);
  if (!context) {
    throw new Error('useFlightPlan must be used within FlightPlanProvider');
  }
  return context;
};