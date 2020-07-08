const fs = require('fs');
const items = JSON.parse(fs.readFileSync("Wakfu_json/items.json"));
const actions = JSON.parse(fs.readFileSync("Wakfu_json/actions.json"));
const item_type = JSON.parse(fs.readFileSync("Wakfu_json/equipmentItemTypes.json"));

const Canvas = require('canvas');

const text_color = ["#0BAF2C", "#FA4732", "#888888"];
const rarity_color = ["#FFFFFF", "#4A20FF", "#FF8000", "#FFEF20", "#8B008B", "#00BBFF", "#FF00FF"];
const rarity = ["**Commun**", "**Rare**", "**Mythique**", "**Légendaire**", "**Relique**", "**Souvenir**", "**Epique**"];
const {
  loadImage
} = require('canvas');

const canvas = Canvas.createCanvas(1920, 1050);
const ctx = canvas.getContext('2d');
ctx.font = '38px sans-serif';

async function vs(args, argu) {
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
              if (Object.keys(lvl).length == 1) {
                lvl[1] = " (" + item.definition.item.level + ")";
              } else {
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
    return "Les arguments fournis ne sont pas corrects! ";
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
    console.log(lvl);
    var img = await loadImage('https://static.ankama.com/wakfu/portal/game/item/115/' + item_image[names[0]] + '.png');
    ctx.drawImage(img, 700, hauteur - 60);
    ctx.fillStyle = rarity_color[argu[1] - 1];
    ctx.textAlign = "start";
    ctx.fillText(name + lvl[names[0]], 100, hauteur);

    ctx.fillStyle = rarity_color[argu[2] - 1];
    level = lvl[1];
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
    return canvas;
  }
}

async function bonus(args, text) {
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
  return [trouve, res];
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


function isEquipment(item) {
  const idontwant = ["COSTUME"];
  const type_id = item['definition']['item']['baseParameters']['itemTypeId'];
  type = item_type.find(type => type.definition.id == type_id);
  if (type.definition.equipmentPositions.length == 0 && type.title.fr != "Montures") {
    return false;
  } else if (type.definition.equipmentPositions[0] == "ACCESSORY" && type.title.fr != "Emblème") {
    return false;
  } else if (idontwant.includes(type.definition.equipmentPositions[0])) {
    return false;
  } else {
    return true;
  }
}

exports.vs = vs;
exports.bonus = bonus;
