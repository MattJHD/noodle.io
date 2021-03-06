var setupDraw = function() {
  var userList = [];
  var currentLocation = { x: 100, y: 100 };
  var pencilPath;
  var obj; //object to be sent to all the other users
  var activeTool = "pencil";
  var colorStroke = "black";
  var strokeCap = "round";
  var thickness = 2;
  var mouseDown = false;

  paper.setup($("#draw_area")[0]);
  paper.install(window);
  var pencilTool = new Tool();

  var sendCurrentLocation = setInterval(function() {
    var data = { username: name, room: room, location: currentLocation };
    socket.emit("drawing:location", data);
  }, 100);

  var sendDrawingUpdate = setInterval(function() {
    if (activeTool == "pencil" && obj && obj.pts.length > 0) {
      socket.emit("drawing:progress", obj);
      obj.pts = [];
    }
  }, 100);

  var updateUserPoint = function(it, x, y) {
    userList[it].txt.point.x = x;
    userList[it].txt.point.y = y;
    userList[it].txtRect.position.x = x;
    userList[it].txtRect.position.y = y;
  };

  var getUserIndex = function(username) {
    for (var it = 0; it < userList.length; ++it) {
      if (userList[it].uid == username) {
        return it;
      }
    }
    return null;
  };

  var appendNewUser = function(username) {
    user = {
      uid: username,
      txt: new paper.PointText(0, 0),
      txtRect: new paper.Path.Rectangle(0, 0, 2, 2)
    };
    user.txt.fillColor = "black";
    user.txt.content = username;
    user.txtRect.strokeColor = "black";
    userList.push(user);
  };

  var packActionMessage = function(action, data) {
    if (action == "drawing:start") {
      obj = null;
      if (activeTool == "pencil") {
        obj = { username: name, room: room };
        obj.tool = "pencil";
        obj.color = colorStroke;
        obj.x = currentLocation.x;
        obj.y = currentLocation.y;
        obj.thickness = thickness;
        obj.pts = [];
      }
    }
    if (action == "drawing:progress") {
      if (activeTool == "pencil") {
        obj.pts.push({ x: data.x, y: data.y });
      }
    }
    return obj;
  };

  var unpackActionMessage = function(action, message) {
    var index = getUserIndex(message.username);
    if (action == "drawing:start") {
      if (message.tool == "pencil") {
        userList[index].tool = "pencil";
        userList[index].obj = new paper.Path(message.x, message.y);
        userList[index].obj.strokeWidth = message.thickness;
        userList[index].obj.strokeCap = "round";
        userList[index].obj.strokeColor = message.color;
      }
    }
    if (action == "drawing:progress") {
      if (message.tool == "pencil") {
        for (var i = 0; i < message.pts.length; ++i) {
          userList[index].obj.add(
            new paper.Point(message.pts[i].x, message.pts[i].y)
          );
        }
      }
    }
  };

  socket.on("drawing:location", function(data) {
    if (data.username != name) {
      for (var it = 0; it < userList.length; ++it) {
        if (userList[it].txt.content == data.username) {
          updateUserPoint(it, data.location.x, data.location.y);
          view.draw();
          return;
        }
      }
      appendNewUser(data.username);
      updateUserPoint(userList.length - 1, data.location.x, data.location.y);
      view.draw();
    }
  });

  tempSelect = function(event) {
    if (activeTool == "select") {
      console.log("selected");
      this.selected = true;
    }
  };

  socket.on("drawing:start", function(data) {
    console.log("starting to draw", data.username);
    if (data.username != name) {
      index = getUserIndex(data.username);
      if (index !== null) {
        if (data.tool == "pencil") {
          unpackActionMessage("drawing:start", data);
        }
      }
    }
  });

  socket.on("drawing:progress", function(data) {
    console.log("keepdraw", data.username);
    console.log("name: ", name);
    if (data.username != name) {
      index = getUserIndex(data.username);
      if (index !== null) {
        if (data.tool == "pencil") {
          unpackActionMessage("drawing:progress", data);
        }
      }
    }
  });

  socket.on("text:send", function(data) {
    console.log(data);
    // let canvas = document.getElementById("draw_area");
    // let ctx = canvas.getContext("2d");
    // ctx.font = "20px Georgia";
    // ctx.fillText("Hello World!", 10, 50);
    if (data.username != name) {
      index = getUserIndex(data.username);
      if (index !== null) {
        document.getElementById("text-div").innerText = data.text;
      }
    }
  });

  pencilTool.onMouseDown = function(event) {
    mouseDown = true;
    if (activeTool == "pencil") {
      pencilPath = new paper.Path(
        new paper.Point(currentLocation.x, currentLocation.y)
      );
      pencilPath.strokeColor = colorStroke;
      pencilPath.strokeWidth = thickness;
      pencilPath.strokeCap = strokeCap;
      packActionMessage("drawing:start");
      socket.emit("drawing:start", obj);
      console.log("sent: " + obj);
    }
    if (activeTool == "select") {
      selectItemsAt(event.point.x, event.point.y);
    }
  };

  pencilTool.onMouseUp = function(event) {
    mouseDown = false;
  };

  pencilTool.onMouseDrag = function(event) {
    if (activeTool == "pencil") {
      pencilPath.add(event.point);
      packActionMessage("drawing:progress", {
        x: event.point.x,
        y: event.point.y
      });
    }
    currentLocation.x = event.point.x;
    currentLocation.y = event.point.y;
  };

  pencilTool.onMouseMove = function(event) {
    currentLocation.x = event.point.x;
    currentLocation.y = event.point.y;
  };

  // Drawing controls
  $("#pencil").click(function(e) {
    activeTool = "pencil";
    console.log(activeTool);
  });

  $("#color_picker").change(function(e) {
    console.log("color changed!");
    colorStroke = $("#color_picker").val();
    if (activeTool == "pencil") {
      obj.color = colorStroke;
    }
  });

  $("#thick_txt").change(function(e) {
    $("#thick_range").val($("#thick_txt").val());
    thickness = $("#thick_txt").val();
  });

  $("#thick_range").mousemove(function(e) {
    console.log("range changed");
    $("#thick_txt").val($("#thick_range").val());
    thickness = $("#thick_txt").val();
  });
};

