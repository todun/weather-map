mapboxgl.accessToken = 'pk.eyJ1IjoieXVxaWFvMDMwNiIsImEiOiJjajE4aDcydDAwNmZwMnhvdnoyamtxMXo5In0.UrSjs2vM5yqvXaA2dMkbrg';

var map = new mapboxgl.Map({
  container: 'map', // container id
  style: 'mapbox://styles/mapbox/dark-v9', //hosted style id
  center: [35, 14], // starting position
  zoom: 6 // starting zoom
});

var api = "http://api.openweathermap.org/data/2.5/box/city?bbox=";
var apikey = "&appid=0e5ac121b292c3bb1c329ab3131a9adb";
var bbox = '12,32,15,37,10';
// var bbox='-81.12,37.54,-69.26,44.39,10';

// for animation the points
var framesPerSecond = 15;
var initialOpacity = 1
var opacity = initialOpacity;
var initialRadius = 8;
var radius = initialRadius;
var maxRadius = 18;

var mapTemplate = {
  "id": "points",
  "type": "circle",
  "source": {
    "type": "geojson",
    "data": {
      "type": "FeatureCollection",
      "features": []
    }
  },
  "paint": {
    "circle-radius": initialRadius,
    "circle-color": {
      "property": "temperature",
      "stops": [
        // Here the temperature range is [10, 20], adjust it to fit more temperature
        // "temperature" is 10   -> circle color will be blue
        [10, 'rgba(66, 165, 245, 0.8)'],
        // "temperature" is 20 -> circle color will be orange
        [20, 'rgba(255, 152, 0, 0.8)']
      ]
    }
  }
};

var animatedMapTemplate = {
  "id": "animatedPoints",
  "type": "circle",
  "source": {
    "type": "geojson",
    "data": {
      "type": "FeatureCollection",
      "features": []
    }
  },
  "paint": {
    "circle-radius": initialRadius,
    'circle-radius-transition': {duration: 0},
    'circle-opacity-transition': {duration: 0},
    "circle-color": {
      "property": "temperature",
      "stops": [
        // Here the temperature range is [10, 20], adjust it to fit more temperature
        // "temperature" is 10   -> circle color will be blue
        [10, 'rgba(66, 165, 245, 0.8)'],
        // "temperature" is 20 -> circle color will be orange
        [20, 'rgba(255, 152, 0, 0.8)']
      ]
    }
  }
};

getData();
setInterval(getData, 2000);

// get data every 2 s
function getData() {
  $.getJSON(api+bbox+apikey, data => {
    console.log('got new data', data)
    formatData(data);
  });
}

// loop through all the cities, format data.features
function formatData(data) {
  var dataTemplate = {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": []
    },
    "properties": {
      "title": "",
      "description": "",
      "temperature": 0,
    }
  };

  var pointsArray = [];
  var i;

  for (i = 0; i < data.list.length; i++) {
    var city = data.list[i];
    var cityData = JSON.parse(JSON.stringify(dataTemplate));// deep copy dataTemplate

    // fill in the lat and lon
    cityData.geometry.coordinates.push(city.coord.Lat);
    cityData.geometry.coordinates.push(city.coord.Lon);

    // fill in properties.title
    cityData.properties.title = city.name;

    // fill in properties.rain
    cityData.properties.rain = city.rain ? true : false;// if city.rain === null, it will be false;

    // fill in properties.temperature
    cityData.properties.temperature = city.main.temp;

    // fill in the properties.description
    cityData.properties.description = '<p>City: ' + city.name
                                      + '</p><p>Weather: ' + city.weather[0].description
                                      + '</p><p>Temperature: ' + city.main.temp + '</p>';
    pointsArray.push(cityData);
  }

  // draw points on map
  if (i === data.list.length) {
    map.on('load', function () {
      mapTemplate.source.data.features = pointsArray;
      map.addLayer(mapTemplate);

      // filtering cities that are not raining
      var rainingPointsArray = pointsArray.filter(cityData => {
        return cityData.properties.rain; // leave all the cityData whose properties.rain is true
      });
      // this animatedMapTemplate layer only has raining cities
      animatedMapTemplate.source.data.features = rainingPointsArray;
      map.addLayer(animatedMapTemplate);// add the animated layer to the map

      // Start the animation.
      animateMarker(0);
    });
  }

  function animateMarker(timestamp) {
    setTimeout(function(){
      requestAnimationFrame(animateMarker);

      radius += (maxRadius - radius) / framesPerSecond;
      opacity -= ( .9 / framesPerSecond );

      if (opacity <= 0.0) {
        radius = initialRadius;
        opacity = initialOpacity;
      }

      map.setPaintProperty('animatedPoints', 'circle-radius', radius);
      map.setPaintProperty('animatedPoints', 'circle-opacity', opacity);

    }, 1000 / framesPerSecond);

  }

  // add click event to points
  // When a click event occurs on a feature in the "points" layer, open a popup at the
  // location of the feature, with description HTML from its properties.
  map.on('click', 'points', function(e) {
    new mapboxgl.Popup()
      .setLngLat(e.features[0].geometry.coordinates)
      .setHTML(e.features[0].properties.description)
      .addTo(map);
  });

  // Change the cursor to a pointer when the mouse is over the "points" layer.
  map.on('mouseenter', 'points', function () {
    map.getCanvas().style.cursor = 'pointer';
  });

  // Change it back to a pointer when it leaves.
  map.on('mouseleave', 'points', function () {
    map.getCanvas().style.cursor = '';
  });
}
