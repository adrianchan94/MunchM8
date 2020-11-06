// Retrieve data from localStorage
const userStorage = window.localStorage;
const latStorage = parseFloat(userStorage["latitude"]);
const lngStorage = parseFloat(userStorage["longitude"]);
const radiusStorage = parseInt(userStorage["radius"]);
const cuisineStorage = userStorage["cuisine"];


// Initialize variables
let pos;
let map;
let bounds;
let infoWindow;
let currentInfoWindow;
let service;
let infoPane;

let array = [];

document.querySelector(".randomButton").addEventListener('click', function () {
  $("#createResModal").modal('toggle');
})


// Open Maps
function initMap() {
  bounds = new google.maps.LatLngBounds();
  infoWindow = new google.maps.InfoWindow;
  currentInfoWindow = infoWindow;
  // Add a generic sidebar
  infoPane = document.querySelector('#panel');

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      // Current position when window open
      // pos = {
      //   lat: position.coords.latitude,
      //   lng: position.coords.longitude
      //   };

      // The position from user input
      pos = { 
        lat: latStorage,
        lng: lngStorage
      };

      map = new google.maps.Map(document.getElementById("map"), {
        center: pos,
        zoom: 15
      });

      bounds.extend(pos);
      infoWindow.setPosition(pos);
      infoWindow.setContent(
        '<div style="color:black;"><strong>' + 
        'find your' + 
        '<br/>' + 
        'location' + 
        '</strong></div>');
      infoWindow.open(map);
      map.setCenter(pos);

      // Call Places nearby search on user input location
      getNearbyPlaces(pos);
    
    }, () => {
      // Browser supports geolocation, but user has denied permission
      handleLocationError(true, infoWindow);
    });
  } else {
     // Browser doesn"t support geolocation
     handleLocationError(false, infoWindow); 
  }
};

// Handle a geolocation error
function handleLocationError(browserHasGeolocation, infoWindow) {
  // Set default location to Hong kong
  pos = {
    lat: 22.3193039,
    lng: 114.1693611
  };
  map = new google.maps.Map(document.getElementById("map"), {
    center: pos,
    zoom: 15
  });

  // Display an InfoWindow at the map center
  infoWindow.setPosition(pos);
  infoWindow.setContent(browserHasGeolocation ? 
    "Geolocation permissions denied. Using default location." :
    "Error: Your browser doesn't support geolocation.");
  infoWindow.open(map);
  currentInfoWindow = infoWindow;

    // Call Places nearby search on default location
    getNearbyPlaces(pos);
};

// Perform a places nearby search request
function getNearbyPlaces(position) {
  // Request handle the response
  let request = { 
    location: position,
    radius: radiusStorage,
    keyword: cuisineStorage + 'restaurant',
  };
  service = new google.maps.places.PlacesService(map);
  service.nearbySearch(request, nearbyCallback);
};

// Handle the results (up to 20) of the nearby search
function nearbyCallback(results, status) {
  if (status == google.maps.places.PlacesServiceStatus.OK) {
    createMarkers(results);
  };
};

// Set marker
function createMarkers(places) {
  places.forEach(place => {
    let marker = new google.maps.Marker({
      position: place.geometry.location,
      map: map,
      title: place.name
    });

    // Add click listener to each marker
    google.maps.event.addListener(marker, 'click', () => {
      
      let request = {
        placeId: place.place_id,
        fields: [
          "name",
          "formatted_address",
          "formatted_phone_number",
          "geometry",
          "rating",
          "website",
          "photos",
          "opening_hours"
        ]
      };

      // Only fetch the details of a place when the user clicks on a marker.
      service.getDetails(request, (placeResult, status) => {
        showDetails(placeResult, marker, status)
      });
    });

    // Adjust the map bounds to include the location of this marker
    bounds.extend(place.geometry.location);  
  });

  // show all the markers within the visible area.
  map.fitBounds(bounds);
};

// Builds an InfoWindow to display details above the marker
function showDetails(placeResult, marker, status) {
  if (status == google.maps.places.PlacesServiceStatus.OK) {
    let placeInfowindow = new google.maps.InfoWindow();
  
    let rating = "None";
    let address = "None";
    let primaryPhoto = "None";
    let phone = "None";
    let website = "None";

  
    if (placeResult.rating) rating = placeResult.rating;
    if (placeResult.formatted_address) address = placeResult.formatted_address;
    if (placeResult.photos) primaryPhoto = placeResult.photos[0]
    if (placeResult.formatted_phone_number) phone = placeResult.formatted_phone_number;
    if (placeResult.website) website = placeResult.website;


    array = [];
    
    let obj = {
      name: placeResult.name,
      photo: placeResult.photos[0], 
      rating: placeResult.rating,
      formatted_address: placeResult.formatted_address,
      phone: placeResult.formatted_phone_number,
      website: placeResult.website
    }

    array.push(obj)

    placeInfowindow.setContent(
      '<div id= "123" style="color:black;">'+
      // Add the photo, if there is one
      `<img src=${primaryPhoto.getUrl()} 
      style="width: 100%; height: auto; max-height: 166px; display: block;">` +
      '<strong>' + 
      placeResult.name + 
      '</strong><br>' + 
      // Add Rating
      'Rating: ' + 
      rating + 
      '<br/>' +
      // Add Phone number
      'Phone number: ' +
      phone +
      '<br/>' +
      // Add Address
      'Address: ' + 
      address +
      '<br/>' +
      // Add Website
      'Website: ' +
      `<a href=${website}>${website}</a>` +
      '</div>'
      );

      console.log(array)

      document.querySelector("#restName").value = array[0].name; 
      document.querySelector("#restAddress").value = array[0].formatted_address; 



    document.querySelector(".randomButton").classList.remove('d-none');

    placeInfowindow.open(marker.map, marker);
    
    currentInfoWindow.close();
    currentInfoWindow = placeInfowindow;
  } else {
    console.log('showDetails failed: ' + status);
  }
};

