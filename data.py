import pandas as pd

circuits = pd.read_csv("dataset/circuits.csv")
races = pd.read_csv("dataset/races.csv")

def get_circuit_by_id(id):
    return circuits.loc[circuits["circuitId"] == id]

def list_races_by_year(year):
    return races.loc[races["year"] == year]


# only for debugging purposes
if(__name__ == "__main__"):
    print(get_circuit_by_id(0))
