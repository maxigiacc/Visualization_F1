export interface Country {
    countryId: string;
    alpha2code: string;
    alpha3code: string;
    iocCode: string;
    name: string;
    denomyn: string;
    continentId: string;
}

export function fromStringCountry(obj: { [k: string]: string }): Country {
    return {
        countryId: obj.circuitId,
        alpha2code: obj.alpha2code,
        alpha3code: obj.alpha3code,
        iocCode: obj.iocCode,
        name: obj.name,
        denomyn: obj.denomyn,
        continentId: obj.continentId
  } as Country;
}

