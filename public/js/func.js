let cUser
let uCalendar 
let x 
let today = new Date().toISOString().slice(0, 10)



window.onload =  async function () {

  scrollTo(0, 0);
  cUser = document.querySelector(".uName").innerHTML
  await getData()
  
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
    initialDate: today,
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



//list.js
var options = {
  valueNames: [ 'name', 'born' ]
};

var userList = new List('users', options);



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