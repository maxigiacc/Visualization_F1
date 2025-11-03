// Create the map and center it roughly over Europe
const map = L.map('map').setView([20, 0], 2);

// Add OpenStreetMap layer (the map tiles)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Load the local JSON file with one circuit
fetch('data/sample_circuits.json')
  .then(response => response.json())
  .then(data => {
    data.forEach(circuit => {
      L.marker([circuit.lat, circuit.lng])
        .addTo(map)
        .bindPopup(`<b>${circuit.name}</b><br>${circuit.country}`);
    });
  });