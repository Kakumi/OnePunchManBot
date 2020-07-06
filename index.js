const Discord = require('discord.js');
const fs = require('fs');
const cron = require('node-cron');
const Canvas = require('canvas');
var request = require('request');

const client = new Discord.Client();
const prefix = '!';

//Paramètres
const levels = ['3', '21', '36', '51', '66', '81', '96', '111', '121', '141', '156', '171', '186', '200', '201'];
const pingLevels = ['718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206'];
const token = "NzE4MDQ2ODQwMzUxNzUyMjIy.XtomRw.qxEcogAww-21mYU3CL2BWBbGxDw";
const number = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
const sortieMax = 5;
const id_numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
var id_sortie = "00000";
const rarity = ["**Commun**", "**Rare**", "**Mythique**", "**Légendaire**", "**Relique**", "**Souvenir**", "**Epique**"];
const couleurs = {
  "R": 0.308,
  "V": 0.308,
  "B": 0.308,
  "J": 0.076
};
const canvas = Canvas.createCanvas(1920, 1050);
const ctx = canvas.getContext('2d');
const text_color = ["#0BAF2C", "#FA4732", "#888888"];
const rarity_color = ["#FFFFFF", "#4A20FF", "#FF8000", "#FFEF20", "#8B008B", "#00BBFF", "#FF00FF"];
const {
  loadImage
} = require('canvas');

// Select the font size and type from one of the natively available fonts
ctx.font = '38px sans-serif';
// Select the style that will be used to fill the text in

//données WAKFU json
const items = JSON.parse(fs.readFileSync("Wakfu_json/items.json"));
const actions = JSON.parse(fs.readFileSync("Wakfu_json/actions.json"));
const item_type = JSON.parse(fs.readFileSync("Wakfu_json/equipmentItemTypes.json"));

cron.schedule('*/15 * * * * *', () => {
  client.guilds.cache.each(guild => {
    fichierSortie = guild.name.split(" ").join("_") + "/sortie.json";

    sorties = getSorties(fichierSortie);
    sortiesRestante = [];

    for (var i = 0; i < sorties.length; i++) {
      sortie = sorties[i];

      dateMaintenant = new Date();
      dateSortie = new Date(sortie.annee, sortie.mois - 1, sortie.jour, sortie.heure, sortie.minutes);
      minutesRestantes = diff_minutes(dateSortie, dateMaintenant);

      if (minutesRestantes <= 10) {
        if (minutesRestantes > 0) {

          //Pas de problème, la sortie est notifiée
          for (var j = 0; j < sortie.participants.length; j++) {
            client.users.fetch(sortie.participants[j]).then(participant => {
              participant.createDM().then(dmchannel => {
                dmchannel.send("Ta sortie **" + sortie.description + "** est prévue dans **" + minutesRestantes + " minutes** !");
              });
            });
          }

          channelSortie = guild.channels.cache.get(fs.readFileSync(guild.name.split(" ").join("_") + "/id.txt", 'utf-8'));
          channelSortie.messages.fetch(sortie.message).then(message => {
            message.delete();
          }).catch((error) => {
            console.error(error);
          });
        }
      } else {
        //Sortie pas notifiée, on la remet dans le fichier
        sortiesRestante.push(sortie);
      }
    }

    setSorties(fichierSortie, sortiesRestante);
  });
});

client.on('guildCreate', (guild) => {
  fs.mkdir(guild.name.split(" ").join("_"), function(err) {
    if (err) {
      console.log(err)
    }
  });

  guild.channels.create("Sorties", {
    reason: 'Channel des sorties'
  }).then((channel) => {
    fs.writeFileSync(guild.name.split(" ").join("_") + "/id.txt", channel.id, 'utf-8');
  });

});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  sorties = getAllSorties();
  client.guilds.cache.forEach((guild) => {

    channelSortie = guild.channels.cache.get(fs.readFileSync(guild.name.split(" ").join("_") + "/id.txt", 'utf-8'));
    if (channelSortie == undefined) {
      guild.channels.create("Sorties", {
        reason: 'Channel des sorties'
      }).then((channe) => {
        channelSortie = guild.channels.cache.get(channe.id);
        fs.writeFileSync(guild.name.split(" ").join("_") + "/id.txt", channe.id, 'utf-8');
      });
    }
    for (var i = 0; i < sorties.length; i++) {
      sortie = sorties[i];
      console.log("Tentative mise en cache du message " + sortie.message);
      channelSortie.messages.fetch(sortie.message).catch((error) => {
        //console.error(error);
      });
    }
  });
});

