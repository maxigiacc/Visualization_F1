export interface Country {
    countryId: string;
    alpha2code: string;
    alpha3code: string;
    iocCode: string;
    name: string;
    denomyn: string;
    continentId: string;
}

const normalizeContinentId = (id?: string) => {
    if (!id) return "";
    const normalized = id.trim().toLowerCase();
    return normalized === "australia" ? "oceania" : normalized;
};

export function fromStringCountry(obj: { [k: string]: string }): Country {
    return {
        countryId: obj.circuitId,
        alpha2code: obj.alpha2code,
        alpha3code: obj.alpha3code,
        iocCode: obj.iocCode,
        name: obj.name,
        denomyn: obj.denomyn,
        continentId: normalizeContinentId(obj.continentId)
    } as Country;
}
