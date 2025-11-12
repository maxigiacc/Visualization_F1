export interface Race {
    raceId: number;
    year: number;
    round: number;
    circuitId: number;
    name: string;
    date: string;
    time: string; 
    url: string;
}


export function fromStringRace(obj: { [k: string]: string }): Race {
    return {
        raceId: parseInt(obj.raceId as string, 10),
        year: parseInt(obj.year as string, 10),
        round: parseInt(obj.round as string, 10),
        circuitId: parseInt(obj.circuitId as string, 10),
        name: obj.name,
        date: obj.date,
        time: obj.time,
        url: obj.url,
    } as Race;
}