client.on('messageReactionAdd', (messageReaction, user) => {
  const message = messageReaction.message;
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
});

client.on('messageReactionRemove', (messageReaction, user) => {
  const message = messageReaction.message;
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
});

client.on('message', async msg => {
  if (msg.content === 'stop') {
    console.log(client.user.id);
    client.destroy();
  } else if (msg.content.startsWith(prefix + 'sorties')) {
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
  } else if (msg.content.startsWith(prefix + 'sortie')) {
    id_sortie = last_id(msg.guild);
    content = msg.content.replace(/\[|\]/gm, "");
    nouvelleSortie = new Object();
    const args = content.slice(prefix.length).split(' ');
    const command = args.shift().toLowerCase();

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
    nouvelleSortie.id = new_id();

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
    msg.guild.roles.fetch(pingLevels[indexPingLevel]).then(role => {
      client.users.fetch(nouvelleSortie.demandeur).then(sender => {
        const embed = new Discord.MessageEmbed();
        embed.setColor(0xff0000);
        embed.setTitle('Nouvelle sortie de guilde !');
        embed.setDescription(nouvelleSortie.description + "\nCliquer sur ✅ pour participer !");
        embed.addField("Id Sortie : ", id_sortie);
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
  } else if (msg.content.startsWith(prefix + 'remove')) {
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
        for (i = 0; i < sortiesUtilisateur.length ; i++) {
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

              sorties.splice(sorties.indexOf(left_sortie));
              setSorties(msg.guild.name.split(" ").join("_") + "/sortie.json", sorties);
              message.delete();
            }
          }).catch(collected => {
            message.delete();
            msg.reply('Vous n\'avez rien sélectioner, la demande à été annulée !');
          });
      });
    }
  } else if (msg.content.startsWith(prefix + "participants")) {
    const args = msg.content.slice(prefix.length).split(' ');
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
  } else if (msg.content.startsWith(prefix + 'bonus')) {
    const args = msg.content.slice(6);
    const text = args.toLowerCase().split(" ").join("");
    marge = Math.floor(text.length / 6 + 1);
    var trouve = false;
    var old_title = undefined;
    var res = "";
    items.forEach(item => {
      try {
        if (distance(item.title.fr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(" ").join(""), text) <= marge) {
          console.log(isEquipment(item));
          if (isEquipment(item)) {
            if (item.title.fr != old_title && old_title != undefined) {
              trouve = false;
            }
            if (!trouve) {
              old_title = item.title.fr;
              res = res + item.title.fr + "\n";
              trouve = true;
            }
            res = res + rarity[item.definition.item.baseParameters.rarity - 1] + " lvl : " + item.definition.item.level + "\n";
            item.definition.equipEffects.forEach(effect => {
              actions.forEach(action => {
                if (action.definition.id == effect.effect.definition.actionId) {
                  res = res + replaceAll(action.description.fr, ["[#1]", "[#2]", "[#3]", "[#4]"], effect.effect.definition.params, item.definition.item.level) + "\n";
                }
              });
            });

            res = res + "\n";
          }
        }
      } catch {

      }
    });
    if (trouve) {
      msg.reply(res);
    } else {
      msg.reply(" Pas d'items ayant ce nom : " + args);
    }
  } else if (msg.content.startsWith(prefix + 'help')) {
    const args = msg.content.slice(6);
    const help = {
      "sortie": "```css\n !sortie \n Arguments : [lvl requis] [date : jj/mm/aaaa] [heure] [nom de la sortie] \n But : [Création d'une sortie] ```",
      "sorties": "```css\n!sorties : [affiche les sorties auxquelles vous participez]```",
      "participants": "```css\n!participants \n **Arguments** : [id de la sortie ( dispo dans le message de la sortie )] \n But : [Affiche les Participants de la Sortie avec l'id correspondant]```",
      "remove": "```css\n!remove \n Arguments : [id de la sortie ( dispo dans le message de la sortie )] \n But : [Détruit la Sortie avec l'id correspondant]```",
      "Unprediktable": "```css\n'Nous craignons ne pouvoir vous en dire d'avantage...'```",
      "bonus": "```css\n!bonus \n Arguments : [nom de l'item ] \n But : [Donne les stats de l'item en question] ```",
      "help": "```css\n!help \n Arguments : [Facultatif : nom de la commande] \n But : [Donne les infos d'utilisation de la commande ou les commandes disponibles si aucun arguments] ```",
      "vs": "```css\n!vs \n Arguments : [nom de l'item ( sans fautes )] / [nom de l'item] +1+2 ( exemple numéro = rareté, tapez !help rarete pour plus d'info) \n But : [Compare deux items] ```",
      "rarete": "```css\nrarete \n1:commun\n2:rare\n3:mythique\n4:legendaire\n5:relique\n6:souvenir\n7:epique ```",
      "chasse": "```css\n!chasse \n Arguments : [ chasses acuelles ] [ chasses voulue ] exemple : R/V R/V/B \n But : [ Donne des stats sur la réussite de la transformation ] ```"
    };
    if (help[args] != undefined) {
      msg.reply(help[args]);
    } else if (args == "") {
      var reply = "\n>>> Commandes Disponibles : \n";
      for (var key in help) {
        if (key != "Unprediktable") {
          reply = reply + "-\t" + key + "\n";
        }
      }
      msg.reply(reply);
    } else {
      msg.reply(" Pas de commande se nommant : " + args);
    }
  } else if (msg.content.startsWith(prefix + 'vs')) {
    const argu = msg.content.slice(4).split(" ").join("").split("+");
    const args = argu[0].split("/");
    var item_image = {};
    var trouve = false;
    var names = [];
    var lvl = {};
    var res = "\n";
    var i = -1;
    var j = 0;
    var compare = {};
    args.forEach(arg => {
      trouve = false;
      i = i + 1;
      j = j + 1;
      compare[i] = {};
      items.forEach(item => {
        try {
          if (distance(item.title.fr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(" ").join(""), arg.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(" ").join("")) <= 1 && item.definition.item.baseParameters.rarity == argu[j]) {
            if (isEquipment(item)) {
              if (!trouve) {
                names.push(item.title.fr);
                trouve = true;
                if (Object.keys(lvl).length == 1){
                  lvl[1] = " (" + item.definition.item.level + ")";
                }
                else{
                lvl[item.title.fr] = " (" + item.definition.item.level + ")";
              }
              }
              item_image[item.title.fr] = item.definition.item.graphicParameters.gfxId;
              item.definition.equipEffects.forEach(effect => {
                const param = effect.effect.definition.params;
                actions.forEach(action => {
                  if (action.definition.id == effect.effect.definition.actionId) {
                    compare[i][action.definition.id] = [param[1] * item.definition.item.level + param[0], replaceAll(action.description.fr, ["[#1]", "[#2]", "[#3]", "[#4]"], param, item.definition.item.level)];
                  }
                });
              });
            }
          }
        } catch {}

      });
    });
    if (names.length != 2) {
      msg.reply("Les arguments fournis ne sont pas corrects! ");
    } else {
      const background = await Canvas.loadImage('back.jpg');
      ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
      var hauteur = 100;
      const it = compare[0];

      const it2 = compare[1];

      const it1_keylist = Object.keys(it);
      const it2_keylist = Object.keys(it2);
      var max_lines = it1_keylist.length + it2_keylist.length;
      it1_keylist.forEach(key => {
        if (it2_keylist.includes(key)) {
          max_lines--;
        }
      });
      if (100 + (60 * max_lines) > canvas.height) {
        canvas.height = 300 + (60 * max_lines);
      }
      var name = names[0];
      var part = "";

      var img = await loadImage('https://static.ankama.com/wakfu/portal/game/item/115/' + item_image[names[0]] + '.png');
      ctx.drawImage(img, 700, hauteur - 60);
      ctx.fillStyle = rarity_color[argu[1] - 1];
      ctx.textAlign = "start";
      ctx.fillText(name + lvl[names[0]], 100, hauteur);

      ctx.fillStyle = rarity_color[argu[2] - 1];
      if ( names[0] == names[1] ){
        level = lvl[1];
      }
      else{
        level = lvl[names[1]];
      }
      ctx.fillText(names[1] + level, 1025, hauteur);

      var img = await loadImage('https://static.ankama.com/wakfu/portal/game/item/115/' + item_image[names[1]] + '.png');
      ctx.drawImage(img, 1625, hauteur - 60);

      hauteur = hauteur + 60;
      keys = [];
      var diff_color = [];
      for (var key in it) {
        keys.push(key);
        if (it2[key] != undefined) {
          diff = [it[key][0] - it2[key][0], it2[key][0] - it[key][0]];
          part = it[key][1] + ' (' + diff[0] + ')';
          if (diff[0] == diff[1]) {
            diff_color = [2, 2];
          } else if (diff[0] > diff[1]) {
            diff_color = [0, 1];
          } else {
            diff_color = [1, 0];
          }
          ctx.fillStyle = text_color[diff_color[0]];
          ctx.fillText(part, 100, hauteur);
          ctx.fillStyle = text_color[diff_color[1]];
          ctx.fillText(it2[key][1] + ' (' + diff[1] + ')', 1025, hauteur);
        } else {
          ctx.fillStyle = text_color[0]
          part = "+" + it[key][1];
          ctx.fillText(part, 100, hauteur);
        }
        hauteur = hauteur + 60;
      }
      ctx.fillStyle = text_color[0];
      for (var key in it2) {
        if (!keys.includes(key)) {
          part = "+" + it2[key][1];
          ctx.fillText(part, 1025, hauteur);
          hauteur = hauteur + 60;
        }
      }
      const attachment = new Discord.MessageAttachment(canvas.toBuffer(), 'welcome-image.png');
      msg.channel.send(attachment);

    }
  } else if (msg.content.startsWith(prefix + 'chasse')) {
    const args = msg.content.slice(8).split(" ");
    const proba_chasses = [0.320, 0.418, 0.194, 0.068];
    var long = [];
    var colors = [];
    const text = "\nNombre de relances moyenne pour les châsses voulues : ";
    if (args.length < 1) {
      msg.reply("\n Veuillez fournir les bons paramètres! ");
    } else {
      args.forEach(arg => {
        color = arg.split("/");
        colors.push(color);
        long.push(color.length);
      });
      var proba = 1;
      for (var i = 0; i < colors[0].length; i++) {
        var add_blanche = 0;
        if (colors[0][i] != "J") {
          add_blanche = couleurs["J"];
        }
        proba = proba * (couleurs[colors[0][i]] + add_blanche);
      }
      proba = 1 / proba;
      if (isNaN(proba) || proba_chasses[long[0] - 1] == undefined) {
        msg.reply("\n Veuillez fournir les bons paramètres! ");
      } else {
        relance_nb = Math.floor(1 / proba_chasses[long[0] - 1]);
        relance_color = Math.floor(proba);
        relance_ordre = ordre(colors[0]);
        total = relance_color + relance_ordre + relance_nb;
        casse = Math.ceil(total / 4);
        msg.reply(text + "\n" + "**Nombre** : " + relance_nb + "\n" + "**Couleurs** : " + relance_color + "\n" + "**Ordre** : " + relance_ordre + "\n**Total** : " + total + "\n**Items à casser** : " + casse);
      }
    }
  }

});

