import React, { useContext, useState, type FC, type ReactNode } from "react";

export interface Settings {
    year: number;
    setYear(y: number): void;

    selected_race: string[];
    setSelectedRace(items: string[]): void;
}

const defaultSettings: Settings = {
    year: 2021,
    setYear: () => {},

    selected_race: [],
    setSelectedRace: () => {},
};

const SettingsContext = React.createContext<Settings>(defaultSettings);

export const SettingsProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [year, setYear] = useState(defaultSettings.year);
    const [selected_race, setSelectedRace] = useState<string[]>([]);

    return (
        <SettingsContext.Provider
            value={{ year, setYear, selected_race, setSelectedRace }}
        >
            {children}
        </SettingsContext.Provider>
    );
};

export function useSettings() {
    return useContext(SettingsContext);
}
