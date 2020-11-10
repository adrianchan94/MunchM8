let cUser
let uCalendar 
let x 
let y
let day = new Date().toISOString().slice(0, 10)

//list.js
var options = {
  valueNames: ['host_name', 'restaurant_name', 'number_guests', 'pref_language', 'description', 'address', 'date_time']
};

var userList = new List('users', options);

var userList2 = new List('user2', options);


window.onload =  async function () {

  scrollTo(0, 0);
  cUser = document.querySelector(".uName").innerHTML
  cRoom = document.querySelector(".roomName").innerHTML
  hostName = document.querySelector(".hostName").innerHTML
  guest1 = document.querySelector(".g1").innerHTML
  guest2 = document.querySelector(".g2").innerHTML
  guest3 = document.querySelector(".g3").innerHTML
  guest4 = document.querySelector(".g4").innerHTML
  guest5 = document.querySelector(".g5").innerHTML
  await getData()
  await getRate()


  $(".my-rating-1").starRating({
    totalStars: 5,
    starSize: 40,
    readOnly: true,
    initialRating: y,

  });

  
//calendar
  var calendarEl = document.getElementById('calendar');

  var calendar = new FullCalendar.Calendar(calendarEl, {
    height: 600,
    themeSystem: 'bootstrap',
    selectable: true,
    buttonIcons: false,
    buttonText:{
      prev : "prev",
      next : "next"
    },
    initialView: 'dayGridMonth',
    initialDate: day,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,listMonth'
    },
    dateClick: function(info) {
      console.log(info)
      document.querySelector(".newETime").value = `${info.dateStr}T19:30`
      $("#exampleModal").modal('toggle')
    },
    eventClick: function(info) {
      console.log("Hey")
      document.querySelector(".updateTitle").value = info.event.title;
      document.querySelector(".updateNumber").value = info.event._def.publicId;
      $("#exampleModal2").modal('toggle')


    },
    events: x 
  });
  
  calendar.render();

};

//edit profile 

$("#editButton").click(()=> {
  console.log("modal")
  $("#exampleModal3").modal('toggle');
})



//calendar

async function  getData() {
  await fetch("http://localhost:3000/uCalendar")
    .then((res) => res.json())
    .then((data) => {
      let EditItem = data.filter((EditItem) => {
        return EditItem.editor == cUser;
      });
      
      x = EditItem
      console.log('when')
      // console.log(EditItem)
      // console.log(x)
     
    });
}

//ratings 

$(".my-rating-4").starRating({
  totalStars: 5,
  starSize: 40,
  useFullStars: true,
  callback: async function(currentRating, $el){
    await fetch(`http://localhost:3000/rate/${hostName}`, {
      method:'POST',
      headers: {'content-Type': 'application/json'},
      body: JSON.stringify({
        rate : currentRating,
        time : 1
      })
    }).then((response)=>{
      console.log(response)
    })
  }
});

$(".my-rating-5").starRating({
  totalStars: 5,
  starSize: 40,
  useFullStars: true,
  callback: async function(currentRating, $el){
    await fetch(`http://localhost:3000/rate/${guest1}`, {
      method:'POST',
      headers: {'content-Type': 'application/json'},
      body: JSON.stringify({
        rate : currentRating,
        time : 1
      })
    }).then((response)=>{
      console.log(response)
    })
  }
});

$(".my-rating-6").starRating({
  totalStars: 5,
  starSize: 40,
  useFullStars: true,
  callback: async function(currentRating, $el){
    await fetch(`http://localhost:3000/rate/${guest2}`, {
      method:'POST',
      headers: {'content-Type': 'application/json'},
      body: JSON.stringify({
        rate : currentRating,
        time : 1
      })
    }).then((response)=>{
      console.log(response)
    })
  }
});

$(".my-rating-7").starRating({
  totalStars: 5,
  starSize: 40,
  useFullStars: true,
  callback: async function(currentRating, $el){
    await fetch(`http://localhost:3000/rate/${guest3}`, {
      method:'POST',
      headers: {'content-Type': 'application/json'},
      body: JSON.stringify({
        rate : currentRating,
        time : 1
      })
    }).then((response)=>{
      console.log(response)
    })
  }
});

$(".my-rating-8").starRating({
  totalStars: 5,
  starSize: 40,
  useFullStars: true,
  callback: async function(currentRating, $el){
    await fetch(`http://localhost:3000/rate/${guest4}`, {
      method:'POST',
      headers: {'content-Type': 'application/json'},
      body: JSON.stringify({
        rate : currentRating,
        time : 1
      })
    }).then((response)=>{
      console.log(response)
    })
  }
});

$(".my-rating-9").starRating({
  totalStars: 5,
  starSize: 40,
  useFullStars: true,
  callback: async function(currentRating, $el){
    await fetch(`http://localhost:3000/rate/${guest5}`, {
      method:'POST',
      headers: {'content-Type': 'application/json'},
      body: JSON.stringify({
        rate : currentRating,
        time : 1
      })
    }).then((response)=>{
      console.log(response)
    })
  }
});

async function getRate(){
  await fetch(`http://localhost:3000/getRate/${cUser}`)
    .then((res) => res.json())
    .then((data) => {
      let EditItem = data.filter((EditItem) => {
        return EditItem.username == cUser;
      })[0];

      console.log(EditItem,EditItem.rating,EditItem.get_rated)
      let result = (EditItem.rating/EditItem.get_rated)
      y = result.toFixed(1)
      console.log(y)

    }).then()

}

// document.addEventListener('DOMContentLoaded', function() {
//   console.log(x)
  
//   var calendarEl = document.getElementById('calendar');

//   var calendar = new FullCalendar.Calendar(calendarEl, {
//     height: 600,
//     themeSystem: 'bootstrap',
//     selectable: true,
//     initialView: 'dayGridMonth',
//     initialDate: '2020-10-07',
//     headerToolbar: {
//       left: 'prev,next today',
//       center: 'title',
//       right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
//     },
//     dateClick: function(info) {
//       $("#exampleModal").modal('toggle')
//     },
    
//     editable: false,
//     dayMaxEvents: true, // when too many events in a day, show the popover
//     events: [
//       {
//         title: 'All Day Event',
//         start: '2020-10-01'
//       }
//     ]
//   });

//   calendar.render();
// });