client.login(token);

function getSorties(path) {
  if (fs.existsSync(path)) {
    let rawDataSorties = fs.readFileSync(path);
    sorties = JSON.parse(rawDataSorties);
  } else {
    sorties = [];
  }

  return sorties;
}

function getAllSorties() {
  sorties = [];
  client.guilds.cache.each((guild) => {
    sorties.concat(getSorties(guild.name.split(" ").join("_") + "/sortie.json"));
  });
  return sorties;
}


function setSorties(path, sorties) {
  fs.writeFileSync(path, JSON.stringify(sorties), 'utf-8');
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

function diff_minutes(dt1, dt2) {
  var diff = (dt1.getTime() - dt2.getTime()) / 1000;
  diff /= 60;
  return Math.round(diff); //Math.abs() pour valeur absolue
}

function new_id() {
  id = id_sortie.split("");
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
  id_sortie = id.join("");
  return id_sortie;
}

function last_id(guild) {
  sorties = getSorties(guild.name.split(" ").join("_") + "/sortie.json");
  if (sorties.length == 0) {
    return "00000";
  } else {
    return sorties[sorties.length - 1].id;
  }
}

function replaceAll(string, outs, substitute, lvl) {
  string = remove_things(string);
  pair = [0, 1]
  for (var i = 0; i < substitute.length; i++) {
    if (i == 0) {
      string = string.split(outs[i]).join(substitute[pair[1]] * lvl + substitute[pair[0]]);
    } else {
      string = string.split(outs[i]).join(substitute[i + 1]);
    }
  }
  return string;
}

function remove_things(string) {
  const enlever = ['[~3]?[#1] Maîtrise [#3]:', '[~3]?[#1] Mastery [#3]:',
    '[~3]?[#1] Résistance [#3]:',
    '[~3]?[#1] Resistance [#3]:',
    '[>1]?',
    '[>2]?s:',
    '{[>2]?:s}',
    '[=2]?:s',
    '[=2]?s:',
    '[=2]?:',
    '[~3]?',
    "{",
    "}",
    '[el1]',
    '[el2]',
    '[el3]',
    '[el4]'
  ];

  const element = ["feu", "eau", "terre", "air"];
  enlever.forEach(elt => {
    if (elt.includes('[>2]')) {
      string = string.split(elt).join("s");
    } else if (elt.includes('[el')) {
      string = string.split(elt).join(element[elt[3] - 1])
    } else {
      string = string.split(elt).join("");
    }
  });
  return string;


}



function distance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  var mat = [];
  for (i = 0; i < m + 1; i++) {
    mat[i] = [];
    for (j = 0; j < n + 1; j++) {
      mat[i][j] = 0;
    }
  }
  var cout = 0;

  for (i = 0; i <= m; i++) {
    mat[i][0] = i;
  }
  for (j = 0; j <= n; j++) {
    mat[0][j] = j;
  }
  for (i = 1; i <= m; i++) {
    for (j = 1; j <= n; j++) {
      if (s1[i - 1] == s2[j - 1]) {
        cout = 0;
      } else {
        cout = 1;
      }
      mat[i][j] = Math.min(mat[i - 1][j] + 1,
        mat[i][j - 1] + 1,
        mat[i - 1][j - 1] + cout);
    }
  }
  return mat[m][n];

}

