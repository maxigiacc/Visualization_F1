import dash
from dash import dcc, html, Input, Output, callback_context
import plotly.express as px
import pandas as pd

app = dash.Dash(__name__)
app.title = "F1 Racing Visualization"

# =============== Initial data ======================
df = pd.DataFrame(columns=["Name", "Lat", "Lon"])

colors = [
    "#E10600",  # Ferrari red
    "#1E90FF",  # Electric blue
    "#FFD700",  # Gold / Mercedes accent
    "#00CC96",  # Green (Aston Martin)
    "#AB63FA",  # Purple (Alpine)
    "#FF6692",  # Pink (BWT)
    "#19D3F3",  # Cyan (Williams)
    "#B6E880",  # Light green (Sauber)
    "#FFA15A",  # Orange (McLaren)
    "#636EFA"   # Indigo (Red Bull base tone)
]


# # =============== Create the main figure ======================
def create_map(df):
    # Create base figure with or without points
    if df.empty:
        # Dummy invisible point to ensure the world map renders
        df_temp = pd.DataFrame({
            "Name": [
                "Autodromo Nazionale Monza 🇮🇹",
                "Silverstone Circuit 🇬🇧",
                "Suzuka International Racing Course 🇯🇵"
            ],
            "Lat": [45.6156, 52.0695, 34.8431],
            "Lon": [9.2811, -1.0169, 136.5416]
        })
    else:
        df_temp = df


    # Creating the world image
    fig = px.scatter_geo(
        df_temp,
        lat="Lat",    # Define which columns contain lat
        lon="Lon",    # Define which columns contain lon
        text="Name",  # Define which columns contain name
        projection="natural earth",     #  Other different type of visualization ("natural earth , orthographic , mercator , equirectangular )
    )

    # Marker point estetichs
    fig.update_traces(
        mode = "markers",  # Show only markers (if you want to show text too, use "markers+text")
        marker=dict(size=10, color = colors, line=dict(width=1, color="white")),    # Marker point
    )

    # World image customization
    fig.update_layout(
        geo=dict(
            scope="world",        # Could be a single continent ["europe", "asia", ...]
            showcountries=True,
            countrycolor="white",
            showland=True,
            landcolor="#00b135",
            showocean=True,
            oceancolor="#00366D",
            showcoastlines=True,
            coastlinecolor="white",
            showrivers=True,
            rivercolor="blue",
            lakecolor="darkblue",
            lonaxis=dict(showgrid=True, gridcolor="gray", dtick=30),
            lataxis=dict(showgrid=True, gridcolor="gray", dtick=30),
            bgcolor="rgba(0,0,0,0)",  # transparent so image shows behind
        ),
        # Background image
        images=[
            dict(
                source="assets/space.jpg",  # path to your image
                xref="paper", yref="paper",  # relative to the whole figure
                x=0, y=1,                    # top-left corner
                sizex=1, sizey=1,            # cover entire canvas
                xanchor="left", yanchor="top",
                sizing="stretch",            # scale to fit
                opacity=0.8,                # adjust transparency
                layer="below"                # behind all elements
            )
        ],
        paper_bgcolor="#0c0c0c",   # background of the entire canvas
        plot_bgcolor="#a12727",
        margin=dict(l=0, r=0, t=0, b=0),
        height=750,
    )
    return fig



# =============== App layout ======================
app.layout = html.Div(
    style={
        "backgroundColor": "#0c0c0c",
        "color": "white",
        "textAlign": "center",
        "fontFamily": "Formula1 Display, sans-serif",
        "padding": "20px",
    },
    children=[
        html.H1("🏁 F1 Racing Visualization",
                style={
                "color": "#BDBDBD",
                "fontSize": "48px",
                "marginBottom": "10px",
                "fontFamily": "'Orbitron', sans-serif",
                "letterSpacing": "2px",
                "textShadow": "2px 2px #d6d6d6"
            }),
        dcc.Graph(
            id="world-map",
            figure=create_map(df),
            style={"height": "85vh"},
            config={
                "scrollZoom": True,          # no zoom with scroll
                "doubleClick": "reset",       # resets view, doesn’t zoom out further
                "displayModeBar": False,  # 👈 hides the entire top-right toolbar
            },
            
        ),
    ],
)

# =============== Callbacks ======================
@app.callback(
    Output("world-map", "figure"),
    Input("world-map", "clickData"),
    prevent_initial_call=True
)
def update_map(clickData):
    global df
    if clickData and "points" in clickData:
        lat = clickData["points"][0]["lat"]
        lon = clickData["points"][0]["lon"]
        df.loc[len(df)] = [f"Circuit {len(df)+1}", lat, lon]
    return create_map(df)


# =============== Run the app ======================
if __name__ == "__main__":
    app.run_server(debug=True)
