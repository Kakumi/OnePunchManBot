const fs = require('fs');
var reply = "";

let rawDataSorties = fs.readFileSync("src/help.json");
const data = JSON.parse(rawDataSorties);


function help(args) {
  console.log(data);
  if (data[args] != undefined) {
    var reply = data[args];
  } else if (args == "") {
    var reply = "\n>>> Commandes Disponibles : \n";
    for (var key in data) {
      if (key != "Unprediktable") {
        reply = reply + "-\t" + key + "\n";
      }
    }
  } else {
    reply = " Pas de commande se nommant : " + args;
  }
  return reply
}

exports.help = help;
