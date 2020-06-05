const Discord = require('discord.js');
const fs = require('fs');

const client = new Discord.Client();
const prefix = '!';

//Paramètres
const levels = ['3', '21', '36', '51', '66', '81', '96', '111', '121', '141', '156', '171', '186', '200', '201'];
const pingLevels = ['3', '21', '36', '51', '66', '81', '96', '111', '121', '141', '156', '171', '186', '200', '201'];
const token = "NzE4MDQ2ODQwMzUxNzUyMjIy.XtomRw.qxEcogAww-21mYU3CL2BWBbGxDw";
const channelSortie = "718495899306688552";


client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageReactionAdd', (messageReaction, user) => {
    const message = messageReaction.message;
    fichier = getFichierSorties(message.guild);
    sorties = getSorties(fichier);
    indexSortie = messageSortieExiste(sorties, message.id);
    if (indexSortie === false) {
        console.log("introuvable");
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
            setSorties(fichier, sorties);
        }
    }
});

client.on('messageReactionRemove', (messageReaction, user) => {
    const message = messageReaction.message;
    fichier = getFichierSorties(message.guild);
    sorties = getSorties(fichier);
    if (indexSortie === false) {
        console.log("introuvable");
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
                setSorties(fichier, sorties);
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
    fichier = getFichierSorties(msg.guild);
    sorties = getSorties(fichier);
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
        nouvelleSortie = new Object();
        const args = msg.content.slice(prefix.length).split(' ');
        const command = args.shift().toLowerCase();

        if (args.length < 4) {
            msg.channel.send("Vous n'avez pas entrer tout les paramètres.");
            return false;
        }

        nouvelleSortie.demandeur = msg.author.id;
        nouvelleSortie.niveau = args[0];
        date = args[1].split('-');
        heures = args[2].split(':');
        currentDate = new Date(date[2], date[1], date[0], heures[0], heures[1]);
        if (!currentDate) {
            msg.channel.send("La date est invalide.");
            return false;
        }
        nouvelleSortie.jour = currentDate.getDate();
        nouvelleSortie.mois = currentDate.getMonth();
        nouvelleSortie.annee = currentDate.getFullYear();
        nouvelleSortie.heure = currentDate.getHours();
        nouvelleSortie.minutes = currentDate.getMinutes();
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

        client.users.fetch(nouvelleSortie.demandeur).then(sender => {
            const embed = new Discord.MessageEmbed();
            embed.setColor(0xff0000);
            embed.setTitle('Nouvelle sortie de guilde !');
            embed.setDescription(nouvelleSortie.description + "\nCliquer sur ✅ pour participer !");
            embed.addField("Niveau requis :", nouvelleSortie.niveau, true);
            embed.addField("Demandeur :", sender.username, true);
            embed.setTimestamp(currentDate);
            embed.setAuthor(sender.username, sender.displayAvatarURL());

            msg.guild.channels.cache.get(channelSortie).send('@Annonce Voici la sortie prévue :', embed).then(message => {
                nouvelleSortie.message = message.id;
                message.react('✅');

                fichier = getFichierSorties(message.guild);

                try {
                    if (!fs.existsSync("sorties/")) {
                        fs.mkdir("sorties", function(err) {
                            if (err) {
                                console.log(err)
                            }
                        });
                    }
                    sorties = getSorties(fichier);
                } catch(err) {
                    console.error(err)
                }

                sorties.push(nouvelleSortie);
                setSorties(fichier, sorties);
            });
        });
    }
});

client.login(token);

function getFichierSorties(guild) {
    nomServeur = guild.name;
    nomServeur = nomServeur.replace(' ', '-');
    nomServeur = nomServeur.replace('\'', '-');
    fichier = 'sorties/' + nomServeur + '-sortie.json';

    return fichier;
}

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

function messageSortieExiste(sorties, id) {
    for (var i = 0; i < sorties.length; i++) {
        if (sorties[i].message == id) return i;
    }

    return false;
}