function ordre(expr) {
  var redon = {
    "B": 0,
    "J": 0,
    "V": 0,
    "R": 0
  };
  expr.forEach(letter => {
    redon[letter] = redon[letter] + 1;

  });
  for (key in redon) {
    if (redon[key] == expr.length) {
      return 0;
    }
  }
  return Math.floor(1 / calcul_ordre(expr.length, redon, expr));
}

function combin(k, n) {

  return factorielle(n, (n - k)) / factorielle(k, 0);
}

function factorielle(n, stop) {
  if (n < 0) {
    return -1;
  } else {
    if (n == 0) {
      return 1;
    } else {
      res = 1;
      for (var i = n; i > stop; i--) {
        res = res * i;
      }
      return res;
    }
  }
}


function calcul_ordre(len, redon, expr) {
  combinaisons = 1;
  total_nb = 0;
  total_ef = 0;
  for (var i = len; i > 0; i--) {
    for (key in redon) {
      if (redon[key] > 0) {
        nombre = redon[key];
        redon[key] = redon[key] - 1;
        break;
      }
    }
    total_nb += nombre;
    total_ef += i;
    combinaisons = combinaisons * combin(nombre, i);
  }
  return combinaisons / combin(total_nb, total_ef);
}

function isEquipment(item) {
  const idontwant = ["PET", "COSTUME"];
  const type_id = item['definition']['item']['baseParameters']['itemTypeId'];
  type = item_type.find(type => type.definition.id == type_id);
      if (type.definition.equipmentPositions.length == 0 && type.definition.title.fr != "Montures") {
        return false;
      } else if (type.definition.equipmentPositions[0] == "ACCESSORY" && type.definition.title.fr != "emblème") {
        return false;
      } else if (idontwant.includes(type.definition.equipmentPositions[0])) {
        return false;
      }
      else{
        return true;
      }
}
