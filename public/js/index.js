// Find the location with autocomplete
var inputPlaceSearch = document.querySelector('#inputPlaceSearch');
var autocomplete;

function initAutocomplete() {
  autocomplete = new google.maps.places.Autocomplete(
    inputPlaceSearch, { types: ["geocode"] }
  );

  autocomplete.addListener('place_changed', getLatLng);
};

function getLatLng() {
  var place = autocomplete.getPlace();
  var lat = place.geometry.location.lat();
  var lng = place.geometry.location.lng();
  console.log(lat);
  console.log(lng);

  // Store lat/lng to localStorage
  localStorage.setItem('latitude', lat);
  localStorage.setItem('longitude', lng);
};

// Submit form
var filterForm = document.querySelector('#filterForm');
filterForm.addEventListener('submit', function(event) {
  event.preventDefault();
  getInput();
  console.log("Form has been submitted!");

  // Clear form after store data into localStorage
  var form = document.querySelector('#filterForm');
  form.reset(); 

  // Redirect after submit
  var pathname = 'places'
  var url = `/${pathname}`
  window.location.href = url;
});

function getInput() {
  var locationVal = document.querySelector('#inputPlaceSearch').value;
  var cuisineVal = document.querySelector('#cuisine').value;
  var radiusVal = document.querySelector('#destination').value;
  var dateVal = document.querySelector('#date-start').value;

  // Store input to localStorage
  localStorage.setItem('location', locationVal);
  localStorage.setItem('cuisine', cuisineVal);
  localStorage.setItem('radius', radiusVal);
  localStorage.setItem('date', dateVal);
};

  // Clear form after reload
function ClearForm(){
  document.querySelector('#filterForm').reset();
};