const number = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
const sortieMax = 5;
const id_numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const levels = ['3', '21', '36', '51', '66', '81', '96', '111', '121', '141', '156', '171', '186', '200', '201'];
const fs = require('fs');
const Discord = require('discord.js');
var redis = require('redis');
var redis_client = redis.createClient(process.env.REDISCLOUD_URL, {no_ready_check: true});
function sorties(msg) {
  message = "Voici tes prochaines sortie : \n";
  sorties = getSorties(msg.guild.name.split(" ").join("_") + "/sortie.json");
  nbSorties = 0;

  for (var i = 0; i < sorties.length; i++) {
    sortie = sorties[i];
    if (sortie.participants.includes(msg.author.id)) {
      message += `- **${sortie.description}**\n`;
      message += `\tNiveau requis : ${sortie.niveau}\n`;
      message += `\tDate : ${sortie.jour}/${sortie.mois}/${sortie.annee} - ${sortie.heure}:${sortie.minutes}\n`;
      nbSorties++;
    }
  }

  if (nbSorties == 0) {
    message += "- Aucune sortie prévue\n" +
      "\n" +
      "Commencer à créer des sorties avec /sortie [niveau] [jour-mois-année] [heure:date] [description] !";
  }
  msg.reply(message);
}
async function store_data(guild,bool) {
  fs.mkdir(guild.name.split(" ").join("_"), function(err) {
    if (err) {
      console.log(err)
    }
  });
  var role_id = "";
  var sep = "";
  for (var i = 0; i < levels.length; i++) {
    role_id = role_id + sep + await guild.roles.create({
        data: {
          name: 'Aide ' + levels[i],
          color: 'GREEN',
        }
      })
      .then(role => {
        return role.id;
      })
      .catch(console.error);
    if (i == 0) {
      sep = " ";
    }
  }
  fs.writeFileSync(guild.name.split(" ").join("_") + "/role_id.txt", role_id, 'utf-8');

  if(bool){
  guild.channels.create("Sorties", {
    reason: 'Channel des sorties'
  }).then((channel) => {
    fs.writeFileSync(guild.name.split(" ").join("_") + "/id.txt", channel.id, 'utf-8');
  });}
}

function reaction_remove(message, messageReaction, user) {
  sorties = getSorties(messageReaction.message.guild.name.split(" ").join("_") + "/sortie.json");
  if (indexSortie === false) {
    return false;
  }

  sortie = sorties[indexSortie];

  if (['✅'].includes(messageReaction.emoji.name) && message.author.id !== user.id) {
    if (sortie.participants.includes(user.id)) {
      indexUtilisateur = sortie.participants.indexOf(user.id);
      if (indexUtilisateur != -1) {
        sortie.participants.splice(indexUtilisateur, 1);
        user.createDM().then(dmchannel => {
          dmchannel.send("Vous retirer votre participation à **" + sortie.description + "** !");
        });
        setSorties(messageReaction.message.guild.name.split(" ").join("_") + "/sortie.json", sorties);
      }
    }
  }
}

function reaction_add(message, messageReaction, user) {
  sorties = getSorties(messageReaction.message.guild.name.split(" ").join("_") + "/sortie.json");
  indexSortie = messageSortieExiste(sorties, message.id);
  if (indexSortie === false) {
    return false;
  }

  sortie = sorties[indexSortie];

  if (['✅'].includes(messageReaction.emoji.name) && message.author.id !== user.id) {
    if (!sortie.participants.includes(user.id)) {
      sortie.participants.push(user.id);
      user.createDM().then(dmchannel => {
        dmchannel.send("Votre participation à la sortie **" + sortie.description + "** à été ajoutée !\n" +
          "\n" +
          "Pour rappel, voici les informations de la sortie :\n" +
          "\n" +
          "Niveau requis : " + sortie.niveau + "\n" +
          `${sortie.jour}/${sortie.mois}/${sortie.annee} - ${sortie.heure}:${sortie.minutes}\n` +
          "\n" +
          "Amusez-vous bien 😄");
      });
      setSorties(messageReaction.message.guild.name.split(" ").join("_") + "/sortie.json", sorties);
    }
  }
}

