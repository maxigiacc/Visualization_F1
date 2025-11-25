export interface Driver {
    driverId: number;
    driverRef: string;
    number: number;
    code: string;
    forename: string;
    surname: string;
    dob: string;
    nationality: string;
    url: string;
}

export function fromStringDriver(obj: { [k: string]: string }): Driver {
  return {
    driverId: parseInt(obj.driverId || "0", 10),
    driverRef: obj.driverRef || "",
    number: parseInt(obj.number || "0", 10),
    code: obj.code || "",
    forename: obj.forename || "",
    surname: obj.surname || "",
    dob: obj.dob || "",
    nationality: obj.nationality || "",
    url: obj.url || "",
  };
}
