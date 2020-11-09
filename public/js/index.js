// Find the location with autocomplete
var inputPlaceSearch = document.querySelector('#inputPlaceSearch');
var autocomplete;
var uName = document.querySelector(".uName").innerHTML;

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
var filterForm = document.getElementById('filterForm');
filterForm.addEventListener('submit', function(event) {
  event.preventDefault();
  getInput();
  console.log("Form has been submitted!");

  // Clear form after store data into localStorage
  var form = document.getElementById('filterForm');
  form.reset(); 

  // Redirect after submit
  var pathname = 'places'
  var url = `/${pathname}/${uName}`
  window.location.href = url;
});

function getInput() {
  var locationVal = document.getElementById('inputPlaceSearch').value;
  var cuisineVal = document.getElementById('cuisine').value;
  var radiusVal = document.getElementById('destination').value;
  var dateVal = document.getElementById('date-start').value;

  // Store input to localStorage
  localStorage.setItem('location', locationVal);
  localStorage.setItem('cuisine', cuisineVal);
  localStorage.setItem('radius', radiusVal);
  localStorage.setItem('date', dateVal);
};

//create resturaunt modal

// $("#createTabBtn").click(()=> {
//   console.log("modal")
//   $("#createResModal").modal('toggle');
// })

$('.createTabBtn').on('click', function(event){
  console.log(event.target)
  console.log('?')
})