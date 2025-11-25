export interface Constructor {
    constructorId: number;
    constructorRef: string;
    name: string;
    nationality: string;
    url: string;
}

export function fromStringConstructor(obj: { [k: string]: string }): Constructor {
  return {
    constructorId: parseInt(obj.constructorId || "0", 10),
    constructorRef: obj.constructorRef || "",
    name: obj.name || "",
    nationality: obj.nationality || "",
    url: obj.url || "",
  };
}