function sortie(msg, args, content, id_sortie, command, client) {
  nouvelleSortie = new Object();
  if (args.length < 4) {
    msg.channel.send("Vous n'avez pas entrer tout les paramètres.");
    return false;
  }

  objetSortieUtilisateur = getSortiesUtilisateur(msg.author.id, msg.guild);
  if (objetSortieUtilisateur.length >= sortieMax) {
    msg.channel.send("Vous avez atteint la limite de création de sortie !");
    return false;
  }

  nouvelleSortie.demandeur = msg.author.id;
  nouvelleSortie.niveau = args[0];
  date = args[1].replace(/\//gm, "-").split('-');
  heures = args[2].replace(/h/gm, ":").split(':');
  dateSortie = new Date(date[2], date[1] - 1, date[0], heures[0], heures[1]); //Car index du mois entre 0 et 11

  if (isNaN(dateSortie) || dateSortie == null || diff_minutes(dateSortie, new Date()) <= 0) {
    msg.channel.send("La date est invalide !");
    return false;
  }

  nouvelleSortie.jour = dateSortie.getDate();
  nouvelleSortie.mois = dateSortie.getMonth() + 1; //Car index du mois entre 0 et 11
  nouvelleSortie.annee = dateSortie.getFullYear();
  nouvelleSortie.heure = dateSortie.getHours();
  nouvelleSortie.minutes = dateSortie.getMinutes();
  nouvelleSortie.participants = [];
  nouvelleSortie.id = new_id(msg.guild);

  nouvelleSortie.description = "";
  for (var i = 3; i < args.length; i++) {
    nouvelleSortie.description += args[i] + " ";
  }

  //Vérification du niveau
  if (!levels.includes(nouvelleSortie.niveau)) {
    msg.channel.send("Impossible de trouver une tranche de donjon pour ce niveau !");
    return false;
  }

  indexPingLevel = levels.indexOf(nouvelleSortie.niveau);
  pingLevels = fs.readFileSync(msg.guild.name.split(" ").join("_") + "/role_id.txt", 'utf-8').split(" ");
  msg.guild.roles.fetch(pingLevels[indexPingLevel]).then(role => {
    client.users.fetch(nouvelleSortie.demandeur).then(sender => {
      const embed = new Discord.MessageEmbed();
      embed.setColor(0xff0000);
      embed.setTitle('Nouvelle sortie de guilde !');
      embed.setDescription(nouvelleSortie.description + "\nCliquer sur ✅ pour participer !");
      embed.addField("Id Sortie : ", nouvelleSortie.id);
      embed.addField("Niveau requis :", nouvelleSortie.niveau, true);
      embed.addField("Demandeur :", sender.username, true);
      embed.addField("Date :", nouvelleSortie.jour + "/" + nouvelleSortie.mois + "/" + nouvelleSortie.annee + " à " + nouvelleSortie.heure + ":" + nouvelleSortie.minutes, false);
      embed.setAuthor(sender.username, sender.displayAvatarURL());
      var channel = msg.guild.channels.cache.get(fs.readFileSync(msg.guild.name.split(" ").join("_") + "/id.txt", 'utf-8'));
      if (channel == undefined) {
        msg.guild.channels.create("Sorties", {
          reason: 'Channel des sorties'
        }).then((channe) => {
          channel = msg.guild.channels.cache.get(channe.id);
          fs.writeFileSync(msg.guild.name.split(" ").join("_") + "/id.txt", channe.id, 'utf-8');
          channel.send("<@&" + role + '> Voici la sortie prévue :', embed).then(message => {
            nouvelleSortie.message = message.id;
            message.react('✅');

            try {
              if (!fs.existsSync(msg.guild.name.split(" ").join("_") + "/")) {
                fs.mkdir(msg.guild.name.split(" ").join("_"), function(err) {
                  if (err) {
                    console.log(err)
                  }
                });
              }
              sorties = getSorties(msg.guild.name.split(" ").join("_") + "/sortie.json");
            } catch (err) {
              console.error(err)
            }

            sorties.push(nouvelleSortie);
            setSorties(msg.guild.name.split(" ").join("_") + "/sortie.json", sorties);
          });
        });
      } else {


        channel.send("<@&" + role + '> Voici la sortie prévue :', embed).then(message => {
          nouvelleSortie.message = message.id;
          message.react('✅');

          try {
            if (!fs.existsSync(msg.guild.name.split(" ").join("_") + "/")) {
              fs.mkdir(msg.guild.name.split(" ").join("_"), function(err) {
                if (err) {
                  console.log(err)
                }
              });
            }
            sorties = getSorties(msg.guild.name.split(" ").join("_") + "/sortie.json");
          } catch (err) {
            console.error(err)
          }

          sorties.push(nouvelleSortie);
          setSorties(msg.guild.name.split(" ").join("_") + "/sortie.json", sorties);
        });
      }
    });
  });
}
async function remove(msg, client) {
  sorties = getSorties(msg.guild.name.split(" ").join("_") + "/sortie.json");
  sortiesUtilisateur = getSortiesUtilisateur(msg.author.id, msg.guild);

  send = "";

  if (sortiesUtilisateur.length == 0) {
    msg.channel.send("Vous n'avez créé aucune sortie !");
  } else {
    index = 0;
    sortiesUtilisateur.forEach(function(sortie) {
      send = send + number[index] + " " + sortie.description + " - " + sortie.jour + "/" + sortie.mois + "/" + sortie.annee + " " + sortie.heure + ":" + sortie.minutes + "\n";
      index++;
    });
  }

  if (send != "") {
    msg.channel.send(send).then(async function(message) {
      for (i = 0; i < sortiesUtilisateur.length; i++) {
        await message.react(number[i]);
      }

      const filter = (reaction, user) => {
        return user.id === msg.author.id;
      };

      await message.awaitReactions(filter, {
          max: 1,
          time: 30000,
          errors: ['time']
        })
        .then(collected => {
          const reaction = collected.first();
          if (number.includes(reaction.emoji.name)) {
            left = number.indexOf(reaction.emoji.name);
            left_sortie = sortiesUtilisateur[number.indexOf(reaction.emoji.name)];
            msg.reply("Sortie " + left_sortie.description + " annulée!");

            participants = left_sortie.participants;

            for (j = 0; j < participants.length; j++) {
              client.users.fetch(participants[j]).then(participant => {
                participant.createDM().then(dmchannel => {
                  dmchannel.send("La sortie **" + left_sortie.description + "** est **" + "annulée** !");
                });
              });
            }

            sorties.splice(left, 1);

            setSorties(msg.guild.name.split(" ").join("_") + "/sortie.json", sorties);
            message.delete();
          }
        }).catch(collected => {
          message.delete();
          msg.reply('Vous n\'avez rien sélectioner, la demande à été annulée !');
        });
    });
  }
}

function participants(msg, args, client) {
  sorties = getSorties(msg.guild.name.split(" ").join("_") + "/sortie.json");
  trouve = false;
  sorties.forEach((sortie) => {
    if (sortie.id == args[1]) {
      if (sortie.participants.length != 0) {
        participants = sortie.participants;

        var noms = [];
        nbErreur = 0;
        for (var i = 0; i < participants.length; i++) {
          client.users.fetch(participants[i]).then((participant) => {
            noms.push("\t- " + participant.username);
            if (noms.length == participants.length - nbErreur) {
              msg.reply(" Les Participants de la Sortie " + sortie.description + ":" + "\n" + noms.join("\n"));
            }
          }).catch((participant) => {
            nbErreur++;
            msg.reply(" Un des participants n'existe plus ou ne fait plus parti du serveur! ");
          });

        }
      } else {
        msg.reply(" Il n' y a pas de participants actuellement pour la " + sortie.description);
      }
      trouve = true;
    }
  });
  if (!trouve) {
    msg.reply(" Pas de sortie avec cette id ");
  }
}

function getSorties(name) {
  redis_client.get(name, function (error, result) {
      if (error) {
          console.log(error);
          throw error;
      }
      console.log('GET result ->' + result);
  });
}

function getAllSorties(client) {
  sorties = [];
  client.guilds.cache.each((guild) => {
    sorties.concat(getSorties(guild.name.split(" ").join("_") + "/sortie.json"));
  });
  return sorties;
}


function setSorties(path, sorties) {
  redis_client.hmset(name+"sortie",sorties);
}

function getSortiesUtilisateur(userId, guild) {
  sorties = getSorties(guild.name.split(" ").join("_") + "/sortie.json");
  sortiesUtilisateur = [];

  for (var i = 0; i < sorties.length; i++) {
    sortie = sorties[i];
    if (sortie.demandeur == userId) {
      sortiesUtilisateur.push(sortie);
    }
  }

  return sortiesUtilisateur;
}

function messageSortieExiste(sorties, id) {
  for (var i = 0; i < sorties.length; i++) {
    if (sorties[i].message == id) return i;
  }

  return false;
}



function new_id(guild) {
  id = last_id(guild).split("");
  var max_index = id.length - 1;
  if (id[max_index] == "9") {
    id[max_index] = "0";
    index = max_index;
    while (id[index - 1] == "9" && index > 0) {
      id[index - 1] = "0";
      index = index - 1;
    }
    if (index > 0) {
      id[index - 1] = id_numbers[id_numbers.indexOf(id[index - 1]) + 1];
    }
  } else {
    id[max_index] = id_numbers[id_numbers.indexOf(id[max_index]) + 1];
  }
  id = id.join("");
  return id;
}

function last_id(guild) {
  sorties = getSorties(guild.name.split(" ").join("_") + "/sortie.json");
  if (sorties.length == 0) {
    return "00000";
  } else {
    return sorties[sorties.length - 1].id;
  }
}

function diff_minutes(dt1, dt2) {
  var diff = (dt1.getTime() - dt2.getTime()) / 1000;
  diff /= 60;
  return Math.round(diff); //Math.abs() pour valeur absolue
}

exports.sortie = sortie;
exports.sorties = sorties;
exports.remove = remove;
exports.participants = participants;
exports.getSorties = getSorties;
exports.getAllSorties = getAllSorties;
exports.setSorties = setSorties;
exports.last_id = last_id;
exports.reaction_add = reaction_add;
exports.reaction_remove = reaction_remove;
exports.store_data = store_data;
exports.diff_minutes = diff_minutes;