function modifyZindex() {
  // Change zindex of the divs
  if (document.getElementById("text-div").classList.contains("inFront")) {
    document.getElementById("text-div").classList.remove("inFront");
  } else {
    document.getElementById("text-div").classList.add("inFront");
  }
}

function hideChat() {
  // Change zindex of the divs
  if (document.getElementById("chat_div").classList.contains("hiddenChat")) {
    document.getElementById("chat_div").classList.remove("hiddenChat");
  } else {
    document.getElementById("chat_div").classList.add("hiddenChat");
  }
}

// It's canvas2png but whatever
function canvas2pdf(e) {
  e.preventDefault();

  var canvas = document.getElementById("draw_area");
  var text = document.getElementById("text-div").innerText;

  $("#text-div").hide();

  var c = canvas.getContext("2d");
  c.font = "15px Courier";
  var x = 10;
  var y = 24;
  var lineheight = 15;
  var lines = text.split("\n");

  for (var i = 0; i < lines.length; i++)
    c.fillText(lines[i], x, y + i * lineheight);

  // Create a dummy CANVAS
  destinationCanvas = document.createElement("canvas");
  destinationCanvas.width = canvas.width;
  destinationCanvas.height = canvas.height;

  destCtx = destinationCanvas.getContext("2d");

  // Create a rectangle with the desired color
  destCtx.fillStyle = "#FFFFFF";
  destCtx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw the original canvas onto the destination canvas
  destCtx.drawImage(canvas, 0, 0);

  // Finally use the destinationCanvas.toDataURL() method to get the desired output;
  var dataURL = canvas.toDataURL();

  $.ajax({
    type: "POST",
    url: "/api/users/exportPdf",
    data: {
      imgBase64: dataURL,
      username: name
    },
    dataType: "json",
    success: function(o) {
      //c.fillText("", 0, 0); // Doesnt work so I hide the text div when they click save instead
      window.location.replace("http://localhost:3000/wall");
    },
    error: function(jqXHR, textStatus, errorThrown) {
      console.log(error);
    }
  });
}

// Side menu bar for backend canvas page
function toggleMenu() {
  if (document.getElementById("menu-wrapper").classList.contains("menu-open")) {
    document.getElementById("menu-wrapper").classList.remove("menu-open");
  } else {
    document.getElementById("menu-wrapper").classList.add("menu-open");
  }

  if (
    document.getElementById("menuButton").classList.contains("close-button")
  ) {
    document.getElementById("menuButton").classList.remove("close-button");
  } else {
    document.getElementById("menuButton").classList.add("close-button");
  }
}

// DOM EVENTS
document.addEventListener("DOMContentLoaded", function() {
  let changeZindex = document.getElementById("zindexChange");
  let hideChatButton = document.getElementById("hideChat");
  hideChatButton.addEventListener("click", hideChat);
  changeZindex.addEventListener("click", modifyZindex);
  document.getElementById("text-div").addEventListener("keyup", function() {
    socket.emit("text:send", {
      text: document.getElementById("text-div").innerText,
      room: room,
      username: name
    });
  });
  let canvas2pdfButton = document.getElementById("canvas2pdfButton");
  canvas2pdfButton.addEventListener("click", canvas2pdf);

  let menuButton = document.getElementById("menuButton");
  menuButton.addEventListener("click", toggleMenu);
});
