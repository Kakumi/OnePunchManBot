const Discord = require('discord.js');
const fs = require('fs');
const cron = require('node-cron');

const client = new Discord.Client();
const prefix = '!';

//Paramètres
const levels = ['3', '21', '36', '51', '66', '81', '96', '111', '121', '141', '156', '171', '186', '200', '201'];
const pingLevels = ['718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206'];
const token = "NzE4MDQ2ODQwMzUxNzUyMjIy.XtomRw.qxEcogAww-21mYU3CL2BWBbGxDw";
const channelSortieId = "718495899306688552";
const guildFolder = "OPM";
const fichierSortie = guildFolder + '/sortie.json';
const number = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
const sortieMax = 5;

cron.schedule('*/10 * * * * *', () => {
    sorties = getSorties(fichierSortie);
    onloop=true;
    for (var i = 0; i < sorties.length; i++) {
        sortie = sorties[i];
        dateMaintenant = new Date();
        dateSortie = new Date(sortie.annee, sortie.mois - 1, sortie.jour, sortie.heure, sortie.minutes);
        minutesRestantes = diff_minutes(dateSortie, dateMaintenant);
        if (minutesRestantes < 10) {
            if (minutesRestantes > 0) {
                //Pas de problème, la sortie est notifiée
                for (var j = 0; j < sortie.participants.length; j++) {
                    //Crash faut alouer de la mémoire ??
                    client.users.fetch(sortie.participants[j]).then(participant => {
                        participant.createDM().then(dmchannel => {
                            dmchannel.send("Ta sortie **" + sortie.description + "** est prévue dans **" + minutesRestantes + " minutes** !");
                        });
                    });
                }
            }

            //On doit supprimer la sortie
        }
    }});


client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  opm = client.guilds.cache.get("715536136365277185");
  channelSortie = opm.channels.cache.get(channelSortieId);

  sorties = getSorties(fichierSortie);

    for (var i = 0; i < sorties.length; i++) {
        sortie = sorties[i];
        console.log("Tentative mise en cache du message " + sortie.message);
        channelSortie.messages.fetch(sortie.message);
    }
});

client.on('messageReactionAdd', (messageReaction, user) => {
    const message = messageReaction.message;
    sorties = getSorties(fichierSortie);
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
            setSorties(fichierSortie, sorties);
        }
    }
});

client.on('messageReactionRemove', (messageReaction, user) => {
    const message = messageReaction.message;
    sorties = getSorties(fichierSortie);
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
                setSorties(fichierSortie, sorties);
            }
        }
    }
});

