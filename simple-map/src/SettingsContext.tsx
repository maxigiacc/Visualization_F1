import React, { useContext, useState, type FC, type ReactNode } from "react";

export interface Settings {
    year: number;

    setYear(y: number): void;
}

const defaultSettings: Settings = {
    year: 2021,
    setYear: () => {},
};

const SettingsContext = React.createContext<Settings>(defaultSettings);

export const SettingsProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [year, setYear] = useState(defaultSettings.year);

    return (
        <SettingsContext value={{ year, setYear }}>{children}</SettingsContext>
    );
};

export function useSettings() {
    return useContext(SettingsContext);
}
