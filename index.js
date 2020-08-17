const Discord = require('discord.js');
const fs = require('fs');
const cron = require('node-cron');
var request = require('request');
const help = require('./src/help.js');
const stuff = require('./src/stuff.js');
const sortie_mod = require('./src/sortie.js');
const chasse = require('./src/chasse.js');
const Canvas = require('canvas');

const client = new Discord.Client();
const prefix = '!';

//Paramètres

const token = process.env.BOT_TOKEN;


cron.schedule('*/15 * * * * *', () => {
  client.guilds.cache.each(guild => {
    fichierSortie = guild.name.split(" ").join("_") + "/sortie.json";

    sorties = sortie_mod.getSorties(fichierSortie);
    sortiesRestante = [];

    for (var i = 0; i < sorties.length; i++) {
      sortie = sorties[i];

      dateMaintenant = new Date();
      dateSortie = new Date(sortie.annee, sortie.mois - 1, sortie.jour, sortie.heure, sortie.minutes);
      minutesRestantes = sortie_mod.diff_minutes(dateSortie, dateMaintenant);

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

    sortie_mod.setSorties(fichierSortie, sortiesRestante);
  });
});

client.on('guildCreate', async (guild) => {
 await sortie_mod.store_data(guild,true);

});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  sorties = sortie_mod.getAllSorties(client);
  client.guilds.cache.forEach(async (guild) => {
    if (!fs.existsSync(guild.name.split(" ").join("_"))) {
      fs.mkdirSync(guild.name.split(" ").join("_"));

}
if (!fs.existsSync(guild.name.split(" ").join("_")+"/role_id.txt")){
  await sortie_mod.store_data(guild,false);
}
    try{
    channelSortie = guild.channels.cache.get(fs.readFileSync(guild.name.split(" ").join("_") + "/id.txt", 'utf-8'));}
    catch {
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
  sortie_mod.reaction_add(message,messageReaction,user);
});

client.on('messageReactionRemove', (messageReaction, user) => {
  const message = messageReaction.message;
  sortie_mod.reaction_remove(message,messageReaction,user);
});

client.on('message', async msg => {
  if (msg.content.startsWith(prefix + 'sorties')) {
    message = sortie_mod.sorties(msg);

  } else if (msg.content.startsWith(prefix + 'sortie')) {
    id_sortie = sortie_mod.last_id(msg.guild);
    content = msg.content.replace(/\[|\]/gm, "");
    nouvelleSortie = new Object();
    const args = content.slice(prefix.length).split(' ');
    const command = args.shift().toLowerCase();
    sortie_mod.sortie(msg,args,content,id_sortie,command,client);

  } else if (msg.content.startsWith(prefix + 'remove')) {
    sortie_mod.remove(msg,client);

  } else if (msg.content.startsWith(prefix + "participants")) {
    const args = msg.content.slice(prefix.length).split(' ');
    sortie_mod.participants(msg,args,client);

  } else if (msg.content.startsWith(prefix + 'bonus')) {
    const args = msg.content.slice(6);
    const text = args.toLowerCase().split(" ").join("");

    bonus = await stuff.bonus(args, text);
    if (bonus[0]) {
      msg.reply(bonus[1]);
    } else {
      msg.reply(" Pas d'items ayant ce nom : " + args);
    }
  } else if (msg.content.startsWith(prefix + 'help')) {
    const args = msg.content.slice(6);
    msg.reply(help.help(args));

  } else if (msg.content.startsWith(prefix + 'vs')) {
    const argu = msg.content.slice(4).split(" ").join("").split("+");
    const args = argu[0].split("/");
    canvas = await stuff.vs(args, argu);
    if ( typeof canvas == "string" ){
      msg.reply(canvas);
    }
    else{
    const attachment = new Discord.MessageAttachment(canvas.toBuffer(), 'welcome-image.png');
    msg.channel.send(attachment);}

  } else if (msg.content.startsWith(prefix + 'chasse')) {
    const args = msg.content.slice(8).split(" ");
    chasse.calcul(args,msg);
}
    else if (msg.content.startsWith(prefix + 'debug') && msg.member.hasPermission('ADMINISTRATOR')) {
      guild = msg.guild;
      try{
      channel = msg.guild.channels.cache.find(channel => channel.id == fs.readFileSync(guild.name.split(" ").join("_")+"/id.txt"));
      channel.delete();}
      catch{
        console.log(" already delete");
      }
      roles = fs.readFileSync(guild.name.split(" ").join("_")+"/role_id.txt").toString().split(" ");
      for ( var i=0; i<roles.length; i++ ){
        try{
        r = msg.guild.roles.cache.find( role => role.id == roles[i]);
        r.delete();}
        catch{
          console.log(" already delete");
        }
      }
      fs.unlinkSync(guild.name.split(" ").join("_")+"/id.txt");
      fs.unlinkSync(guild.name.split(" ").join("_")+"/role_id.txt");
      fs.unlinkSync(guild.name.split(" ").join("_")+"/sortie.json");
      sortie_mod.store_data(msg.guild,true);
    }
});

client.login(token);