client.on('message', msg => {
  if (msg.content === prefix + 'ping') {
    msg.channel.send('This is an embed', {
        embed: {
          thumbnail: {
               url: 'attachment://file.png'
            }
         },
         files: [{
            attachment: 'file.png',
            name: 'file.png'
         }]
      })
  }
  else if (msg.content === 'stop') {
      client.destroy();
  }
  else if (msg.content.startsWith(prefix + 'sorties')) {
    message = "Voici tes prochaines sortie : \n";
    sorties = getSorties(fichierSortie);
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
  else if (msg.content.startsWith(prefix + 'sortie')) {
        content = msg.content.replace(/\[|\]/gm, "");
        nouvelleSortie = new Object();
        const args = content.slice(prefix.length).split(' ');
        const command = args.shift().toLowerCase();

        if (args.length < 4) {
            msg.channel.send("Vous n'avez pas entrer tout les paramètres.");
            return false;
        }

        objetSortieUtilisateur = getSortiesUtilisateur(msg.author.id);
        if (objetSortieUtilisateur.length >= sortieMax) {
            msg.channel.send("Vous avez atteint la limite de création de sortie !");
            return false;
        }

        nouvelleSortie.demandeur = msg.author.id;
        nouvelleSortie.niveau = args[0];
        date = args[1].replace(/\//gm, "-").split('-');
        heures = args[2].replace(/h/gm, ":").split(':');
        dateSortie = new Date(date[2], date[1] - 1, date[0], heures[0], heures[1]); //Car index du mois entre 0 et 11

        if (diff_minutes(dateSortie, new Date()) <= 0) {
            msg.channel.send("La date est invalide !");
            return false;
        }

        nouvelleSortie.jour = dateSortie.getDate();
        nouvelleSortie.mois = dateSortie.getMonth() + 1; //Car index du mois entre 0 et 11
        nouvelleSortie.annee = dateSortie.getFullYear();
        nouvelleSortie.heure = dateSortie.getHours();
        nouvelleSortie.minutes = dateSortie.getMinutes();
        nouvelleSortie.participants = [];

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
                embed.addField("Niveau requis :", nouvelleSortie.niveau, true);
                embed.addField("Demandeur :", sender.username, true);
                embed.addField("Date :", nouvelleSortie.jour + "/" + nouvelleSortie.mois + "/" + nouvelleSortie.annee + " à " + nouvelleSortie.heure + ":" + nouvelleSortie.minutes, false);
                embed.setAuthor(sender.username, sender.displayAvatarURL());
    
                msg.guild.channels.cache.get(channelSortieId).send("<@&" + role + '> Voici la sortie prévue :', embed).then(message => {
                    nouvelleSortie.message = message.id;
                    message.react('✅');
    
                    try {
                        if (!fs.existsSync(guildFolder + "/")) {
                            fs.mkdir(guildFolder, function(err) {
                                if (err) {
                                    console.log(err)
                                }
                            });
                        }
                        sorties = getSorties(fichierSortie);
                    } catch(err) {
                        console.error(err)
                    }
    
                    sorties.push(nouvelleSortie);
                    setSorties(fichierSortie, sorties);
                });
            });
        });
    }

    else if(msg.content.startsWith(prefix + 'remove')){
        sorties = getSorties(fichierSortie);
        sortiesUtilisateur = getSortiesUtilisateur(msg.author.id);

        send = "";

        if (sortiesUtilisateur.length == 0){
            msg.channel.send("Vous n'avez créé aucune sortie !");
        } else {
            index = 0;
            sortiesUtilisateur.forEach(function(sortie) {
                send = send + number[index] + " " + sortie.description + " - " + sortie.jour + "/" + sortie.mois + "/" + sortie.annee + " " + sortie.heure + ":" + sortie.minutes + "\n";
                index++;
            });
        }

        if(send != "") {
            msg.channel.send(send).then(async function (message){
                for(i=0; i<index; i++) {
                    message.react(number[i]);
                }

                const filter = (reaction, user) => {
                    return  user.id === msg.author.id;
                };

                await message.awaitReactions(filter, { max: 1, time: 30000, errors: ['time'] })
                .then(collected => {
                    const reaction = collected.first();
                    if (number.includes(reaction.emoji.name)) {
                        left_sortie = sortiesUtilisateur[number.indexOf(reaction.emoji.name)];
                        msg.reply("Sortie " + left_sortie.description + " annulée!");

                        participants = left_sortie.participants;

                        for(j = 0; j < participants.length; j++) {
                            client.users.fetch(participants[j]).then(participant => {
                                participant.createDM().then(dmchannel => {
                                    dmchannel.send("La sortie **" + left_sortie.description + "** est **" + "annulée** !");
                                });
                            });
                        }

                        sorties.splice(sorties.indexOf(left_sortie));
                        setSorties(fichierSortie,sorties);
                        message.delete();
                    }
                }).catch(collected => {
                    message.delete();
                    msg.reply('Vous n\'avez rien sélectioner, la demande à été annulée !');
                });
            });
        }
    }
});

client.login(token);// .then(function () {const guild=client.guilds.get("ID DU SERVEUR");});

function getSorties(path) {
    if (fs.existsSync(path)) {
        let rawDataSorties = fs.readFileSync(path);
        sorties = JSON.parse(rawDataSorties);
    } else {
        sorties = [];
    }

    return sorties;
}

function setSorties(path, sorties) {
    fs.writeFileSync(path, JSON.stringify(sorties), 'utf-8');
}

function getSortiesUtilisateur(userId) {
    sorties = getSorties(fichierSortie);
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

function diff_minutes(dt1, dt2)
{
    var diff = (dt1.getTime() - dt2.getTime()) / 1000;
    diff /= 60;
    return Math.round(diff); //Math.abs() pour valeur absolue
}
